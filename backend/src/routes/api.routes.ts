import { Router } from 'express';
import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { orchestrate } from '../orchestrator/design.orchestrator.js';
import { FurnitureAgent } from '../agents/furniture.agent.js';
import { createJob, getJob, updateJob } from '../memory/session.memory.js';
import { generationLimiter } from '../middleware/rate-limiter.js';
import { generateStructuredContent } from '../models/gemini.client.js';
import { getModelConfig } from '../models/model.router.js';
import { logger } from '../utils/logger.js';
import { Type } from '@google/genai';
import type { ProjectConfig, GeneratedPlan, ModificationAnalysis, MaterialEstimationConfig, MaterialReport } from '../types/shared.types.js';

const router = Router();

// Event listeners for SSE streaming per job
const sseClients = new Map<string, Set<Response>>();

function addSSEClient(jobId: string, res: Response): void {
  if (!sseClients.has(jobId)) {
    sseClients.set(jobId, new Set());
  }
  sseClients.get(jobId)!.add(res);
}

function removeSSEClient(jobId: string, res: Response): void {
  sseClients.get(jobId)?.delete(res);
  if (sseClients.get(jobId)?.size === 0) {
    sseClients.delete(jobId);
  }
}

function broadcastSSE(jobId: string, event: { type: string; data: any }): void {
  const clients = sseClients.get(jobId);
  if (clients) {
    const msg = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of clients) {
      client.write(msg);
    }
  }
}

// POST /api/generate — Start async generation
router.post('/generate', generationLimiter, async (req: Request, res: Response) => {
  try {
    const config = req.body as ProjectConfig;
    if (!config || !config.width || !config.depth) {
      res.status(400).json({ error: 'Invalid project configuration' });
      return;
    }

    const jobId = uuidv4();
    const userId = req.userId || 'anonymous';
    createJob(jobId, userId);

    // Start orchestration asynchronously
    (async () => {
      try {
        updateJob(jobId, { status: 'running' });

        const result = await orchestrate(config, (event) => {
          // Update job progress
          updateJob(jobId, {
            progress: {
              phase: event.type,
              iteration: event.data.iteration || 0,
              maxIterations: 3,
              agentName: event.data.agent,
            },
          });
          // Broadcast to SSE clients
          broadcastSSE(jobId, event);
        });

        updateJob(jobId, {
          status: 'completed',
          result,
        });

        broadcastSSE(jobId, {
          type: 'completed',
          data: {
            finalPlan: result.finalPlan,
            finalScore: result.finalScore.finalScore,
            converged: result.converged,
            iterationCount: result.iterations.length,
          },
        });
      } catch (err: any) {
        logger.error({ err, jobId }, 'Generation failed');
        updateJob(jobId, {
          status: 'failed',
          error: err.message,
        });
        broadcastSSE(jobId, {
          type: 'error',
          data: { message: err.message },
        });
      }
    })();

    res.json({ jobId });
  } catch (err: any) {
    logger.error({ err }, 'Error starting generation');
    res.status(500).json({ error: err.message });
  }
});

// GET /api/generate/:jobId/stream — SSE stream
router.get('/generate/:jobId/stream', (req: Request, res: Response) => {
  const jobId = req.params.jobId as string;
  const job = getJob(jobId);

  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  // Set up SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Send initial status
  res.write(`data: ${JSON.stringify({ type: 'connected', data: { jobId, status: job.status } })}\n\n`);

  // If already completed, send the result immediately
  if (job.status === 'completed' && job.result) {
    res.write(`data: ${JSON.stringify({
      type: 'completed',
      data: {
        finalPlan: job.result.finalPlan,
        finalScore: job.result.finalScore.finalScore,
        converged: job.result.converged,
        iterationCount: job.result.iterations.length,
      },
    })}\n\n`);
    res.end();
    return;
  }

  if (job.status === 'failed') {
    res.write(`data: ${JSON.stringify({ type: 'error', data: { message: job.error } })}\n\n`);
    res.end();
    return;
  }

  // Register SSE client
  addSSEClient(jobId as string, res);

  req.on('close', () => {
    removeSSEClient(jobId as string, res);
  });
});

// GET /api/generate/:jobId/status — Polling fallback
router.get('/generate/:jobId/status', (req: Request, res: Response) => {
  const jobId = req.params.jobId as string;
  const job = getJob(jobId);

  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  const response: any = {
    jobId: job.jobId,
    status: job.status,
    progress: job.progress,
  };

  if (job.status === 'completed' && job.result) {
    response.result = {
      finalPlan: job.result.finalPlan,
      finalScore: job.result.finalScore.finalScore,
      converged: job.result.converged,
    };
  }

  if (job.status === 'failed') {
    response.error = job.error;
  }

  res.json(response);
});

// POST /api/analyze-image — Image analysis
router.post('/analyze-image', async (req: Request, res: Response) => {
  try {
    const { image } = req.body;
    if (!image) {
      res.status(400).json({ error: 'Missing image data' });
      return;
    }

    const base64Data = image.split(',')[1] || image;

    const prompt = `
Analyze this architectural floor plan image with expert precision.

**ANALYSIS TASKS**:
1. Identify all visible rooms, their approximate dimensions
2. Determine cardinal directions (if orientation markers visible)
3. Locate entrance, circulation paths, and service areas
4. Regulatory compliance assessment (setbacks, room sizes, ventilation)
5. Vastu Shastra compliance (if residential)
6. Furniture placement guidance for each room
7. Bill of Materials estimation based on built-up area

**OUTPUT FORMAT**: Strictly follow the JSON schema provided.`;

    const modelConfig = getModelConfig('spatial');
    const { data: plan } = await generateStructuredContent<GeneratedPlan>({
      prompt,
      modelConfig,
      imageParts: [{
        inlineData: { mimeType: 'image/jpeg', data: base64Data },
      }],
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          designLog: { type: Type.ARRAY, items: { type: Type.STRING } },
          rooms: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['room', 'circulation', 'outdoor', 'setback', 'service'] },
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
                width: { type: Type.NUMBER },
                height: { type: Type.NUMBER },
                features: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      type: { type: Type.STRING, enum: ['door', 'window', 'opening'] },
                      wall: { type: Type.STRING, enum: ['top', 'bottom', 'left', 'right'] },
                      position: { type: Type.NUMBER },
                      width: { type: Type.NUMBER },
                    },
                  },
                },
                guidance: { type: Type.STRING },
              },
              required: ['id', 'name', 'type', 'guidance'],
            },
          },
          totalArea: { type: Type.NUMBER },
          builtUpArea: { type: Type.NUMBER },
          plotCoverageRatio: { type: Type.NUMBER },
          compliance: {
            type: Type.OBJECT,
            properties: {
              regulatory: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    rule: { type: Type.STRING },
                    status: { type: Type.STRING, enum: ['PASS', 'FAIL', 'WARN', 'UNKNOWN'] },
                    message: { type: Type.STRING },
                    recommendation: { type: Type.STRING },
                  },
                },
              },
              cultural: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    rule: { type: Type.STRING },
                    status: { type: Type.STRING, enum: ['PASS', 'FAIL', 'WARN', 'UNKNOWN'] },
                    message: { type: Type.STRING },
                    recommendation: { type: Type.STRING },
                  },
                },
              },
            },
          },
          bom: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                material: { type: Type.STRING },
                quantity: { type: Type.STRING },
                unit: { type: Type.STRING },
                estimatedCost: { type: Type.NUMBER },
              },
            },
          },
          totalCostRange: {
            type: Type.OBJECT,
            properties: {
              min: { type: Type.NUMBER },
              max: { type: Type.NUMBER },
              currency: { type: Type.STRING },
            },
          },
        },
      },
    });

    plan.imageUrl = image;
    res.json(plan);
  } catch (err: any) {
    logger.error({ err }, 'Image analysis failed');
    res.status(500).json({ error: err.message });
  }
});

// POST /api/modify/analyze — Modification feasibility
router.post('/modify/analyze', async (req: Request, res: Response) => {
  try {
    const { plan, request, config, chatHistory } = req.body as {
      plan: GeneratedPlan;
      request: string;
      config: ProjectConfig;
      chatHistory?: Array<{ role: string; content: string }>;
    };

    if (!plan || !request || !config) {
      res.status(400).json({ error: 'Missing plan, request, or config' });
      return;
    }

    const chatContext = chatHistory && chatHistory.length > 0
      ? `\n**CONVERSATION HISTORY**:\n${chatHistory.map(m => `${m.role}: ${m.content}`).join('\n')}\n`
      : '';

    const prompt = `
Analyze the feasibility of the following modification request for an architectural floor plan.
${chatContext}
**CURRENT CONTEXT**:
- Project Type: ${config.projectType}
- Cultural System: ${config.culturalSystem} (Vastu Level: ${config.vastuLevel})
- Current Layout: ${plan.rooms.map(r => `${r.name} (${r.width}x${r.height}m) at (${r.x},${r.y})`).join(', ')}

**USER REQUEST**: "${request}"

**ANALYSIS TASKS**:
1. Check Vastu/Cultural compliance of the requested change.
2. Check Regulatory compliance (setbacks, minimum dimensions).
3. Assess structural/functional feasibility.

Return feasibility, implications, and suggestions.`;

    const modelConfig = getModelConfig('critic');
    const { data } = await generateStructuredContent<ModificationAnalysis>({
      prompt,
      modelConfig,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          originalRequest: { type: Type.STRING },
          analysis: { type: Type.STRING },
          feasibility: { type: Type.STRING, enum: ['FEASIBLE', 'CAUTION', 'NOT_RECOMMENDED'] },
          vastuImplications: { type: Type.STRING },
          regulatoryImplications: { type: Type.STRING },
          suggestion: { type: Type.STRING },
        },
        required: ['analysis', 'feasibility', 'vastuImplications', 'regulatoryImplications', 'suggestion'],
      },
    });

    data.originalRequest = request;
    res.json(data);
  } catch (err: any) {
    logger.error({ err }, 'Modification analysis failed');
    res.status(500).json({ error: err.message });
  }
});

// POST /api/modify/apply — Apply modification
router.post('/modify/apply', async (req: Request, res: Response) => {
  try {
    const { plan, request, config } = req.body as {
      plan: GeneratedPlan;
      request: string;
      config: ProjectConfig;
    };

    if (!plan || !request || !config) {
      res.status(400).json({ error: 'Missing plan, request, or config' });
      return;
    }

    const prompt = `
Act as a Senior Principal Architect. Modify the existing floor plan based on the user's request.

**ORIGINAL SPECIFICATIONS**:
- Plot: ${config.width}m x ${config.depth}m
- Requirements: ${config.requirements.join(', ')}
- Cultural System: ${config.culturalSystem}

**CURRENT PLAN STATE**:
- Rooms: ${JSON.stringify(plan.rooms)}

**MODIFICATION REQUEST**: "${request}"

**INSTRUCTIONS**:
1. Apply the modification if feasible.
2. Adjust adjacent spaces to maintain 100% plot coverage and valid circulation.
3. Ensure all Vastu/Regulatory rules are still met.
4. Update the 'designLog' to reflect this change.

Generate the complete updated floor plan JSON.`;

    const modelConfig = getModelConfig('refinement');
    const { data: modifiedPlan } = await generateStructuredContent<GeneratedPlan>({
      prompt,
      modelConfig,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          designLog: { type: Type.ARRAY, items: { type: Type.STRING } },
          rooms: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['room', 'circulation', 'outdoor', 'setback', 'service'] },
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
                width: { type: Type.NUMBER },
                height: { type: Type.NUMBER },
                features: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      type: { type: Type.STRING, enum: ['door', 'window', 'opening'] },
                      wall: { type: Type.STRING, enum: ['top', 'bottom', 'left', 'right'] },
                      position: { type: Type.NUMBER },
                      width: { type: Type.NUMBER },
                    },
                  },
                },
                guidance: { type: Type.STRING },
              },
              required: ['id', 'name', 'type', 'x', 'y', 'width', 'height', 'features', 'guidance'],
            },
          },
          totalArea: { type: Type.NUMBER },
          builtUpArea: { type: Type.NUMBER },
          plotCoverageRatio: { type: Type.NUMBER },
          compliance: {
            type: Type.OBJECT,
            properties: {
              regulatory: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    rule: { type: Type.STRING },
                    status: { type: Type.STRING, enum: ['PASS', 'FAIL', 'WARN'] },
                    message: { type: Type.STRING },
                    recommendation: { type: Type.STRING },
                  },
                },
              },
              cultural: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    rule: { type: Type.STRING },
                    status: { type: Type.STRING, enum: ['PASS', 'FAIL', 'WARN'] },
                    message: { type: Type.STRING },
                    recommendation: { type: Type.STRING },
                  },
                },
              },
            },
          },
          bom: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                material: { type: Type.STRING },
                quantity: { type: Type.STRING },
                unit: { type: Type.STRING },
                estimatedCost: { type: Type.NUMBER },
              },
            },
          },
          totalCostRange: {
            type: Type.OBJECT,
            properties: {
              min: { type: Type.NUMBER },
              max: { type: Type.NUMBER },
              currency: { type: Type.STRING },
            },
          },
        },
        required: ['designLog', 'rooms', 'totalArea', 'builtUpArea', 'compliance', 'bom', 'totalCostRange'],
      },
    });

    res.json(modifiedPlan);
  } catch (err: any) {
    logger.error({ err }, 'Modification application failed');
    res.status(500).json({ error: err.message });
  }
});

// POST /api/estimate — Material cost estimation
router.post('/estimate', async (req: Request, res: Response) => {
  try {
    const config = req.body as MaterialEstimationConfig;
    if (!config || !config.dimensions) {
      res.status(400).json({ error: 'Invalid estimation config' });
      return;
    }

    const prompt = `
You are a expert Civil Engineer and Construction Cost Analyst with 20+ years in Indian real estate.
Generate a comprehensive material estimation report.

User Inputs:
- Project Type: ${config.projectType}
- Location: ${config.location}
- Dimensions: Total Area = ${config.dimensions.totalArea} sqft, Floors = ${config.dimensions.floors}
- Soil Strength: ${config.soil.strength} (Issues: ${config.soil.issues.join(', ')})
- Budget Level: ${config.budget.level}
- Priority: ${config.budget.priority}
- Preferences: Local Sourcing: ${config.preferences.localSourcing}, Labor Included: ${config.preferences.laborIncluded}
- Notes: ${config.preferences.customNotes}

Provide:
1. Executive Summary with total cost, cost per sqft, and timeline
2. Three quotation tiers (Bare Shell, Interior Inclusive, Fully Furnished)
3. Detailed breakdown for Interior Inclusive tier
4. Cost distribution data for charts
5. Recommendations and risks`;

    const modelConfig = getModelConfig('cost');
    const { data: report } = await generateStructuredContent<MaterialReport>({
      prompt,
      modelConfig,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          executiveSummary: {
            type: Type.OBJECT,
            properties: {
              totalCost: { type: Type.STRING },
              costPerSqft: { type: Type.STRING },
              timelineImpact: { type: Type.STRING },
            },
            required: ['totalCost', 'costPerSqft', 'timelineImpact'],
          },
          grandTotal: { type: Type.NUMBER },
          quotations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                estimatedCost: { type: Type.NUMBER },
                items: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['title', 'description', 'estimatedCost', 'items'],
            },
          },
          breakdown: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      item: { type: Type.STRING },
                      quantity: { type: Type.STRING },
                      unitPrice: { type: Type.STRING },
                      total: { type: Type.STRING },
                    },
                    required: ['item', 'quantity', 'unitPrice', 'total'],
                  },
                },
              },
              required: ['category', 'items'],
            },
          },
          visuals: {
            type: Type.OBJECT,
            properties: {
              costDistribution: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    value: { type: Type.NUMBER },
                  },
                  required: ['name', 'value'],
                },
              },
            },
            required: ['costDistribution'],
          },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
          risks: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['executiveSummary', 'grandTotal', 'quotations', 'breakdown', 'visuals', 'recommendations', 'risks'],
      },
    });

    res.json(report);
  } catch (err: any) {
    logger.error({ err }, 'Material estimation failed');
    res.status(500).json({ error: err.message });
  }
});

// POST /api/furniture — Generate furniture for existing plan
router.post('/furniture', async (req: Request, res: Response) => {
  try {
    const { rooms } = req.body as { rooms: GeneratedPlan['rooms'] };
    if (!rooms || rooms.length === 0) {
      res.status(400).json({ error: 'Missing rooms data' });
      return;
    }

    const agent = new FurnitureAgent();
    const result = await agent.execute({ rooms });
    res.json({ furniture: result.data });
  } catch (err: any) {
    logger.error({ err }, 'Furniture generation failed');
    res.status(500).json({ error: err.message });
  }
});

// POST /api/generate-alternatives — Generate 3 alternative designs
router.post('/generate-alternatives', generationLimiter, async (req: Request, res: Response) => {
  try {
    const config = req.body as ProjectConfig;
    if (!config || !config.width || !config.depth) {
      res.status(400).json({ error: 'Invalid project configuration' });
      return;
    }

    const jobId = uuidv4();
    const userId = req.userId || 'anonymous';
    createJob(jobId, userId);

    // Set up SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    res.write(`data: ${JSON.stringify({ type: 'connected', data: { jobId } })}\n\n`);

    const strategies = [
      { prompt: 'Optimize for natural light and ventilation. Maximize window placement, orient living spaces toward south/east for sunlight, ensure cross-ventilation paths.', tempOffset: 0 },
      { prompt: 'Optimize for privacy gradient and zone separation. Create clear public-to-private transitions, separate guest areas from family zones, add buffer spaces.', tempOffset: 0.15 },
      { prompt: 'Optimize for open-plan living with minimal corridors. Merge living/dining/kitchen into flowing spaces, minimize circulation area, maximize usable room space.', tempOffset: 0.25 },
    ];

    const results: GeneratedPlan[] = [];

    // Run all 3 in parallel
    const promises = strategies.map(async (strategy, idx) => {
      try {
        res.write(`data: ${JSON.stringify({ type: 'alternative_start', data: { index: idx, strategy: strategy.prompt.slice(0, 50) } })}\n\n`);

        const result = await orchestrate(config, (event) => {
          res.write(`data: ${JSON.stringify({ type: 'alternative_progress', data: { index: idx, ...event.data } })}\n\n`);
        }, { strategyPrompt: strategy.prompt, temperatureOffset: strategy.tempOffset });

        results[idx] = result.finalPlan;

        res.write(`data: ${JSON.stringify({ type: 'alternative_complete', data: { index: idx } })}\n\n`);
      } catch (err: any) {
        logger.error({ err, strategyIndex: idx }, 'Alternative generation failed');
        res.write(`data: ${JSON.stringify({ type: 'alternative_error', data: { index: idx, message: err.message } })}\n\n`);
      }
    });

    await Promise.all(promises);

    res.write(`data: ${JSON.stringify({ type: 'alternatives_completed', data: { alternatives: results.filter(Boolean) } })}\n\n`);
    res.end();
  } catch (err: any) {
    logger.error({ err }, 'Alternatives generation failed');
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

// GET /api/health — Health check (no auth)
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

export default router;

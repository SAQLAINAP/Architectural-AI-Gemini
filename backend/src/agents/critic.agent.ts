import { Type } from '@google/genai';
import { BaseAgent } from './base.agent.js';
import type {
  AgentResult,
  AgentRole,
  NormalizedSpec,
  FloorPlanGraph,
  VastuValidationResult,
  RegulatoryValidationResult,
  CritiqueResult,
} from '../types/agent.types.js';
import { getModelConfig } from '../models/model.router.js';
import { generateStructuredContent } from '../models/gemini.client.js';

interface CriticInput {
  plan: FloorPlanGraph;
  spec: NormalizedSpec;
  vastuResult: VastuValidationResult;
  regulatoryResult: RegulatoryValidationResult;
}

export class CriticAgent extends BaseAgent<CriticInput, CritiqueResult> {
  readonly name = 'CriticAgent';
  readonly role: AgentRole = 'critic';

  async execute(input: CriticInput): Promise<AgentResult<CritiqueResult>> {
    const startTime = Date.now();
    const { plan, spec, vastuResult, regulatoryResult } = input;

    const roomSummary = plan.rooms
      .filter(r => r.type === 'room')
      .map(r => `${r.name}: ${r.width}x${r.height}m at (${r.x},${r.y}), direction=${r.direction}`)
      .join('\n');

    const vastuSummary = vastuResult.violations.length > 0
      ? vastuResult.violations.map(v => `- ${v.message}`).join('\n')
      : 'No Vastu violations';

    const regSummary = regulatoryResult.violations.length > 0
      ? regulatoryResult.violations.map(v => `- ${v.message}`).join('\n')
      : 'No regulatory violations';

    const prompt = `
You are a senior architectural critic. Evaluate this floor plan design for quality.

**PLOT**: ${spec.config.width}m x ${spec.config.depth}m
**ROOMS**:
${roomSummary}

**VASTU VALIDATION** (score: ${vastuResult.score.toFixed(2)}):
${vastuSummary}

**REGULATORY VALIDATION** (score: ${regulatoryResult.score.toFixed(2)}):
${regSummary}

**EVALUATE these dimensions (0.0 to 1.0)**:
1. spatialEfficiency: How well does the layout use available space? Room proportions, minimal wasted area.
2. circulationQuality: Are corridors efficient? Is there clear flow from public to private zones?
3. naturalLighting: Do rooms have adequate window placement? Are habitable rooms on exterior walls?
4. privacyGradient: Is there proper separation between public (living/dining) and private (bedrooms) zones?
5. aestheticBalance: Are rooms proportionally balanced? Is the layout visually harmonious?
6. overallConfidence: Your overall confidence in this design's quality.

Also provide:
- critiques: List of specific issues or concerns (max 5)
- strengths: List of design strengths (max 5)`;

    const modelConfig = getModelConfig(this.role);
    const { data, tokenCount } = await generateStructuredContent<CritiqueResult>({
      prompt,
      modelConfig,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          spatialEfficiency: { type: Type.NUMBER },
          circulationQuality: { type: Type.NUMBER },
          naturalLighting: { type: Type.NUMBER },
          privacyGradient: { type: Type.NUMBER },
          aestheticBalance: { type: Type.NUMBER },
          overallConfidence: { type: Type.NUMBER },
          critiques: { type: Type.ARRAY, items: { type: Type.STRING } },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: [
          'spatialEfficiency', 'circulationQuality', 'naturalLighting',
          'privacyGradient', 'aestheticBalance', 'overallConfidence',
          'critiques', 'strengths',
        ],
      },
    });

    return this.wrapResult(data, startTime, tokenCount);
  }
}

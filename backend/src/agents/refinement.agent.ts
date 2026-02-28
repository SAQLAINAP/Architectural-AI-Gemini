import { Type } from '@google/genai';
import { BaseAgent } from './base.agent.js';
import type {
  AgentResult,
  AgentRole,
  NormalizedSpec,
  FloorPlanGraph,
  VastuViolation,
  RegulatoryViolation,
  RefinementResult,
} from '../types/agent.types.js';
import { getModelConfig } from '../models/model.router.js';
import { generateStructuredContent } from '../models/gemini.client.js';
import { enrichRoomsWithDirection } from '../utils/direction.utils.js';

interface RefinementInput {
  plan: FloorPlanGraph;
  spec: NormalizedSpec;
  vastuViolations: VastuViolation[];
  regulatoryViolations: RegulatoryViolation[];
  critiques: string[];
}

export class RefinementAgent extends BaseAgent<RefinementInput, RefinementResult> {
  readonly name = 'RefinementAgent';
  readonly role: AgentRole = 'refinement';

  async execute(input: RefinementInput): Promise<AgentResult<RefinementResult>> {
    const startTime = Date.now();
    const { plan, spec, vastuViolations, regulatoryViolations, critiques } = input;

    // Sort violations by priority
    const allViolations = [
      ...regulatoryViolations.map(v => ({
        type: 'regulatory' as const,
        severity: v.severity,
        message: v.message,
        recommendation: v.recommendation,
      })),
      ...vastuViolations.map(v => ({
        type: 'vastu' as const,
        severity: v.severity,
        message: v.message,
        recommendation: v.recommendation,
      })),
    ].sort((a, b) => {
      const order = { critical: 0, major: 1, minor: 2 };
      return order[a.severity] - order[b.severity];
    });

    const violationText = allViolations
      .map(v => `[${v.severity.toUpperCase()}] ${v.type}: ${v.message} → ${v.recommendation}`)
      .join('\n');

    const critiqueText = critiques.length > 0
      ? critiques.join('\n')
      : 'No specific critiques';

    const currentRooms = JSON.stringify(plan.rooms.map(r => ({
      id: r.id, name: r.name, type: r.type,
      x: r.x, y: r.y, width: r.width, height: r.height,
      features: r.features, guidance: r.guidance,
    })));

    const prompt = `
You are a Senior Architect tasked with REFINING an existing floor plan to fix violations.

**PLOT**: ${spec.config.width}m x ${spec.config.depth}m
**SETBACKS**: Front=${spec.setbackRequirements.front}m, Left=${spec.setbackRequirements.left}m, Right=${spec.setbackRequirements.right}m, Rear=${spec.setbackRequirements.rear}m

**CURRENT ROOMS**: ${currentRooms}

**VIOLATIONS TO FIX** (priority: critical > major > minor):
${violationText}

**CRITIQUES**:
${critiqueText}

**REFINEMENT RULES**:
1. Fix violations by priority (critical first, then major, then minor)
2. PRESERVE room count and approximate total areas
3. Maintain circulation connectivity
4. Keep 100% plot coverage
5. All coordinates must be within plot bounds (0,0) to (${spec.config.width},${spec.config.depth})
6. Rooms must not overlap
7. Document each change you make

Return the refined room layout and list of changes applied.`;

    const modelConfig = getModelConfig(this.role);
    const { data: rawResult, tokenCount } = await generateStructuredContent<any>({
      prompt,
      modelConfig,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
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
                    required: ['type', 'wall', 'position', 'width'],
                  },
                },
                guidance: { type: Type.STRING },
              },
              required: ['id', 'name', 'type', 'x', 'y', 'width', 'height', 'features', 'guidance'],
            },
          },
          changesApplied: { type: Type.ARRAY, items: { type: Type.STRING } },
          violationsAddressed: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['rooms', 'changesApplied', 'violationsAddressed'],
      },
    });

    // Re-enrich rooms with direction
    const enrichedRooms = enrichRoomsWithDirection(rawResult.rooms, spec.plotGeometry);

    const builtUpArea = enrichedRooms
      .filter(r => r.type === 'room' || r.type === 'service')
      .reduce((sum, r) => sum + r.area, 0);
    const circulationArea = enrichedRooms
      .filter(r => r.type === 'circulation')
      .reduce((sum, r) => sum + r.area, 0);
    const setbackArea = enrichedRooms
      .filter(r => r.type === 'setback')
      .reduce((sum, r) => sum + r.area, 0);

    const refinedPlan: FloorPlanGraph = {
      rooms: enrichedRooms,
      adjacencies: plan.adjacencies,
      designLog: [
        ...plan.designLog,
        `--- Refinement Pass ---`,
        ...rawResult.changesApplied,
      ],
      totalArea: spec.plotGeometry.width * spec.plotGeometry.depth,
      builtUpArea,
      circulationArea,
      setbackArea,
      plotCoverageRatio: builtUpArea / (spec.plotGeometry.width * spec.plotGeometry.depth),
    };

    const result: RefinementResult = {
      refinedPlan,
      changesApplied: rawResult.changesApplied || [],
      violationsAddressed: rawResult.violationsAddressed || [],
    };

    return this.wrapResult(result, startTime, tokenCount);
  }
}

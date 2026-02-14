import { Type } from '@google/genai';
import { BaseAgent } from './base.agent.js';
import type { AgentResult, AgentRole, NormalizedSpec, FloorPlanGraph, CostEstimate } from '../types/agent.types.js';
import { getModelConfig } from '../models/model.router.js';
import { generateStructuredContent } from '../models/gemini.client.js';

interface CostInput {
  plan: FloorPlanGraph;
  spec: NormalizedSpec;
}

export class CostAgent extends BaseAgent<CostInput, CostEstimate> {
  readonly name = 'CostAgent';
  readonly role: AgentRole = 'cost';

  async execute(input: CostInput): Promise<AgentResult<CostEstimate>> {
    const startTime = Date.now();
    const { plan, spec } = input;

    const roomSummary = plan.rooms
      .filter(r => r.type === 'room' || r.type === 'circulation')
      .map(r => `${r.name}: ${r.area.toFixed(1)} sq.m`)
      .join(', ');

    const prompt = `
You are a Construction Cost Analyst. Estimate materials and costs for this building.

**PROJECT**:
- Type: ${spec.config.projectType}
- Built-up Area: ${plan.builtUpArea.toFixed(1)} sq.m
- Floors: ${spec.config.floors || 1}
- Rooms: ${roomSummary}

**ESTIMATE**:
1. Bill of Materials (BOM) - realistic quantities for:
   - Bricks/Blocks
   - Cement
   - Steel/Rebar
   - Sand & Aggregate
   - Flooring (tiles/marble)
   - Doors & Windows
   - Plumbing fixtures
   - Electrical work
   - Paint & Finishing

2. Cost range in INR (min and max)

Base calculations on Indian construction standards and current market rates.
Consider ${plan.builtUpArea.toFixed(0)} sq.m built-up area with ${spec.config.floors || 1} floor(s).`;

    const modelConfig = getModelConfig(this.role);
    const { data, tokenCount } = await generateStructuredContent<CostEstimate>({
      prompt,
      modelConfig,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
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
              required: ['material', 'quantity', 'unit', 'estimatedCost'],
            },
          },
          totalCostRange: {
            type: Type.OBJECT,
            properties: {
              min: { type: Type.NUMBER },
              max: { type: Type.NUMBER },
              currency: { type: Type.STRING },
            },
            required: ['min', 'max', 'currency'],
          },
        },
        required: ['bom', 'totalCostRange'],
      },
    });

    return this.wrapResult(data, startTime, tokenCount);
  }
}

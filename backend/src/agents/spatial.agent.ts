import { Type } from '@google/genai';
import { BaseAgent } from './base.agent.js';
import type { AgentResult, AgentRole, NormalizedSpec, FloorPlanGraph } from '../types/agent.types.js';
import { getModelConfig } from '../models/model.router.js';
import { generateStructuredContent } from '../models/gemini.client.js';
import { enrichRoomsWithDirection } from '../utils/direction.utils.js';

export class SpatialAgent extends BaseAgent<NormalizedSpec, FloorPlanGraph> {
  readonly name = 'SpatialAgent';
  readonly role: AgentRole = 'spatial';

  async execute(spec: NormalizedSpec): Promise<AgentResult<FloorPlanGraph>> {
    const startTime = Date.now();
    const { config, plotGeometry, requiredRooms, setbackRequirements, municipalConfig } = spec;

    const roomList = requiredRooms
      .map(r => `- ${r.name} x${r.count} (min ${r.minArea} sq.m)`)
      .join('\n');

    const adjacencyText = spec.adjacencyPreferences.length > 0
      ? spec.adjacencyPreferences.map(a => `${a.room1} ${a.relationship} ${a.room2}`).join(', ')
      : 'Standard residential flow';

    const prompt = `
Act as a Senior Principal Architect. Design a technically precise, code-compliant floor plan.

**PROJECT SPECIFICATIONS**:
- Building Type: ${config.projectType}
- Plot Dimensions: ${config.width}m (Width) x ${config.depth}m (Depth)
- Total Plot Area: ${config.width * config.depth} sq.m
- Floors: ${config.floors || 1} (${config.floorPlanStyle || 'Simplex'})
- Family Size: ${config.familyMembers || 4} members
- Bathrooms: ${config.bathrooms || 2} (${config.bathroomType || 'Western'})
- Kitchen: ${config.kitchenType || 'Closed'} Style
- Parking: ${config.parking || 'None'}
- Building Authority: ${config.municipalCode}
- Site Facing: ${config.facingDirection || 'North'}
- Context: ${config.surroundingContext || 'Residential area'}

**REQUIRED ROOMS**:
${roomList}

**ADJACENCY PREFERENCES**: ${adjacencyText}

**COORDINATE SYSTEM**:
- Origin: (0, 0) at Northwest corner
- Extent: (0, 0) to (${config.width}, ${config.depth})
- Total Canvas: EXACTLY ${config.width * config.depth} sq.m - EVERY SQUARE METER MUST BE ACCOUNTED FOR

**REGULATORY SETBACKS** (${config.municipalCode}):
- Front Setback: ${setbackRequirements.front}m
- Left Side: ${setbackRequirements.left}m
- Right Side: ${setbackRequirements.right}m
- Rear Setback: ${setbackRequirements.rear}m
Label all setback areas as type: "setback"

**BUILDABLE ENVELOPE**:
- Usable Width: ${config.width - setbackRequirements.left - setbackRequirements.right}m
- Usable Depth: ${config.depth - setbackRequirements.front - setbackRequirements.rear}m
- Building starts at x=${setbackRequirements.left}, y=${setbackRequirements.front}

**DESIGN RULES**:
1. **100% COVERAGE**: Room + Circulation + Setback + Outdoor = Total Area. No gaps.
2. **SPATIAL HIERARCHY**: Entrance → Foyer → Living (public) → Dining → Kitchen (family) → Bedrooms (private)
3. **CIRCULATION SPINE**: Design primary corridor connecting all spaces, min 1.2m wide, type: "circulation"
4. **MINIMUM AREAS**: Master Bedroom ≥ 12 sq.m, Other Bedrooms ≥ 9 sq.m, Kitchen ≥ 6 sq.m, Living ≥ 12 sq.m, Bathroom ≥ 3 sq.m, Corridors ≥ 1.2m wide
5. **WALL COORDINATION**: 0.23m exterior walls, 0.115m interior partitions
6. **OPENINGS**: Standard doors 0.9m, main entrance 1.2m. Windows: min 10% of floor area for habitable rooms.
7. **MULTI-LEVEL**: If floors > 1, place staircase (min 2.5m x 4m). Mark as 'circulation'.
8. **PARKING**: ${config.parking !== 'None' ? `Provide parking space (min 2.5m x 5m for car)` : 'No parking required'}

For each room provide detailed "guidance" including furniture placement, functional layout tips, and storage recommendations.

Generate the complete floor plan with designLog documenting key architectural decisions.`;

    const modelConfig = getModelConfig(this.role);
    const { data: rawPlan, tokenCount } = await generateStructuredContent<any>({
      prompt,
      modelConfig,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          designLog: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          rooms: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                type: {
                  type: Type.STRING,
                  enum: ['room', 'circulation', 'outdoor', 'setback', 'service'],
                },
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
          totalArea: { type: Type.NUMBER },
          builtUpArea: { type: Type.NUMBER },
          circulationArea: { type: Type.NUMBER },
          setbackArea: { type: Type.NUMBER },
          plotCoverageRatio: { type: Type.NUMBER },
        },
        required: ['designLog', 'rooms', 'totalArea', 'builtUpArea', 'plotCoverageRatio'],
      },
    });

    // Enrich rooms with direction data
    const enrichedRooms = enrichRoomsWithDirection(rawPlan.rooms, plotGeometry);

    const builtUpArea = enrichedRooms
      .filter(r => r.type === 'room' || r.type === 'service')
      .reduce((sum, r) => sum + r.area, 0);
    const circulationArea = enrichedRooms
      .filter(r => r.type === 'circulation')
      .reduce((sum, r) => sum + r.area, 0);
    const setbackArea = enrichedRooms
      .filter(r => r.type === 'setback')
      .reduce((sum, r) => sum + r.area, 0);

    const floorPlanGraph: FloorPlanGraph = {
      rooms: enrichedRooms,
      adjacencies: [],
      designLog: rawPlan.designLog || [],
      totalArea: plotGeometry.width * plotGeometry.depth,
      builtUpArea,
      circulationArea,
      setbackArea,
      plotCoverageRatio: builtUpArea / (plotGeometry.width * plotGeometry.depth),
    };

    return this.wrapResult(floorPlanGraph, startTime, tokenCount);
  }
}

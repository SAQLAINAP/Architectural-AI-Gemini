import { Type } from '@google/genai';
import { BaseAgent } from './base.agent.js';
import type { AgentResult, AgentRole, FloorPlanGraph } from '../types/agent.types.js';
import type { FurnitureItem, Room } from '../types/shared.types.js';
import { getModelConfig } from '../models/model.router.js';
import { generateStructuredContent } from '../models/gemini.client.js';

interface FurnitureInput {
  rooms: Room[];
}

export class FurnitureAgent extends BaseAgent<FurnitureInput, FurnitureItem[]> {
  readonly name = 'FurnitureAgent';
  readonly role: AgentRole = 'furniture';

  async execute(input: FurnitureInput): Promise<AgentResult<FurnitureItem[]>> {
    const startTime = Date.now();

    const habitableRooms = input.rooms.filter(r =>
      r.type === 'room' || r.type === 'service'
    );

    const roomDescriptions = habitableRooms.map(r => {
      const doors = r.features?.filter(f => f.type === 'door') || [];
      const windows = r.features?.filter(f => f.type === 'window') || [];
      return `- ${r.name} (id: ${r.id}): ${r.width}m x ${r.height}m at (${r.x}, ${r.y}), type: ${r.type}, doors: ${doors.length} (walls: ${doors.map(d => d.wall).join(',')}), windows: ${windows.length} (walls: ${windows.map(w => w.wall).join(',')})`;
    }).join('\n');

    const prompt = `
You are an interior design expert. Place appropriate furniture items within each room.

**ROOMS**:
${roomDescriptions}

**PLACEMENT RULES**:
1. All furniture must fit within room bounds (room.x to room.x+room.width, room.y to room.y+room.height)
2. Maintain at least 0.3m clearance from walls
3. Do NOT block doors or windows — leave 1m clear zone in front of each door
4. Use standard furniture sizes:
   - Bed (double): 1.5m x 2.0m
   - Bed (single): 0.9m x 1.9m
   - Sofa (3-seat): 0.9m x 2.1m
   - Dining table (4-person): 0.9m x 1.5m
   - Desk: 0.6m x 1.2m
   - Wardrobe: 0.6m x 1.8m
   - Toilet: 0.4m x 0.7m
   - Sink: 0.5m x 0.4m
   - Shower: 0.9m x 0.9m
   - Stove: 0.6m x 0.9m
   - Refrigerator: 0.6m x 0.7m
   - Washing machine: 0.6m x 0.6m
5. Furniture x,y are ABSOLUTE coordinates (not relative to the room)
6. Rotation: 0 = default orientation, 90 = rotated 90° clockwise

**ROOM TYPE GUIDELINES**:
- Bedroom: bed, wardrobe, optionally desk/table
- Living room: sofa, coffee table, TV unit
- Kitchen: stove, sink, refrigerator, counter
- Bathroom: toilet, sink, shower/bathtub
- Dining: dining table with chairs
- Study: desk, bookshelf, chair

Place furniture only for habitable rooms (type: room or service). Skip setbacks, circulation, and outdoor areas.`;

    const modelConfig = getModelConfig(this.role);
    const { data: items, tokenCount } = await generateStructuredContent<FurnitureItem[]>({
      prompt,
      modelConfig,
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            roomId: { type: Type.STRING },
            type: { type: Type.STRING },
            name: { type: Type.STRING },
            x: { type: Type.NUMBER },
            y: { type: Type.NUMBER },
            width: { type: Type.NUMBER },
            height: { type: Type.NUMBER },
            rotation: { type: Type.NUMBER },
          },
          required: ['id', 'roomId', 'type', 'name', 'x', 'y', 'width', 'height', 'rotation'],
        },
      },
    });

    return this.wrapResult(items, startTime, tokenCount);
  }
}

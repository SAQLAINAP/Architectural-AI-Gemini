import { BaseAgent } from './base.agent.js';
import type {
  AgentResult,
  AgentRole,
  NormalizedSpec,
  RoomRequirement,
  AdjacencyPreference,
  RoomClassification,
} from '../types/agent.types.js';
import type { ProjectConfig } from '../types/shared.types.js';
import { getModelConfig } from '../models/model.router.js';
import { generateStructuredContent } from '../models/gemini.client.js';
import { getMunicipalConfig } from '../validators/regulatory.validator.js';
import { getVastuStrictness } from '../validators/vastu.validator.js';
import { Type } from '@google/genai';

export class InputAgent extends BaseAgent<ProjectConfig, NormalizedSpec> {
  readonly name = 'InputAgent';
  readonly role: AgentRole = 'input';

  async execute(config: ProjectConfig): Promise<AgentResult<NormalizedSpec>> {
    const startTime = Date.now();

    const plotGeometry = { width: config.width, depth: config.depth };
    const municipalConfig = getMunicipalConfig(config.municipalCode);
    const vastuStrictness = getVastuStrictness(config.vastuLevel);

    // Build required rooms from config requirements
    const requiredRooms = this.buildRoomRequirements(config);

    // Parse adjacency preferences using Flash
    let adjacencyPreferences: AdjacencyPreference[] = [];
    if (config.adjacency && config.adjacency.trim().length > 0) {
      adjacencyPreferences = await this.parseAdjacency(config.adjacency);
    }

    const normalizedSpec: NormalizedSpec = {
      config,
      plotGeometry,
      requiredRooms,
      setbackRequirements: municipalConfig.defaultSetbacks,
      municipalConfig,
      vastuStrictness,
      adjacencyPreferences,
    };

    return this.wrapResult(normalizedSpec, startTime);
  }

  private buildRoomRequirements(config: ProjectConfig): RoomRequirement[] {
    const rooms: RoomRequirement[] = [];
    const minSizes = getMunicipalConfig(config.municipalCode).minRoomSizes;

    // Parse requirements strings to build room list
    const reqLower = config.requirements.map(r => r.toLowerCase());

    // Count bedrooms from requirements
    const bedroomCount = reqLower.filter(r => r.includes('bedroom') || r.includes('bed room')).length || 2;

    // Always add a master bedroom
    rooms.push({
      classification: 'master_bedroom',
      name: 'Master Bedroom',
      minArea: minSizes.master_bedroom || 12,
      count: 1,
    });

    // Additional bedrooms
    if (bedroomCount > 1) {
      rooms.push({
        classification: 'bedroom',
        name: 'Bedroom',
        minArea: minSizes.bedroom || 9,
        count: bedroomCount - 1,
      });
    }

    // Kitchen
    rooms.push({
      classification: 'kitchen',
      name: 'Kitchen',
      minArea: minSizes.kitchen || 6,
      count: 1,
    });

    // Living room
    rooms.push({
      classification: 'living_room',
      name: 'Living Room',
      minArea: minSizes.living_room || 12,
      count: 1,
    });

    // Bathrooms
    const bathroomCount = config.bathrooms || 2;
    rooms.push({
      classification: 'bathroom',
      name: 'Bathroom',
      minArea: minSizes.bathroom || 3,
      count: bathroomCount,
    });

    // Check for specific room types in requirements
    for (const req of reqLower) {
      if (req.includes('dining') && !rooms.some(r => r.classification === 'dining_room')) {
        rooms.push({ classification: 'dining_room', name: 'Dining Room', minArea: minSizes.dining_room || 8, count: 1 });
      }
      if ((req.includes('pooja') || req.includes('prayer') || req.includes('puja')) && !rooms.some(r => r.classification === 'pooja_room')) {
        rooms.push({ classification: 'pooja_room', name: 'Pooja Room', minArea: minSizes.pooja_room || 3, count: 1 });
      }
      if ((req.includes('study') || req.includes('office')) && !rooms.some(r => r.classification === 'study_room')) {
        rooms.push({ classification: 'study_room', name: 'Study Room', minArea: minSizes.study_room || 7, count: 1 });
      }
      if (req.includes('balcony') && !rooms.some(r => r.classification === 'balcony')) {
        rooms.push({ classification: 'balcony', name: 'Balcony', minArea: 3, count: 1 });
      }
      if (req.includes('storage') && !rooms.some(r => r.classification === 'storage')) {
        rooms.push({ classification: 'storage', name: 'Storage', minArea: 2, count: 1 });
      }
    }

    // Entrance/foyer
    rooms.push({
      classification: 'foyer',
      name: 'Entrance Foyer',
      minArea: 2,
      count: 1,
    });

    // Staircase if multi-floor
    if (config.floors && config.floors > 1) {
      rooms.push({
        classification: 'staircase',
        name: 'Staircase',
        minArea: 4,
        count: 1,
      });
    }

    // Parking
    if (config.parking && config.parking !== 'None') {
      rooms.push({
        classification: 'parking',
        name: 'Parking',
        minArea: config.parking === '2+ Cars' ? 25 : config.parking === '1 Car' ? 12.5 : 4,
        count: 1,
      });
    }

    return rooms;
  }

  private async parseAdjacency(adjacencyText: string): Promise<AdjacencyPreference[]> {
    try {
      const modelConfig = getModelConfig(this.role);
      const prompt = `Parse the following spatial adjacency preferences into structured data.
Input: "${adjacencyText}"

Return a JSON array of adjacency preferences where each item has:
- room1: name of the first room
- room2: name of the second room
- relationship: "adjacent" (must share a wall), "nearby" (in same zone), or "separated" (should be apart)

Only return valid, reasonable architectural adjacency preferences.`;

      const { data } = await generateStructuredContent<AdjacencyPreference[]>({
        prompt,
        modelConfig,
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              room1: { type: Type.STRING },
              room2: { type: Type.STRING },
              relationship: {
                type: Type.STRING,
                enum: ['adjacent', 'nearby', 'separated'],
              },
            },
            required: ['room1', 'room2', 'relationship'],
          },
        },
      });

      return data;
    } catch {
      return [];
    }
  }
}

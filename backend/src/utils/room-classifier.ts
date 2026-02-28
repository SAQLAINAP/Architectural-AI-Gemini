import type { RoomClassification } from '../types/agent.types.js';

const patterns: Array<{ regex: RegExp; classification: RoomClassification }> = [
  { regex: /master\s*bed/i, classification: 'master_bedroom' },
  { regex: /child|kid/i, classification: 'children_bedroom' },
  { regex: /guest\s*bed/i, classification: 'guest_bedroom' },
  { regex: /bed\s*room|bedroom/i, classification: 'bedroom' },
  { regex: /kitchen|pantry|cooking/i, classification: 'kitchen' },
  { regex: /living|lounge|drawing/i, classification: 'living_room' },
  { regex: /dining/i, classification: 'dining_room' },
  { regex: /bath|shower|wash\s*room/i, classification: 'bathroom' },
  { regex: /toilet|wc|water\s*closet|restroom|lavatory/i, classification: 'toilet' },
  { regex: /pooja|puja|prayer|mandir|temple/i, classification: 'pooja_room' },
  { regex: /study|office|library|work\s*room/i, classification: 'study_room' },
  { regex: /balcony|terrace|verandah|porch|deck/i, classification: 'balcony' },
  { regex: /stair|step/i, classification: 'staircase' },
  { regex: /corridor|hallway|passage|lobby/i, classification: 'corridor' },
  { regex: /entrance|entry|main\s*door|foyer/i, classification: 'foyer' },
  { regex: /store|storage|closet|wardrobe/i, classification: 'storage' },
  { regex: /park|garage|car\s*port/i, classification: 'parking' },
  { regex: /utility|laundry|service/i, classification: 'utility' },
];

/**
 * Pattern-matching on room name strings to classify them.
 */
export function classifyRoom(name: string): RoomClassification {
  for (const { regex, classification } of patterns) {
    if (regex.test(name)) {
      return classification;
    }
  }
  // Default to bedroom for unrecognized rooms
  return 'bedroom';
}

import type {
  RoomWithDirection,
  PlotGeometry,
  VastuViolation,
  VastuValidationResult,
  RoomClassification,
  CardinalDirection,
} from '../types/agent.types.js';
import type { ComplianceItem } from '../types/shared.types.js';

interface VastuRule {
  id: string;
  description: string;
  appliesTo: RoomClassification[];
  severity: 'critical' | 'major' | 'minor';
  penalty: number;
  check: (
    room: RoomWithDirection,
    allRooms: RoomWithDirection[],
    plotGeometry: PlotGeometry
  ) => { pass: boolean; message: string; recommendation: string };
}

const FORBIDDEN_CENTER: RoomClassification[] = ['kitchen', 'bathroom', 'toilet', 'staircase', 'storage'];

const vastuRules: VastuRule[] = [
  {
    id: 'VASTU_001',
    description: 'Brahmasthan must not contain kitchen/toilet/staircase/storage',
    appliesTo: ['kitchen', 'bathroom', 'toilet', 'staircase', 'storage'],
    severity: 'critical',
    penalty: 0.15,
    check: (room) => {
      const pass = room.direction !== 'CENTER';
      return {
        pass,
        message: pass
          ? `${room.name} is not in the Brahmasthan (center)`
          : `${room.name} is placed in the Brahmasthan (center) - this violates core Vastu principles`,
        recommendation: pass ? '' : `Move ${room.name} away from the center of the plot. Keep Brahmasthan open or use as living/dining space.`,
      };
    },
  },
  {
    id: 'VASTU_002',
    description: 'Master Bedroom should be in SW',
    appliesTo: ['master_bedroom'],
    severity: 'major',
    penalty: 0.10,
    check: (room) => {
      const preferred: CardinalDirection[] = ['SW'];
      const pass = preferred.includes(room.direction);
      return {
        pass,
        message: pass
          ? `Master Bedroom correctly placed in ${room.direction} (Southwest)`
          : `Master Bedroom is in ${room.direction}, should be in Southwest`,
        recommendation: pass ? '' : 'Relocate master bedroom to the Southwest quadrant for stability and grounding.',
      };
    },
  },
  {
    id: 'VASTU_003',
    description: 'Kitchen should be in SE (or NW alternative)',
    appliesTo: ['kitchen'],
    severity: 'major',
    penalty: 0.10,
    check: (room) => {
      const preferred: CardinalDirection[] = ['SE', 'NW'];
      const pass = preferred.includes(room.direction);
      return {
        pass,
        message: pass
          ? `Kitchen correctly placed in ${room.direction}`
          : `Kitchen is in ${room.direction}, should be in Southeast or Northwest`,
        recommendation: pass ? '' : 'Move kitchen to Southeast (Fire element - Agni) or Northwest as alternative.',
      };
    },
  },
  {
    id: 'VASTU_004',
    description: 'Living Room should be in NE/N/E',
    appliesTo: ['living_room'],
    severity: 'minor',
    penalty: 0.05,
    check: (room) => {
      const preferred: CardinalDirection[] = ['NE', 'N', 'E'];
      const pass = preferred.includes(room.direction);
      return {
        pass,
        message: pass
          ? `Living Room correctly placed in ${room.direction}`
          : `Living Room is in ${room.direction}, ideally should be in Northeast/North/East`,
        recommendation: pass ? '' : 'Consider placing living room in Northeast, North, or East for positive energy flow.',
      };
    },
  },
  {
    id: 'VASTU_005',
    description: 'Pooja Room should be in NE/E/N',
    appliesTo: ['pooja_room'],
    severity: 'major',
    penalty: 0.10,
    check: (room) => {
      const preferred: CardinalDirection[] = ['NE', 'E', 'N'];
      const pass = preferred.includes(room.direction);
      return {
        pass,
        message: pass
          ? `Pooja Room correctly placed in ${room.direction} (most auspicious)`
          : `Pooja Room is in ${room.direction}, should be in Northeast/East/North`,
        recommendation: pass ? '' : 'Relocate Pooja Room to Northeast (Ishaan Kona) for maximum spiritual benefit.',
      };
    },
  },
  {
    id: 'VASTU_006',
    description: 'Toilets must NOT be in NE or CENTER',
    appliesTo: ['bathroom', 'toilet'],
    severity: 'critical',
    penalty: 0.12,
    check: (room) => {
      const forbidden: CardinalDirection[] = ['NE', 'CENTER'];
      const pass = !forbidden.includes(room.direction);
      return {
        pass,
        message: pass
          ? `${room.name} correctly placed away from Northeast/Center`
          : `${room.name} is in ${room.direction} - toilets in NE/Center cause health and financial problems`,
        recommendation: pass ? '' : `Move ${room.name} to West, South, or Northwest. Never place in Northeast or Center.`,
      };
    },
  },
  {
    id: 'VASTU_007',
    description: 'Entrance should be from N/E/NE',
    appliesTo: ['entrance', 'foyer'],
    severity: 'major',
    penalty: 0.08,
    check: (room) => {
      const preferred: CardinalDirection[] = ['N', 'E', 'NE'];
      const pass = preferred.includes(room.direction);
      return {
        pass,
        message: pass
          ? `Entrance correctly placed in ${room.direction}`
          : `Entrance is in ${room.direction}, should be in North/East/Northeast`,
        recommendation: pass ? '' : 'Reposition entrance to North or East for prosperity and positive energy.',
      };
    },
  },
  {
    id: 'VASTU_008',
    description: 'Children Bedroom should be in W/NW/E',
    appliesTo: ['children_bedroom'],
    severity: 'minor',
    penalty: 0.05,
    check: (room) => {
      const preferred: CardinalDirection[] = ['W', 'NW', 'E'];
      const pass = preferred.includes(room.direction);
      return {
        pass,
        message: pass
          ? `Children's Bedroom correctly placed in ${room.direction}`
          : `Children's Bedroom is in ${room.direction}, ideally in West/Northwest/East`,
        recommendation: pass ? '' : 'Consider placing children\'s bedroom in West, Northwest, or East.',
      };
    },
  },
  {
    id: 'VASTU_009',
    description: 'Guest Bedroom should be in NW',
    appliesTo: ['guest_bedroom'],
    severity: 'minor',
    penalty: 0.04,
    check: (room) => {
      const preferred: CardinalDirection[] = ['NW'];
      const pass = preferred.includes(room.direction);
      return {
        pass,
        message: pass
          ? `Guest Bedroom correctly placed in Northwest`
          : `Guest Bedroom is in ${room.direction}, ideally in Northwest`,
        recommendation: pass ? '' : 'Move guest bedroom to Northwest direction.',
      };
    },
  },
  {
    id: 'VASTU_010',
    description: 'Study Room should be in W/E/NE',
    appliesTo: ['study_room'],
    severity: 'minor',
    penalty: 0.04,
    check: (room) => {
      const preferred: CardinalDirection[] = ['W', 'E', 'NE'];
      const pass = preferred.includes(room.direction);
      return {
        pass,
        message: pass
          ? `Study Room correctly placed in ${room.direction}`
          : `Study Room is in ${room.direction}, ideally in West/East/Northeast`,
        recommendation: pass ? '' : 'Place study room in West (best focus) or East/Northeast.',
      };
    },
  },
  {
    id: 'VASTU_011',
    description: 'Dining Room should be in W/NW/E',
    appliesTo: ['dining_room'],
    severity: 'minor',
    penalty: 0.03,
    check: (room) => {
      const preferred: CardinalDirection[] = ['W', 'NW', 'E'];
      const pass = preferred.includes(room.direction);
      return {
        pass,
        message: pass
          ? `Dining Room correctly placed in ${room.direction}`
          : `Dining Room is in ${room.direction}, ideally in West/Northwest/East`,
        recommendation: pass ? '' : 'Consider placing dining room in West, Northwest, or East.',
      };
    },
  },
  {
    id: 'VASTU_012',
    description: 'Staircase must NOT be in NE or CENTER',
    appliesTo: ['staircase'],
    severity: 'major',
    penalty: 0.08,
    check: (room) => {
      const forbidden: CardinalDirection[] = ['NE', 'CENTER'];
      const pass = !forbidden.includes(room.direction);
      return {
        pass,
        message: pass
          ? `Staircase correctly placed away from Northeast/Center`
          : `Staircase is in ${room.direction} - should not be in NE or Center`,
        recommendation: pass ? '' : 'Move staircase to Southwest, South, or West direction.',
      };
    },
  },
  {
    id: 'VASTU_013',
    description: 'Balcony should be in N/E/NE',
    appliesTo: ['balcony'],
    severity: 'minor',
    penalty: 0.03,
    check: (room) => {
      const preferred: CardinalDirection[] = ['N', 'E', 'NE'];
      const pass = preferred.includes(room.direction);
      return {
        pass,
        message: pass
          ? `Balcony correctly placed in ${room.direction}`
          : `Balcony is in ${room.direction}, ideally in North/East/Northeast`,
        recommendation: pass ? '' : 'Place balcony in North, East, or Northeast for better light and energy.',
      };
    },
  },
  {
    id: 'VASTU_014',
    description: 'Storage should be in SW/S/W',
    appliesTo: ['storage'],
    severity: 'minor',
    penalty: 0.03,
    check: (room) => {
      const preferred: CardinalDirection[] = ['SW', 'S', 'W'];
      const pass = preferred.includes(room.direction);
      return {
        pass,
        message: pass
          ? `Storage correctly placed in ${room.direction}`
          : `Storage is in ${room.direction}, ideally in Southwest/South/West`,
        recommendation: pass ? '' : 'Place storage and heavy items in Southwest, South, or West.',
      };
    },
  },
];

/**
 * Deterministic Vastu validator. Zero LLM calls.
 * vastuStrictness: None=0, Slightly=0.25, Moderately=0.5, Strictly=1.0
 */
export function validateVastu(
  rooms: RoomWithDirection[],
  plotGeometry: PlotGeometry,
  vastuStrictness: number
): VastuValidationResult {
  if (vastuStrictness === 0) {
    return {
      violations: [],
      score: 1.0,
      complianceItems: [{
        rule: 'Vastu Compliance',
        status: 'PASS',
        message: 'Vastu checking disabled (None selected)',
      }],
    };
  }

  const violations: VastuViolation[] = [];
  const complianceItems: ComplianceItem[] = [];

  for (const room of rooms) {
    for (const rule of vastuRules) {
      if (!rule.appliesTo.includes(room.classification)) continue;

      const result = rule.check(room, rooms, plotGeometry);

      complianceItems.push({
        rule: `${rule.id}: ${rule.description}`,
        status: result.pass ? 'PASS' : (rule.severity === 'minor' ? 'WARN' : 'FAIL'),
        message: result.message,
        recommendation: result.recommendation || undefined,
      });

      if (!result.pass) {
        violations.push({
          ruleId: rule.id,
          severity: rule.severity,
          penalty: rule.penalty,
          roomId: room.id,
          roomName: room.name,
          message: result.message,
          recommendation: result.recommendation,
        });
      }
    }
  }

  const totalPenalty = violations.reduce((sum, v) => sum + v.penalty * vastuStrictness, 0);
  const score = Math.max(0, 1.0 - totalPenalty);

  return { violations, score, complianceItems };
}

/**
 * Maps vastuLevel string to numeric strictness.
 */
export function getVastuStrictness(level?: string): number {
  switch (level) {
    case 'None': return 0;
    case 'Slightly': return 0.25;
    case 'Moderately': return 0.5;
    case 'Strictly': return 1.0;
    default: return 0;
  }
}

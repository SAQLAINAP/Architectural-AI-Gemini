import type {
  RoomWithDirection,
  PlotGeometry,
  SetbackRequirements,
  MunicipalConfig,
  RegulatoryViolation,
  RegulatoryValidationResult,
  RoomClassification,
} from '../types/agent.types.js';
import type { ComplianceItem, MunicipalCode } from '../types/shared.types.js';

const municipalConfigs: Record<string, MunicipalConfig> = {
  'National Building Code': {
    maxFAR: 2.0,
    maxGroundCoverage: 0.60,
    minRoomSizes: {
      master_bedroom: 12,
      bedroom: 9,
      children_bedroom: 9,
      guest_bedroom: 9,
      kitchen: 6,
      living_room: 12,
      dining_room: 8,
      bathroom: 3,
      toilet: 2,
      pooja_room: 3,
      study_room: 7,
      corridor: 1.5,
    },
    minCorridorWidth: 1.2,
    minVentilationRatio: 0.10,
    defaultSetbacks: { front: 3, left: 1.5, right: 1.5, rear: 2 },
  },
  'BBMP (Bengaluru)': {
    maxFAR: 2.25,
    maxGroundCoverage: 0.65,
    minRoomSizes: {
      master_bedroom: 12,
      bedroom: 9.5,
      children_bedroom: 9,
      guest_bedroom: 9,
      kitchen: 5.5,
      living_room: 12,
      dining_room: 8,
      bathroom: 2.8,
      toilet: 1.8,
      pooja_room: 2.5,
      study_room: 7,
      corridor: 1.5,
    },
    minCorridorWidth: 1.2,
    minVentilationRatio: 0.10,
    defaultSetbacks: { front: 3, left: 1.5, right: 1.5, rear: 1.5 },
  },
  'BMC (Mumbai)': {
    maxFAR: 2.5,
    maxGroundCoverage: 0.60,
    minRoomSizes: {
      master_bedroom: 12,
      bedroom: 9.5,
      children_bedroom: 9,
      guest_bedroom: 9,
      kitchen: 5.5,
      living_room: 12,
      dining_room: 8,
      bathroom: 3,
      toilet: 2,
      pooja_room: 2.5,
      study_room: 7.5,
      corridor: 1.5,
    },
    minCorridorWidth: 1.2,
    minVentilationRatio: 0.10,
    defaultSetbacks: { front: 3, left: 2, right: 2, rear: 2 },
  },
  'MCD (Delhi)': {
    maxFAR: 3.5,
    maxGroundCoverage: 0.75,
    minRoomSizes: {
      master_bedroom: 12,
      bedroom: 9,
      children_bedroom: 9,
      guest_bedroom: 9,
      kitchen: 5,
      living_room: 11,
      dining_room: 7.5,
      bathroom: 2.5,
      toilet: 1.5,
      pooja_room: 2.5,
      study_room: 7,
      corridor: 1.2,
    },
    minCorridorWidth: 1.2,
    minVentilationRatio: 0.10,
    defaultSetbacks: { front: 3, left: 1.5, right: 1.5, rear: 2 },
  },
};

export function getMunicipalConfig(code: string): MunicipalConfig {
  return municipalConfigs[code] || municipalConfigs['National Building Code'];
}

/**
 * Deterministic regulatory validator. Zero LLM calls.
 */
export function validateRegulatory(
  rooms: RoomWithDirection[],
  plotGeometry: PlotGeometry,
  municipalConfig: MunicipalConfig,
  setbacks: SetbackRequirements,
  floors: number = 1
): RegulatoryValidationResult {
  const violations: RegulatoryViolation[] = [];
  const complianceItems: ComplianceItem[] = [];
  const plotArea = plotGeometry.width * plotGeometry.depth;

  // Separate rooms by type
  const buildingRooms = rooms.filter(r => r.type === 'room' || r.type === 'circulation' || r.type === 'service');
  const setbackRooms = rooms.filter(r => r.type === 'setback');

  const builtUpArea = buildingRooms.reduce((sum, r) => sum + r.area, 0);

  // 1. Setback compliance
  for (const room of buildingRooms) {
    const issues: string[] = [];

    if (room.x < setbacks.left - 0.1) {
      issues.push(`left setback (${setbacks.left}m)`);
    }
    if (room.x + room.width > plotGeometry.width - setbacks.right + 0.1) {
      issues.push(`right setback (${setbacks.right}m)`);
    }
    if (room.y < setbacks.front - 0.1) {
      issues.push(`front setback (${setbacks.front}m)`);
    }
    if (room.y + room.height > plotGeometry.depth - setbacks.rear + 0.1) {
      issues.push(`rear setback (${setbacks.rear}m)`);
    }

    if (issues.length > 0) {
      violations.push({
        category: 'setback',
        severity: 'critical',
        roomId: room.id,
        roomName: room.name,
        message: `${room.name} intrudes into ${issues.join(', ')}`,
        recommendation: `Adjust ${room.name} position to stay within buildable envelope.`,
      });
    }
  }

  const setbackPass = violations.filter(v => v.category === 'setback').length === 0;
  complianceItems.push({
    rule: 'Setback Compliance',
    status: setbackPass ? 'PASS' : 'FAIL',
    message: setbackPass
      ? `All rooms within setback boundaries (F:${setbacks.front}m, L:${setbacks.left}m, R:${setbacks.right}m, B:${setbacks.rear}m)`
      : `${violations.filter(v => v.category === 'setback').length} rooms intrude into setback zones`,
    recommendation: setbackPass ? undefined : 'Adjust room positions to stay within buildable envelope.',
  });

  // 2. FAR/FSI check
  const far = (builtUpArea * floors) / plotArea;
  const farPass = far <= municipalConfig.maxFAR;
  complianceItems.push({
    rule: 'Floor Area Ratio (FAR/FSI)',
    status: farPass ? 'PASS' : 'FAIL',
    message: `FAR: ${far.toFixed(2)} (max: ${municipalConfig.maxFAR})`,
    recommendation: farPass ? undefined : `Reduce built-up area by ${((far - municipalConfig.maxFAR) * plotArea / floors).toFixed(1)} sq.m`,
  });
  if (!farPass) {
    violations.push({
      category: 'far',
      severity: 'critical',
      message: `FAR ${far.toFixed(2)} exceeds maximum ${municipalConfig.maxFAR}`,
      recommendation: `Reduce built-up area or number of floors.`,
    });
  }

  // 3. Ground coverage
  const coverage = builtUpArea / plotArea;
  const coveragePass = coverage <= municipalConfig.maxGroundCoverage;
  complianceItems.push({
    rule: 'Ground Coverage',
    status: coveragePass ? 'PASS' : 'WARN',
    message: `Coverage: ${(coverage * 100).toFixed(1)}% (max: ${(municipalConfig.maxGroundCoverage * 100).toFixed(0)}%)`,
    recommendation: coveragePass ? undefined : `Reduce ground floor built-up area.`,
  });
  if (!coveragePass) {
    violations.push({
      category: 'coverage',
      severity: 'major',
      message: `Ground coverage ${(coverage * 100).toFixed(1)}% exceeds maximum ${(municipalConfig.maxGroundCoverage * 100).toFixed(0)}%`,
      recommendation: `Reduce ground floor built-up area.`,
    });
  }

  // 4. Minimum room sizes
  for (const room of rooms.filter(r => r.type === 'room')) {
    const minSize = municipalConfig.minRoomSizes[room.classification];
    if (minSize && room.area < minSize - 0.1) {
      violations.push({
        category: 'room_size',
        severity: 'major',
        roomId: room.id,
        roomName: room.name,
        message: `${room.name} area ${room.area.toFixed(1)} sq.m is below minimum ${minSize} sq.m`,
        recommendation: `Increase ${room.name} dimensions to meet minimum ${minSize} sq.m requirement.`,
      });
      complianceItems.push({
        rule: `Min Room Size: ${room.name}`,
        status: 'FAIL',
        message: `${room.area.toFixed(1)} sq.m < ${minSize} sq.m minimum`,
        recommendation: `Increase to at least ${minSize} sq.m.`,
      });
    } else if (minSize) {
      complianceItems.push({
        rule: `Min Room Size: ${room.name}`,
        status: 'PASS',
        message: `${room.area.toFixed(1)} sq.m >= ${minSize} sq.m minimum`,
      });
    }
  }

  // 5. Corridor width
  for (const room of rooms.filter(r => r.type === 'circulation')) {
    const minDim = Math.min(room.width, room.height);
    if (minDim < municipalConfig.minCorridorWidth - 0.05) {
      violations.push({
        category: 'corridor_width',
        severity: 'major',
        roomId: room.id,
        roomName: room.name,
        message: `${room.name} width ${minDim.toFixed(1)}m is below minimum ${municipalConfig.minCorridorWidth}m`,
        recommendation: `Widen ${room.name} to at least ${municipalConfig.minCorridorWidth}m.`,
      });
      complianceItems.push({
        rule: `Corridor Width: ${room.name}`,
        status: 'FAIL',
        message: `${minDim.toFixed(1)}m < ${municipalConfig.minCorridorWidth}m minimum`,
      });
    }
  }

  // 6. Ventilation ratio (estimate from window features)
  const habitableClassifications: RoomClassification[] = [
    'master_bedroom', 'bedroom', 'children_bedroom', 'guest_bedroom',
    'kitchen', 'living_room', 'dining_room', 'study_room',
  ];

  for (const room of rooms.filter(r => habitableClassifications.includes(r.classification))) {
    const windows = room.features.filter(f => f.type === 'window');
    const estimatedWindowArea = windows.reduce((sum, w) => sum + w.width * 1.2, 0); // Assume 1.2m height
    const ratio = room.area > 0 ? estimatedWindowArea / room.area : 0;

    if (ratio < municipalConfig.minVentilationRatio && windows.length > 0) {
      complianceItems.push({
        rule: `Ventilation: ${room.name}`,
        status: 'WARN',
        message: `Ventilation ratio ~${(ratio * 100).toFixed(0)}% (min ${(municipalConfig.minVentilationRatio * 100).toFixed(0)}%)`,
        recommendation: `Add larger windows to ${room.name} for adequate natural light/ventilation.`,
      });
    } else if (windows.length === 0 && room.type === 'room') {
      complianceItems.push({
        rule: `Ventilation: ${room.name}`,
        status: 'WARN',
        message: `No windows detected for ${room.name}`,
        recommendation: `Add windows for natural light and ventilation.`,
      });
    }
  }

  // Calculate score
  const penaltyMap = { critical: 0.20, major: 0.10, minor: 0.03 };
  const totalPenalty = violations.reduce((sum, v) => sum + penaltyMap[v.severity], 0);
  const score = Math.max(0, 1.0 - totalPenalty);

  return {
    violations,
    score,
    setbackCompliance: setbackPass,
    complianceItems,
  };
}

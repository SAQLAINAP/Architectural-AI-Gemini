import type { Room, ComplianceItem, GeneratedPlan, ProjectConfig } from './shared.types.js';

export type CardinalDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' | 'CENTER';

export type RoomClassification =
  | 'master_bedroom'
  | 'children_bedroom'
  | 'guest_bedroom'
  | 'bedroom'
  | 'kitchen'
  | 'living_room'
  | 'dining_room'
  | 'bathroom'
  | 'toilet'
  | 'pooja_room'
  | 'study_room'
  | 'balcony'
  | 'staircase'
  | 'corridor'
  | 'entrance'
  | 'foyer'
  | 'storage'
  | 'parking'
  | 'utility';

export interface RoomWithDirection extends Room {
  direction: CardinalDirection;
  centerX: number;
  centerY: number;
  area: number;
  classification: RoomClassification;
}

export interface PlotGeometry {
  width: number;
  depth: number;
}

export interface SetbackRequirements {
  front: number;
  left: number;
  right: number;
  rear: number;
}

export interface MunicipalConfig {
  maxFAR: number;
  maxGroundCoverage: number;
  minRoomSizes: Partial<Record<RoomClassification, number>>;
  minCorridorWidth: number;
  minVentilationRatio: number;
  defaultSetbacks: SetbackRequirements;
}

export interface NormalizedSpec {
  config: ProjectConfig;
  plotGeometry: PlotGeometry;
  requiredRooms: RoomRequirement[];
  setbackRequirements: SetbackRequirements;
  municipalConfig: MunicipalConfig;
  vastuStrictness: number;
  adjacencyPreferences: AdjacencyPreference[];
}

export interface RoomRequirement {
  classification: RoomClassification;
  name: string;
  minArea: number;
  count: number;
}

export interface AdjacencyPreference {
  room1: string;
  room2: string;
  relationship: 'adjacent' | 'nearby' | 'separated';
}

export interface FloorPlanGraph {
  rooms: RoomWithDirection[];
  adjacencies: Array<{ room1Id: string; room2Id: string }>;
  designLog: string[];
  totalArea: number;
  builtUpArea: number;
  circulationArea: number;
  setbackArea: number;
  plotCoverageRatio: number;
}

export interface VastuViolation {
  ruleId: string;
  severity: 'critical' | 'major' | 'minor';
  penalty: number;
  roomId: string;
  roomName: string;
  message: string;
  recommendation: string;
}

export interface VastuValidationResult {
  violations: VastuViolation[];
  score: number;
  complianceItems: ComplianceItem[];
}

export interface RegulatoryViolation {
  category: string;
  severity: 'critical' | 'major' | 'minor';
  roomId?: string;
  roomName?: string;
  message: string;
  recommendation: string;
}

export interface RegulatoryValidationResult {
  violations: RegulatoryViolation[];
  score: number;
  setbackCompliance: boolean;
  complianceItems: ComplianceItem[];
}

export interface CritiqueResult {
  spatialEfficiency: number;
  circulationQuality: number;
  naturalLighting: number;
  privacyGradient: number;
  aestheticBalance: number;
  overallConfidence: number;
  critiques: string[];
  strengths: string[];
}

export interface RefinementResult {
  refinedPlan: FloorPlanGraph;
  changesApplied: string[];
  violationsAddressed: string[];
}

export interface PlanScore {
  finalScore: number;
  breakdown: {
    category: string;
    weight: number;
    score: number;
    weightedScore: number;
  }[];
  passesThreshold: boolean;
}

export interface IterationRecord {
  iteration: number;
  plan: FloorPlanGraph;
  vastuResult: VastuValidationResult;
  regulatoryResult: RegulatoryValidationResult;
  critique: CritiqueResult;
  score: PlanScore;
}

export interface OrchestrationResult {
  finalPlan: GeneratedPlan;
  iterations: IterationRecord[];
  finalScore: PlanScore;
  converged: boolean;
}

export interface GenerationJob {
  jobId: string;
  userId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: {
    phase: string;
    iteration: number;
    maxIterations: number;
    agentName?: string;
  };
  result?: OrchestrationResult;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AgentResult<T> {
  success: boolean;
  data: T;
  metadata: {
    agentName: string;
    modelUsed: string;
    durationMs: number;
    tokenCount?: number;
  };
}

export type AgentRole = 'input' | 'spatial' | 'critic' | 'refinement' | 'cost';

export interface ModelRouterConfig {
  model: string;
  temperature: number;
  maxOutputTokens: number;
}

export interface CostEstimate {
  bom: Array<{
    material: string;
    quantity: string;
    unit: string;
    estimatedCost: number;
  }>;
  totalCostRange: {
    min: number;
    max: number;
    currency: string;
  };
}

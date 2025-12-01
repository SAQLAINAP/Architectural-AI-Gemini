
export enum ViewState {
  HOME = 'HOME',
  CONFIG = 'CONFIG',
  DASHBOARD = 'DASHBOARD',
  PROJECTS = 'PROJECTS',
  DOCS = 'DOCS',
}

export enum BuildingType {
  RESIDENTIAL = 'Residential',
  COMMERCIAL = 'Commercial',
  MIXED_USE = 'Mixed Use',
}

export enum CulturalSystem {
  NONE = 'None',
  VASTU_GENERAL = 'General Vastu',
  VASTU_NORTH = 'North Indian Vastu',
  VASTU_SOUTH = 'South Indian Vastu',
  ISLAMIC = 'Islamic Beliefs',
  CHRISTIAN = 'Christian Beliefs',
}

export enum MunicipalCode {
  NATIONAL = 'National Building Code',
  BBMP = 'BBMP (Bengaluru)',
  BMC = 'BMC (Mumbai)',
  MCD = 'MCD (Delhi)',
}

export interface ProjectConfig {
  projectType: BuildingType;
  width: number;
  depth: number;
  requirements: string[];
  adjacency: string;
  culturalSystem: CulturalSystem;
  vastuLevel?: 'None' | 'Slightly' | 'Moderately' | 'Strictly';
  facingDirection?: string;
  surroundingContext?: string;
  floors?: number;
  floorPlanStyle?: 'Simplex' | 'Duplex' | 'Triplex';
  bathrooms?: number;
  bathroomType?: 'Western' | 'Indian' | 'Mixed';
  parking?: 'None' | 'Bike Only' | '1 Car' | '2+ Cars';
  kitchenType?: 'Open' | 'Closed';
  familyMembers?: number;
  municipalCode: MunicipalCode;
}

export interface WallFeature {
  type: 'door' | 'window' | 'opening';
  wall: 'top' | 'bottom' | 'left' | 'right';
  position: number; // 0 to 1 normalized along the wall
  width: number; // meters
}

export interface Room {
  id: string;
  name: string;
  type: 'room' | 'circulation' | 'outdoor' | 'setback' | 'service';
  x: number; // in meters
  y: number; // in meters
  width: number; // in meters
  height: number; // in meters
  features: WallFeature[];
  guidance?: string; // Cultural/Furniture placement advice
}

export interface ComplianceItem {
  rule: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  recommendation?: string;
}

export interface MaterialItem {
  material: string;
  quantity: string;
  unit: string;
  estimatedCost: number;
}

export interface GeneratedPlan {
  imageUrl?: string; // For uploaded plans
  designLog?: string[]; // AI's reasoning steps
  rooms: Room[]; // "Rooms" now encompasses all zones. Can be empty if analyzing an image without geometry extraction.
  totalArea: number;
  builtUpArea: number;
  plotCoverageRatio: number;
  compliance: {
    regulatory: ComplianceItem[];
    cultural: ComplianceItem[];
  };
  bom: MaterialItem[];
  totalCostRange: {
    min: number;
    max: number;
    currency: string;
  };
  version?: string; // e.g., "1.0", "1.1"
  timestamp?: number; // Unix timestamp
}

export interface SavedProject {
  id: string;
  name: string;
  date: string;
  config: ProjectConfig | null;
  plan: GeneratedPlan;
}

export interface MaterialEstimationConfig {
  projectType: 'Residential' | 'Commercial' | 'Industrial';
  location: string;
  dimensions: {
    length: number;
    width: number;
    floors: number;
    totalArea: number;
  };
  soil: {
    strength: 'Weak' | 'Medium' | 'Strong';
    waterProximity: boolean;
    fertility: 'Fertile' | 'Rocky' | 'Clayey';
    issues: string[];
  };
  budget: {
    level: 'Basic' | 'Medium' | 'Premium' | 'Luxury';
    priority: string;
    timeline: string;
    sustainability: boolean;
  };
  preferences: {
    localSourcing: boolean;
    laborIncluded: boolean;
    extras: string[];
    customNotes: string;
  };
}

export interface MaterialReport {
  executiveSummary: {
    totalCost: string;
    costPerSqft: string;
    timelineImpact: string;
  };
  grandTotal: number;
  quotations: {
    title: string;
    description: string;
    estimatedCost: number;
    items: string[];
  }[];
  breakdown: {
    category: string;
    items: {
      item: string;
      quantity: string;
      unitPrice: string;
      total: string;
    }[];
  }[];
  visuals: {
    costDistribution: { name: string; value: number }[];
  };
  recommendations: string[];
  risks: string[];
}

export interface SavedMaterialEstimate {
  id: string;
  name: string;
  date: string;
  config: MaterialEstimationConfig;
  report: MaterialReport;
}

export interface ModificationAnalysis {
  originalRequest: string;
  analysis: string;
  feasibility: 'FEASIBLE' | 'CAUTION' | 'NOT_RECOMMENDED';
  vastuImplications: string;
  regulatoryImplications: string;
  suggestion: string;
}
import type { PlanScore } from '../types/agent.types.js';

const DEFAULT_THRESHOLD = 0.70;

/**
 * Weighted scoring:
 * finalScore = 0.4 * regulatoryScore + 0.3 * vastuScore + 0.2 * spatialEfficiency + 0.1 * criticConfidence
 */
export function scorePlan(
  regulatoryScore: number,
  vastuScore: number,
  spatialEfficiency: number,
  criticConfidence: number,
  threshold: number = DEFAULT_THRESHOLD
): PlanScore {
  const breakdown = [
    {
      category: 'Regulatory Compliance',
      weight: 0.4,
      score: regulatoryScore,
      weightedScore: 0.4 * regulatoryScore,
    },
    {
      category: 'Vastu/Cultural Compliance',
      weight: 0.3,
      score: vastuScore,
      weightedScore: 0.3 * vastuScore,
    },
    {
      category: 'Spatial Efficiency',
      weight: 0.2,
      score: spatialEfficiency,
      weightedScore: 0.2 * spatialEfficiency,
    },
    {
      category: 'Critic Confidence',
      weight: 0.1,
      score: criticConfidence,
      weightedScore: 0.1 * criticConfidence,
    },
  ];

  const finalScore = breakdown.reduce((sum, b) => sum + b.weightedScore, 0);

  return {
    finalScore,
    breakdown,
    passesThreshold: finalScore >= threshold,
  };
}

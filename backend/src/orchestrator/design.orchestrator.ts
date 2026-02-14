import type {
  NormalizedSpec,
  FloorPlanGraph,
  OrchestrationResult,
  IterationRecord,
  CritiqueResult,
  PlanScore,
} from '../types/agent.types.js';
import type { ProjectConfig, GeneratedPlan, ComplianceItem } from '../types/shared.types.js';
import { InputAgent } from '../agents/input.agent.js';
import { SpatialAgent } from '../agents/spatial.agent.js';
import { CriticAgent } from '../agents/critic.agent.js';
import { RefinementAgent } from '../agents/refinement.agent.js';
import { CostAgent } from '../agents/cost.agent.js';
import { validateVastu } from '../validators/vastu.validator.js';
import { validateRegulatory } from '../validators/regulatory.validator.js';
import { scorePlan } from '../scoring/plan.scorer.js';
import { logger } from '../utils/logger.js';

const MAX_ITERATIONS = 3;

export interface ProgressCallback {
  (event: {
    type: string;
    data: any;
  }): void;
}

export async function orchestrate(
  config: ProjectConfig,
  onProgress?: ProgressCallback
): Promise<OrchestrationResult> {
  const inputAgent = new InputAgent();
  const spatialAgent = new SpatialAgent();
  const criticAgent = new CriticAgent();
  const refinementAgent = new RefinementAgent();
  const costAgent = new CostAgent();

  const iterations: IterationRecord[] = [];

  // Step 1: Normalize input
  emitProgress(onProgress, 'agent_start', { agent: 'InputAgent', phase: 'normalization' });
  const specResult = await inputAgent.execute(config);
  const spec = specResult.data;
  emitProgress(onProgress, 'agent_complete', {
    agent: 'InputAgent',
    durationMs: specResult.metadata.durationMs,
    model: specResult.metadata.modelUsed,
  });

  // Step 2: Generate initial spatial plan
  emitProgress(onProgress, 'agent_start', { agent: 'SpatialAgent', phase: 'spatial_generation' });
  const spatialResult = await spatialAgent.execute(spec);
  let currentPlan = spatialResult.data;
  emitProgress(onProgress, 'agent_complete', {
    agent: 'SpatialAgent',
    durationMs: spatialResult.metadata.durationMs,
    model: spatialResult.metadata.modelUsed,
  });

  // Step 3: Iterative refinement loop
  let finalScore: PlanScore | null = null;
  let converged = false;

  for (let i = 1; i <= MAX_ITERATIONS; i++) {
    emitProgress(onProgress, 'iteration_start', {
      iteration: i,
      maxIterations: MAX_ITERATIONS,
    });

    // Deterministic validation
    const vastuResult = validateVastu(
      currentPlan.rooms,
      spec.plotGeometry,
      spec.vastuStrictness
    );
    emitProgress(onProgress, 'violation_update', {
      iteration: i,
      vastuViolations: vastuResult.violations.length,
      vastuScore: vastuResult.score,
    });

    const regulatoryResult = validateRegulatory(
      currentPlan.rooms,
      spec.plotGeometry,
      spec.municipalConfig,
      spec.setbackRequirements,
      config.floors || 1
    );
    emitProgress(onProgress, 'violation_update', {
      iteration: i,
      regulatoryViolations: regulatoryResult.violations.length,
      regulatoryScore: regulatoryResult.score,
    });

    // Critic evaluation
    emitProgress(onProgress, 'agent_start', { agent: 'CriticAgent', phase: 'critique' });
    const critiqueResult = await criticAgent.execute({
      plan: currentPlan,
      spec,
      vastuResult,
      regulatoryResult,
    });
    const critique = critiqueResult.data;
    emitProgress(onProgress, 'agent_complete', {
      agent: 'CriticAgent',
      durationMs: critiqueResult.metadata.durationMs,
      model: critiqueResult.metadata.modelUsed,
    });

    // Score
    const score = scorePlan(
      regulatoryResult.score,
      vastuResult.score,
      critique.spatialEfficiency,
      critique.overallConfidence
    );
    finalScore = score;

    emitProgress(onProgress, 'score_update', {
      iteration: i,
      finalScore: score.finalScore,
      breakdown: score.breakdown,
      passesThreshold: score.passesThreshold,
    });

    // Record iteration
    iterations.push({
      iteration: i,
      plan: currentPlan,
      vastuResult,
      regulatoryResult,
      critique,
      score,
    });

    // Check convergence
    if (score.passesThreshold) {
      converged = true;
      logger.info({ iteration: i, score: score.finalScore }, 'Plan converged');
      break;
    }

    // Refine if not last iteration
    if (i < MAX_ITERATIONS) {
      emitProgress(onProgress, 'agent_start', { agent: 'RefinementAgent', phase: 'refinement' });
      const refinementResult = await refinementAgent.execute({
        plan: currentPlan,
        spec,
        vastuViolations: vastuResult.violations,
        regulatoryViolations: regulatoryResult.violations,
        critiques: critique.critiques,
      });
      currentPlan = refinementResult.data.refinedPlan;
      emitProgress(onProgress, 'agent_complete', {
        agent: 'RefinementAgent',
        durationMs: refinementResult.metadata.durationMs,
        model: refinementResult.metadata.modelUsed,
        changesApplied: refinementResult.data.changesApplied,
      });
    }
  }

  // Step 4: Cost estimation
  emitProgress(onProgress, 'agent_start', { agent: 'CostAgent', phase: 'cost_estimation' });
  const costResult = await costAgent.execute({ plan: currentPlan, spec });
  emitProgress(onProgress, 'agent_complete', {
    agent: 'CostAgent',
    durationMs: costResult.metadata.durationMs,
    model: costResult.metadata.modelUsed,
  });

  // Step 5: Assemble final GeneratedPlan
  const lastIteration = iterations[iterations.length - 1];
  const allComplianceRegulatory: ComplianceItem[] = lastIteration?.regulatoryResult.complianceItems || [];
  const allComplianceCultural: ComplianceItem[] = lastIteration?.vastuResult.complianceItems || [];

  const finalPlan: GeneratedPlan = {
    designLog: currentPlan.designLog,
    rooms: currentPlan.rooms.map(r => ({
      id: r.id,
      name: r.name,
      type: r.type,
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      features: r.features,
      guidance: r.guidance,
    })),
    totalArea: currentPlan.totalArea,
    builtUpArea: currentPlan.builtUpArea,
    plotCoverageRatio: currentPlan.plotCoverageRatio,
    compliance: {
      regulatory: allComplianceRegulatory,
      cultural: allComplianceCultural,
    },
    bom: costResult.data.bom,
    totalCostRange: costResult.data.totalCostRange,
  };

  const result: OrchestrationResult = {
    finalPlan,
    iterations,
    finalScore: finalScore!,
    converged,
  };

  emitProgress(onProgress, 'completed', {
    finalScore: finalScore!.finalScore,
    converged,
    iterationCount: iterations.length,
  });

  return result;
}

function emitProgress(
  callback: ProgressCallback | undefined,
  type: string,
  data: any
): void {
  if (callback) {
    callback({ type, data });
  }
}

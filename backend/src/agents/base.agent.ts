import type { AgentResult, AgentRole } from '../types/agent.types.js';
import { getModelConfig } from '../models/model.router.js';
import { logger } from '../utils/logger.js';

export abstract class BaseAgent<TInput, TOutput> {
  abstract readonly name: string;
  abstract readonly role: AgentRole;

  abstract execute(input: TInput): Promise<AgentResult<TOutput>>;

  protected wrapResult(
    data: TOutput,
    startTime: number,
    tokenCount?: number
  ): AgentResult<TOutput> {
    const modelConfig = getModelConfig(this.role);
    const durationMs = Date.now() - startTime;

    logger.info(
      { agent: this.name, durationMs, tokenCount, model: modelConfig.model },
      'Agent execution completed'
    );

    return {
      success: true,
      data,
      metadata: {
        agentName: this.name,
        modelUsed: modelConfig.model,
        durationMs,
        tokenCount,
      },
    };
  }
}

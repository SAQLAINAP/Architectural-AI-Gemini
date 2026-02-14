import type { AgentRole, ModelRouterConfig } from '../types/agent.types.js';

const routerConfig: Record<AgentRole, ModelRouterConfig> = {
  input: {
    model: 'gemini-2.5-flash',
    temperature: 0.2,
    maxOutputTokens: 4096,
  },
  spatial: {
    model: 'gemini-2.5-pro',
    temperature: 0.7,
    maxOutputTokens: 16384,
  },
  critic: {
    model: 'gemini-2.5-pro',
    temperature: 0.3,
    maxOutputTokens: 8192,
  },
  refinement: {
    model: 'gemini-2.5-pro',
    temperature: 0.5,
    maxOutputTokens: 16384,
  },
  cost: {
    model: 'gemini-2.5-flash',
    temperature: 0.2,
    maxOutputTokens: 8192,
  },
};

export function getModelConfig(role: AgentRole): ModelRouterConfig {
  return routerConfig[role];
}

export function getRouterConfig(): Record<AgentRole, ModelRouterConfig> {
  return { ...routerConfig };
}

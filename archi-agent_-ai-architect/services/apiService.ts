import { supabase } from '../lib/supabaseClient';
import type {
  ProjectConfig,
  GeneratedPlan,
  ModificationAnalysis,
  MaterialEstimationConfig,
  MaterialReport,
  GenerationProgress,
  GenerationStreamEvent,
} from '../types';

function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_URL || '/api';
}

async function getAuthToken(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || `API request failed: ${response.status}`);
  }

  return response.json();
}

export async function startFloorPlanGeneration(config: ProjectConfig): Promise<{ jobId: string }> {
  return apiFetch<{ jobId: string }>('/generate', {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

export async function streamGenerationProgress(
  jobId: string,
  callbacks: {
    onEvent: (event: GenerationStreamEvent) => void;
    onComplete: (plan: GeneratedPlan) => void;
    onError: (error: string) => void;
  }
): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const token = await getAuthToken();

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}/generate/${jobId}/stream`, { headers });

  if (!response.ok) {
    throw new Error(`Stream connection failed: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No readable stream');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const event = JSON.parse(line.slice(6)) as GenerationStreamEvent;
          callbacks.onEvent(event);

          if (event.type === 'completed' && event.data.finalPlan) {
            callbacks.onComplete(event.data.finalPlan);
          } else if (event.type === 'error') {
            callbacks.onError(event.data.message);
          }
        } catch {
          // Skip malformed events
        }
      }
    }
  }
}

export async function generateFloorPlanWithProgress(
  config: ProjectConfig,
  isRegeneration: boolean,
  onProgress?: (progress: GenerationProgress) => void
): Promise<GeneratedPlan> {
  const { jobId } = await startFloorPlanGeneration(config);

  const progress: GenerationProgress = {
    jobId,
    status: 'running',
    currentIteration: 0,
    maxIterations: 3,
    scores: [],
    violations: [],
    agentHistory: [],
    moeDecisions: [],
    finalPlan: null,
  };

  if (onProgress) onProgress({ ...progress });

  return new Promise((resolve, reject) => {
    streamGenerationProgress(jobId, {
      onEvent: (event) => {
        switch (event.type) {
          case 'iteration_start':
            progress.currentIteration = event.data.iteration;
            break;
          case 'agent_start':
            progress.currentAgent = event.data.agent;
            break;
          case 'agent_complete':
            progress.agentHistory.push({
              agent: event.data.agent,
              model: event.data.model,
              durationMs: event.data.durationMs,
              timestamp: Date.now(),
            });
            progress.currentAgent = undefined;
            break;
          case 'score_update':
            progress.scores.push({
              iteration: event.data.iteration,
              finalScore: event.data.finalScore,
              breakdown: event.data.breakdown,
            });
            break;
          case 'violation_update':
            progress.violations.push({
              iteration: event.data.iteration,
              regulatory: event.data.regulatoryViolations ?? 0,
              cultural: event.data.vastuViolations ?? 0,
              total: (event.data.regulatoryViolations ?? 0) + (event.data.vastuViolations ?? 0),
            });
            break;
          case 'moe_routing':
            progress.moeDecisions.push({
              agent: event.data.agent,
              model: event.data.model,
              reason: event.data.reason,
            });
            break;
        }

        if (onProgress) onProgress({ ...progress });
      },
      onComplete: (plan) => {
        progress.status = 'completed';
        progress.finalPlan = plan;
        if (onProgress) onProgress({ ...progress });
        resolve(plan);
      },
      onError: (error) => {
        progress.status = 'failed';
        if (onProgress) onProgress({ ...progress });
        reject(new Error(error));
      },
    }).catch(reject);
  });
}

export async function analyzePlanFromImage(base64Image: string): Promise<GeneratedPlan> {
  return apiFetch<GeneratedPlan>('/analyze-image', {
    method: 'POST',
    body: JSON.stringify({ image: base64Image }),
  });
}

export async function analyzePlanModification(
  plan: GeneratedPlan,
  request: string,
  config: ProjectConfig
): Promise<ModificationAnalysis> {
  return apiFetch<ModificationAnalysis>('/modify/analyze', {
    method: 'POST',
    body: JSON.stringify({ plan, request, config }),
  });
}

export async function applyPlanModification(
  plan: GeneratedPlan,
  request: string,
  config: ProjectConfig
): Promise<GeneratedPlan> {
  return apiFetch<GeneratedPlan>('/modify/apply', {
    method: 'POST',
    body: JSON.stringify({ plan, request, config }),
  });
}

export async function generateMaterialEstimate(config: MaterialEstimationConfig): Promise<MaterialReport> {
  return apiFetch<MaterialReport>('/estimate', {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

import type { GenerationJob } from '../types/agent.types.js';

const TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_SESSIONS = 1000;

const jobs = new Map<string, GenerationJob>();

export function createJob(jobId: string, userId: string): GenerationJob {
  // Evict oldest if at capacity
  if (jobs.size >= MAX_SESSIONS) {
    const oldest = [...jobs.entries()]
      .sort((a, b) => a[1].createdAt - b[1].createdAt)[0];
    if (oldest) jobs.delete(oldest[0]);
  }

  const job: GenerationJob = {
    jobId,
    userId,
    status: 'pending',
    progress: {
      phase: 'queued',
      iteration: 0,
      maxIterations: 3,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  jobs.set(jobId, job);
  return job;
}

export function getJob(jobId: string): GenerationJob | undefined {
  const job = jobs.get(jobId);
  if (job && Date.now() - job.createdAt > TTL_MS && job.status !== 'running') {
    jobs.delete(jobId);
    return undefined;
  }
  return job;
}

export function updateJob(jobId: string, updates: Partial<GenerationJob>): void {
  const job = jobs.get(jobId);
  if (job) {
    Object.assign(job, updates, { updatedAt: Date.now() });
  }
}

export function deleteJob(jobId: string): void {
  jobs.delete(jobId);
}

export function getJobsByUser(userId: string): GenerationJob[] {
  return [...jobs.values()].filter(j => j.userId === userId);
}

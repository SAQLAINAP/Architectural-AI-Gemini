import React from 'react';
import { Loader2, CheckCircle, AlertTriangle, Brain, Zap } from 'lucide-react';
import type { GenerationProgress } from '../types';

interface Props {
  progress: GenerationProgress | null;
}

const agentColors: Record<string, string> = {
  InputAgent: 'bg-blue-400',
  SpatialAgent: 'bg-purple-400',
  CriticAgent: 'bg-orange-400',
  RefinementAgent: 'bg-green-400',
  CostAgent: 'bg-pink-400',
};

const GenerationProgressOverlay: React.FC<Props> = ({ progress }) => {
  if (!progress || progress.status === 'completed') return null;

  const latestScore = progress.scores.length > 0
    ? progress.scores[progress.scores.length - 1]
    : null;

  const latestViolations = progress.violations.length > 0
    ? progress.violations[progress.violations.length - 1]
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 border-2 border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] p-8 max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Brain className="w-8 h-8 text-purple-500 animate-pulse" />
          <div>
            <h2 className="text-xl font-black">MULTI-AGENT DESIGN</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-bold">
              AI agents are designing your floor plan
            </p>
          </div>
        </div>

        {/* Iteration Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm font-bold mb-2">
            <span>Iteration {progress.currentIteration}/{progress.maxIterations}</span>
            {latestScore && (
              <span className={latestScore.finalScore >= 0.7 ? 'text-green-600' : 'text-orange-500'}>
                Score: {(latestScore.finalScore * 100).toFixed(0)}%
              </span>
            )}
          </div>
          <div className="flex gap-1">
            {Array.from({ length: progress.maxIterations }, (_, i) => (
              <div
                key={i}
                className={`h-3 flex-1 border border-black dark:border-white transition-all duration-500 ${
                  i < progress.currentIteration
                    ? 'bg-green-400'
                    : i === progress.currentIteration - 1
                    ? 'bg-yellow-300 animate-pulse'
                    : 'bg-gray-200 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Score Trajectory */}
        {progress.scores.length > 0 && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-slate-700 border-2 border-gray-200 dark:border-gray-600">
            <div className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">
              Score Trajectory
            </div>
            <div className="flex items-end gap-2 h-8">
              {progress.scores.map((s, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span className="text-xs font-bold">{(s.finalScore * 100).toFixed(0)}%</span>
                  <div
                    className="bg-purple-400 border border-black dark:border-white w-8 transition-all duration-500"
                    style={{ height: `${s.finalScore * 32}px` }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Agent */}
        {progress.currentAgent && (
          <div className="mb-4 flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-300 dark:border-yellow-600">
            <Loader2 className="w-5 h-5 animate-spin text-yellow-600" />
            <div>
              <span className="font-bold text-sm">{progress.currentAgent}</span>
              <span className={`ml-2 inline-block w-2 h-2 rounded-full ${agentColors[progress.currentAgent] || 'bg-gray-400'}`} />
            </div>
          </div>
        )}

        {/* Agent History */}
        {progress.agentHistory.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">
              Completed Agents
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {progress.agentHistory.map((entry, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span className="font-bold">{entry.agent}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {entry.model}
                    </span>
                    <span>{(entry.durationMs / 1000).toFixed(1)}s</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Violation Counts */}
        {latestViolations && (
          <div className="flex gap-4 text-xs font-bold">
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-red-500" />
              <span>Regulatory: {latestViolations.regulatory}</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-orange-500" />
              <span>Cultural: {latestViolations.cultural}</span>
            </div>
          </div>
        )}

        {/* Status */}
        {progress.status === 'failed' && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border-2 border-red-300 text-red-700 dark:text-red-300 font-bold text-sm">
            Generation failed. Please try again.
          </div>
        )}
      </div>
    </div>
  );
};

export default GenerationProgressOverlay;

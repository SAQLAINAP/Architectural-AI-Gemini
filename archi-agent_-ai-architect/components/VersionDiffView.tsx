import React, { useState, useMemo } from 'react';
import type { GeneratedPlan } from '../types';
import { X } from 'lucide-react';
import { computePlanDiff, getDiffOverrides } from '../utils/planDiff';
import FloorPlanSvg from './FloorPlanSvg';

interface VersionDiffViewProps {
  planHistory: GeneratedPlan[];
  onClose: () => void;
}

const VersionDiffView: React.FC<VersionDiffViewProps> = ({ planHistory, onClose }) => {
  const [leftIndex, setLeftIndex] = useState(0);
  const [rightIndex, setRightIndex] = useState(planHistory.length - 1);

  const diff = useMemo(
    () => computePlanDiff(planHistory[leftIndex].rooms, planHistory[rightIndex].rooms),
    [planHistory, leftIndex, rightIndex]
  );

  const leftOverrides = useMemo(() => getDiffOverrides(diff.leftRooms), [diff]);
  const rightOverrides = useMemo(() => getDiffOverrides(diff.rightRooms), [diff]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 border-2 border-black dark:border-white shadow-neo dark:shadow-neoDark w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-black dark:border-white">
          <h2 className="text-xl font-black dark:text-white">Version Comparison</h2>
          <div className="flex items-center gap-4">
            {/* Summary */}
            <div className="flex gap-3 text-xs font-bold">
              {diff.summary.added > 0 && (
                <span className="bg-green-200 text-green-900 px-2 py-0.5 border border-green-600">+{diff.summary.added} added</span>
              )}
              {diff.summary.removed > 0 && (
                <span className="bg-red-200 text-red-900 px-2 py-0.5 border border-red-600">-{diff.summary.removed} removed</span>
              )}
              {diff.summary.modified > 0 && (
                <span className="bg-yellow-200 text-yellow-900 px-2 py-0.5 border border-yellow-600">~{diff.summary.modified} modified</span>
              )}
              {diff.summary.unchanged > 0 && (
                <span className="bg-gray-200 text-gray-700 px-2 py-0.5 border border-gray-400">{diff.summary.unchanged} unchanged</span>
              )}
            </div>
            <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-slate-600 dark:text-white"><X size={20} /></button>
          </div>
        </div>

        {/* Version Selectors */}
        <div className="flex items-center gap-4 p-3 bg-gray-100 dark:bg-slate-700 border-b-2 border-black dark:border-white">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold dark:text-gray-300">Left:</span>
            <select
              value={leftIndex}
              onChange={(e) => setLeftIndex(Number(e.target.value))}
              className="border-2 border-black px-2 py-1 text-sm font-bold dark:bg-slate-600 dark:text-white dark:border-white"
            >
              {planHistory.map((p, i) => (
                <option key={i} value={i}>v{p.version || '1.0'}</option>
              ))}
            </select>
          </div>
          <span className="font-bold dark:text-white">vs</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold dark:text-gray-300">Right:</span>
            <select
              value={rightIndex}
              onChange={(e) => setRightIndex(Number(e.target.value))}
              className="border-2 border-black px-2 py-1 text-sm font-bold dark:bg-slate-600 dark:text-white dark:border-white"
            >
              {planHistory.map((p, i) => (
                <option key={i} value={i}>v{p.version || '1.0'}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Side-by-side SVGs */}
        <div className="flex-1 grid grid-cols-2 gap-0 overflow-auto">
          <div className="border-r border-black dark:border-white p-4 flex items-center justify-center bg-gray-50 dark:bg-slate-900">
            <FloorPlanSvg
              rooms={planHistory[leftIndex].rooms}
              roomOverrides={leftOverrides}
              showDimensions={false}
              showFeatures={false}
            />
          </div>
          <div className="p-4 flex items-center justify-center bg-gray-50 dark:bg-slate-900">
            <FloorPlanSvg
              rooms={planHistory[rightIndex].rooms}
              roomOverrides={rightOverrides}
              showDimensions={false}
              showFeatures={false}
            />
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 p-2 border-t-2 border-black dark:border-white bg-gray-50 dark:bg-slate-700 text-xs font-bold">
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-200 border border-green-600"></div> Added</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-200 border border-red-600"></div> Removed</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-200 border border-yellow-600"></div> Modified</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-white border border-gray-400"></div> Unchanged</div>
        </div>
      </div>
    </div>
  );
};

export default VersionDiffView;

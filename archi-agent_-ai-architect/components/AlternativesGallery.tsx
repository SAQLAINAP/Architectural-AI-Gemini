import React from 'react';
import type { GeneratedPlan } from '../types';
import { X, CheckCircle } from 'lucide-react';
import { NeoButton } from './NeoComponents';
import FloorPlanSvg from './FloorPlanSvg';

interface AlternativesGalleryProps {
  alternatives: GeneratedPlan[];
  onSelect: (index: number) => void;
  onClose: () => void;
}

const strategyLabels = [
  'Natural Light & Ventilation',
  'Privacy & Zone Separation',
  'Open-Plan Living',
];

const AlternativesGallery: React.FC<AlternativesGalleryProps> = ({ alternatives, onSelect, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 border-2 border-black dark:border-white shadow-neo dark:shadow-neoDark w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-black dark:border-white">
          <h2 className="text-xl font-black dark:text-white">Alternative Designs</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-slate-600 dark:text-white"><X size={20} /></button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {alternatives.map((alt, idx) => {
              const roomCount = alt.rooms.filter(r => r.type === 'room' || r.type === 'service').length;
              const coverage = Math.round(alt.plotCoverageRatio * 100);
              const costMin = alt.totalCostRange?.min?.toLocaleString() || '—';
              const costMax = alt.totalCostRange?.max?.toLocaleString() || '—';
              const currency = alt.totalCostRange?.currency || 'INR';

              return (
                <div key={idx} className="border-2 border-black dark:border-white bg-white dark:bg-slate-700 flex flex-col">
                  {/* Strategy Label */}
                  <div className="bg-gray-100 dark:bg-slate-600 px-3 py-2 border-b-2 border-black dark:border-white">
                    <span className="text-xs font-bold uppercase text-gray-600 dark:text-gray-300">
                      Strategy {idx + 1}: {strategyLabels[idx] || `Variant ${idx + 1}`}
                    </span>
                  </div>

                  {/* Miniature SVG */}
                  <div className="p-3 flex-1 min-h-[200px] flex items-center justify-center bg-gray-50 dark:bg-slate-800">
                    <FloorPlanSvg
                      rooms={alt.rooms}
                      showDimensions={false}
                      showFeatures={false}
                    />
                  </div>

                  {/* Stats */}
                  <div className="p-3 border-t-2 border-black dark:border-white space-y-2">
                    <div className="flex justify-between text-xs font-bold dark:text-white">
                      <span>Rooms: {roomCount}</span>
                      <span>Coverage: {coverage}%</span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      Cost: {currency} {costMin} - {costMax}
                    </div>
                    <NeoButton
                      onClick={() => onSelect(idx)}
                      className="w-full bg-neo-primary hover:bg-yellow-400 text-black text-sm py-2"
                    >
                      <CheckCircle size={14} /> Select This Design
                    </NeoButton>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlternativesGallery;

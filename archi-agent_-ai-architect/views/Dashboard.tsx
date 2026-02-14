
import React, { useState, useRef } from 'react';
import { GeneratedPlan, ViewState, Room, WallFeature, ModificationAnalysis, ProjectConfig, ChatMessage, FurnitureItem } from '../types';
import { NeoButton, NeoCard } from '../components/NeoComponents';
import { ArrowLeft, Download, AlertTriangle, CheckCircle, XCircle, Layers, Maximize2, ZoomIn, ZoomOut, Sparkles, Save, Grid, Ruler, Lightbulb, Info, FileText, RefreshCw, MessageSquare, Send, ThumbsUp, ThumbsDown, Clock, ChevronDown, Image, FileDown, GitCompare, Sofa, Wand2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { exportSvgAsPng, exportPlanAsPdf } from '../utils/exportUtils';
import FloorPlanSvg from '../components/FloorPlanSvg';
import ChatPanel from '../components/ChatPanel';
import VersionDiffView from '../components/VersionDiffView';
import AlternativesGallery from '../components/AlternativesGallery';

interface DashboardProps {
  plan: GeneratedPlan | null;
  config?: ProjectConfig | null;
  onSave?: () => void;
  onRegenerate?: () => void;
  onAnalyzeModification?: (request: string) => Promise<ModificationAnalysis>;
  onApplyModification?: (request: string) => Promise<void>;
  isProcessing?: boolean;
  planHistory?: GeneratedPlan[];
  currentPlanIndex?: number;
  onVersionChange?: (index: number) => void;
  alternatives?: GeneratedPlan[];
  onGenerateAlternatives?: () => void;
  onSelectAlternative?: (index: number) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ plan, config, onSave, onRegenerate, onAnalyzeModification, onApplyModification, isProcessing, planHistory, currentPlanIndex, onVersionChange, alternatives, onGenerateAlternatives, onSelectAlternative }) => {
  const [activeTab, setActiveTab] = useState<'PLAN' | 'BOM'>('PLAN');
  const [zoom, setZoom] = useState(1);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Measurement Tool State
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<{ x: number, y: number }[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  // Export Menu State
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Diff View State
  const [diffMode, setDiffMode] = useState(false);

  // Furniture Toggle State
  const [showFurniture, setShowFurniture] = useState(true);

  // Multi-floor State
  const [activeFloor, setActiveFloor] = useState(0);

  // Alternatives Gallery State
  const [showAlternatives, setShowAlternatives] = useState(false);

  if (!plan) return <div>No plan data available.</div>;

  // Determine which rooms to show based on active floor
  const displayRooms = plan.floors && plan.floors.length > 1
    ? plan.floors[activeFloor]?.rooms || plan.rooms
    : plan.rooms;

  // Derive selected room
  const selectedRoom = displayRooms.find(r => r.id === selectedRoomId);

  const handleSvgClick = (e: React.MouseEvent) => {
    if (!isMeasuring || !svgRef.current) return;

    // Convert screen coordinates to SVG coordinates
    const point = svgRef.current.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const cursor = point.matrixTransform(svgRef.current.getScreenCTM()?.inverse());

    setMeasurePoints(prev => {
      if (prev.length >= 2) return [{ x: cursor.x, y: cursor.y }];
      return [...prev, { x: cursor.x, y: cursor.y }];
    });
  };

  const renderMeasurementOverlay = () => {
    if (measurePoints.length === 0) return null;
    return (
      <g pointerEvents="none">
        {measurePoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={0.3} fill="#a388ee" stroke="black" strokeWidth={0.05} />
        ))}
        {measurePoints.length === 2 && (
          <>
            <line
              x1={measurePoints[0].x} y1={measurePoints[0].y}
              x2={measurePoints[1].x} y2={measurePoints[1].y}
              stroke="#a388ee" strokeWidth={0.1} strokeDasharray="0.2 0.2"
            />
            <text
              x={(measurePoints[0].x + measurePoints[1].x) / 2}
              y={(measurePoints[0].y + measurePoints[1].y) / 2 - 0.5}
              textAnchor="middle"
              fontSize="0.5"
              fill="#000"
              fontWeight="bold"
              className="bg-white"
              style={{ textShadow: '2px 2px 0px white' }}
            >
              {Math.sqrt(Math.pow(measurePoints[1].x - measurePoints[0].x, 2) + Math.pow(measurePoints[1].y - measurePoints[0].y, 2)).toFixed(2)}m
            </text>
          </>
        )}
      </g>
    );
  };

  return (
    <>
    {/* Diff View Modal */}
    {diffMode && planHistory && planHistory.length >= 2 && (
      <VersionDiffView
        planHistory={planHistory}
        onClose={() => setDiffMode(false)}
      />
    )}

    {/* Alternatives Gallery Modal */}
    {showAlternatives && alternatives && alternatives.length > 0 && onSelectAlternative && (
      <AlternativesGallery
        alternatives={alternatives}
        onSelect={(idx) => { onSelectAlternative(idx); setShowAlternatives(false); }}
        onClose={() => setShowAlternatives(false)}
      />
    )}

    <div className="flex flex-col h-full overflow-hidden dark:bg-slate-900 transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b-4 border-black dark:border-white p-4 flex flex-wrap justify-between items-center z-10 shadow-md gap-4">
        <div className="flex items-center gap-4">
          <NeoButton onClick={() => navigate('/configure')} variant="secondary" className="px-3 py-2 text-sm">
            <ArrowLeft size={16} /> Edit Inputs
          </NeoButton>
          <h1 className="text-xl md:text-2xl font-black hidden sm:block dark:text-white">
            {plan.imageUrl ? 'PLAN REPORT' : 'GENERATED LAYOUT'}
          </h1>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {!plan.imageUrl && (
            <div className="hidden md:flex px-4 py-2 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-100 border-2 border-black dark:border-white font-bold text-sm items-center gap-2">
              <Grid size={16} /> Coverage: {Math.round(plan.plotCoverageRatio * 100)}%
            </div>
          )}
          {onSave && (
            <NeoButton className="px-4 py-2 text-sm bg-blue-200 hover:bg-blue-300 dark:text-black" onClick={onSave}>
              <Save size={16} /> Save
            </NeoButton>
          )}
          {onRegenerate && (
            <NeoButton className="px-4 py-2 text-sm bg-purple-200 hover:bg-purple-300 dark:text-black" onClick={onRegenerate} disabled={isProcessing}>
              <RefreshCw size={16} className={isProcessing ? "animate-spin" : ""} /> Regenerate
            </NeoButton>
          )}
          {onGenerateAlternatives && (
            <NeoButton className="px-4 py-2 text-sm bg-indigo-200 hover:bg-indigo-300 dark:text-black" onClick={() => { onGenerateAlternatives(); setShowAlternatives(true); }} disabled={isProcessing}>
              <Wand2 size={16} /> Alternatives
            </NeoButton>
          )}
          <div className="relative">
            <NeoButton className="px-4 py-2 text-sm dark:bg-slate-700 dark:text-white" onClick={() => setShowExportMenu(!showExportMenu)}>
              <Download size={16} /> Export <ChevronDown size={14} />
            </NeoButton>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-700 border-2 border-black dark:border-white shadow-neo dark:shadow-neoDark z-30 min-w-[180px]">
                <button
                  className="w-full px-4 py-2 text-sm font-bold text-left hover:bg-gray-100 dark:hover:bg-slate-600 dark:text-white flex items-center gap-2"
                  onClick={() => { if (svgRef.current) exportSvgAsPng(svgRef.current); setShowExportMenu(false); }}
                >
                  <Image size={14} /> Download PNG
                </button>
                <button
                  className="w-full px-4 py-2 text-sm font-bold text-left hover:bg-gray-100 dark:hover:bg-slate-600 dark:text-white flex items-center gap-2"
                  onClick={() => { if (svgRef.current) exportPlanAsPdf(svgRef.current, plan, config); setShowExportMenu(false); }}
                >
                  <FileDown size={14} /> Download PDF Report
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Version Bar */}
      {planHistory && planHistory.length > 1 && onVersionChange && (
        <div className="bg-gray-200 dark:bg-slate-700 px-4 py-1 flex items-center gap-2 overflow-x-auto border-b-2 border-black dark:border-white">
          <span className="text-xs font-bold uppercase dark:text-gray-300">Versions:</span>
          {planHistory.map((p, idx) => (
            <button
              key={idx}
              onClick={() => onVersionChange(idx)}
              className={`px-2 py-0.5 text-xs font-bold rounded-full border border-black transition-colors ${idx === currentPlanIndex
                ? 'bg-neo-primary text-black'
                : 'bg-white dark:bg-slate-600 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-500'
                }`}
            >
              v{p.version || "1.0"}
            </button>
          ))}
          {planHistory.length >= 2 && (
            <button
              onClick={() => setDiffMode(true)}
              className="ml-2 px-2 py-0.5 text-xs font-bold border border-black bg-orange-200 hover:bg-orange-300 rounded-full flex items-center gap-1"
            >
              <GitCompare size={12} /> Compare
            </button>
          )}
        </div>
      )}

      {/* Floor Tabs */}
      {plan.floors && plan.floors.length > 1 && (
        <div className="bg-gray-100 dark:bg-slate-800 px-4 py-1 flex items-center gap-2 border-b-2 border-black dark:border-white">
          <span className="text-xs font-bold uppercase dark:text-gray-300">Floors:</span>
          {plan.floors.map((f, idx) => (
            <button
              key={idx}
              onClick={() => setActiveFloor(idx)}
              className={`px-3 py-0.5 text-xs font-bold border border-black transition-colors ${idx === activeFloor
                ? 'bg-blue-400 text-black'
                : 'bg-white dark:bg-slate-600 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-500'
                }`}
            >
              {f.floorLabel}
            </button>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

        <div className="flex-1 bg-gray-100 dark:bg-slate-900 p-4 md:p-6 overflow-auto flex flex-col gap-4 relative">

          {/* Plan View */}
          <div className="flex flex-col gap-6">
            <div className="flex-1 bg-white dark:bg-slate-800 border-2 border-black dark:border-white shadow-neo dark:shadow-neoDark relative overflow-hidden flex items-center justify-center p-4 md:p-8 min-h-[500px]">

              {/* Image View for Uploads */}
              {plan.imageUrl && (
                <div className="w-full h-full flex items-center justify-center overflow-auto">
                  <img src={plan.imageUrl} alt="Uploaded Plan" className="max-w-full max-h-full border-2 border-black" />
                </div>
              )}

              {/* Vector View for Generated Plans */}
              {!plan.imageUrl && (
                <>
                  <div className="absolute top-4 right-4 flex flex-col gap-2 bg-white dark:bg-slate-700 border-2 border-black dark:border-white p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] z-20">
                    <button title="Zoom In" onClick={() => setZoom(z => Math.min(z + 0.2, 3))} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-600 dark:text-white"><ZoomIn size={20} /></button>
                    <button title="Zoom Out" onClick={() => setZoom(z => Math.max(z - 0.2, 0.5))} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-600 dark:text-white"><ZoomOut size={20} /></button>
                    <button title="Reset Zoom" onClick={() => setZoom(1)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-600 dark:text-white"><Maximize2 size={20} /></button>
                    <div className="h-px bg-black dark:bg-white my-1"></div>
                    <button
                      title="Measurement Tool"
                      onClick={() => { setIsMeasuring(!isMeasuring); setMeasurePoints([]); }}
                      className={`p-2 hover:bg-gray-100 dark:hover:bg-slate-600 dark:text-white ${isMeasuring ? 'bg-neo-primary text-black' : ''}`}
                    >
                      <Ruler size={20} />
                    </button>
                    {plan.furniture && plan.furniture.length > 0 && (
                      <>
                        <div className="h-px bg-black dark:bg-white my-1"></div>
                        <button
                          title="Toggle Furniture"
                          onClick={() => setShowFurniture(!showFurniture)}
                          className={`p-2 hover:bg-gray-100 dark:hover:bg-slate-600 dark:text-white ${showFurniture ? 'bg-amber-200 text-black' : ''}`}
                        >
                          <Sofa size={20} />
                        </button>
                      </>
                    )}
                  </div>

                  <div style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s' }} className="w-full h-full flex items-center justify-center cursor-crosshair">
                    <FloorPlanSvg
                      rooms={displayRooms}
                      svgRef={svgRef}
                      onRoomClick={(roomId) => { if (!isMeasuring) setSelectedRoomId(roomId); }}
                      selectedRoomId={selectedRoomId}
                      furniture={plan.furniture}
                      showFurniture={showFurniture}
                      onSvgClick={handleSvgClick}
                      measurementOverlay={renderMeasurementOverlay()}
                      isMeasuring={isMeasuring}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Checks Section - Moved below floor plan */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Regulatory Compliance */}
              <NeoCard>
                <h3 className="font-black text-lg mb-2 flex items-center gap-2 dark:text-white">
                  <AlertTriangle size={20} className="text-neo-secondary" /> Regulatory Check
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {plan.compliance.regulatory.map((item, idx) => (
                    <div key={idx} className={`p-3 border-2 border-black dark:border-gray-500 text-sm ${item.status === 'PASS' ? 'bg-green-100 dark:bg-green-900/30' : item.status === 'WARN' ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                      <div className="flex items-center justify-between font-bold mb-1 dark:text-white">
                        <span>{item.rule}</span>
                        {item.status === 'PASS' ? <CheckCircle size={16} className="text-green-600" /> : <AlertTriangle size={16} className={item.status === 'WARN' ? 'text-yellow-600' : 'text-red-600'} />}
                      </div>
                      <p className="dark:text-gray-200">{item.message}</p>
                      {item.recommendation && (
                        <p className="mt-1 text-xs italic text-gray-600 dark:text-gray-400">💡 Fix: {item.recommendation}</p>
                      )}
                    </div>
                  ))}
                </div>
              </NeoCard>

              {/* Cultural Compliance */}
              <NeoCard>
                <h3 className="font-black text-lg mb-2 flex items-center gap-2 dark:text-white">
                  <Sparkles size={20} className="text-neo-accent" /> Cultural Check
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {plan.compliance.cultural.map((item, idx) => (
                    <div key={idx} className={`p-3 border-2 border-black dark:border-gray-500 text-sm ${item.status === 'PASS' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
                      <div className="flex items-center justify-between font-bold mb-1 dark:text-white">
                        <span>{item.rule}</span>
                        {item.status === 'PASS' ? <CheckCircle size={16} className="text-green-600" /> : <AlertTriangle size={16} className="text-orange-600" />}
                      </div>
                      <p className="dark:text-gray-200">{item.message}</p>
                    </div>
                  ))}
                </div>
              </NeoCard>
            </div>
          </div>

          {/* Chat Modification Panel */}
          {!plan.imageUrl && onAnalyzeModification && (
            <ChatPanel
              plan={plan}
              onAnalyzeModification={onAnalyzeModification}
              onApplyModification={onApplyModification}
              isProcessing={isProcessing}
            />
          )}
        </div>

        {/* Right Sidebar: Details Only */}
        <div className="w-full lg:w-96 bg-white dark:bg-slate-800 lg:border-l-4 border-t-4 lg:border-t-0 border-black dark:border-white flex flex-col lg:h-full overflow-hidden">

          {/* Room Info Panel */}
          {selectedRoom && !plan.imageUrl && activeTab === 'PLAN' && (
            <div className="p-4 border-b-4 border-black dark:border-white bg-yellow-50 dark:bg-yellow-900/30 animate-in fade-in slide-in-from-right-10 dark:text-white">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-black text-lg uppercase">{selectedRoom.name}</h3>
                <button onClick={() => setSelectedRoomId(null)} className="hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black p-1"><XCircle size={16} /></button>
              </div>
              <div className="space-y-2 text-sm">
                <p><span className="font-bold">Type:</span> {selectedRoom.type}</p>
                <p><span className="font-bold">Dimensions:</span> {selectedRoom.width}m x {selectedRoom.height}m</p>
                <p><span className="font-bold">Area:</span> {(selectedRoom.width * selectedRoom.height).toFixed(2)} m²</p>

                {/* Guidance Section */}
                {selectedRoom.guidance && (
                  <div className="mt-2 p-3 bg-white dark:bg-slate-700 border-2 border-black dark:border-gray-500 rounded-none shadow-[2px_2px_0px_0px_#a388ee]">
                    <div className="flex items-center gap-2 font-bold text-neo-primary dark:text-yellow-300 mb-1">
                      <Info size={14} /> Design & Vaastu Advice
                    </div>
                    <p className="italic text-gray-700 dark:text-gray-200">{selectedRoom.guidance}</p>
                  </div>
                )}

                {selectedRoom.features && selectedRoom.features.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-black/20 dark:border-white/20">
                    <span className="font-bold block mb-1">Features:</span>
                    <ul className="list-disc pl-4">
                      {selectedRoom.features.map((f, i) => (
                        <li key={i}>{f.type} ({f.width}m) on {f.wall} wall</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="p-4 flex-1 overflow-auto space-y-6">
            {/* Design Log */}
            {plan.designLog && plan.designLog.length > 0 && (
              <div>
                <h3 className="font-black text-lg mb-2 flex items-center gap-2 dark:text-white">
                  <FileText size={20} className="text-neo-primary" /> Architect's Log
                </h3>
                <div className="bg-gray-100 dark:bg-slate-700 p-3 text-sm text-gray-700 dark:text-gray-200 border-l-4 border-neo-primary space-y-2">
                  {plan.designLog.map((log, i) => (
                    <p key={i}>• {log}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default Dashboard;

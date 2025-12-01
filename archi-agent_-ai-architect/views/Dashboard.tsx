
import React, { useState, useRef } from 'react';
import { GeneratedPlan, ViewState, Room, WallFeature, ModificationAnalysis } from '../types';
import { NeoButton, NeoCard } from '../components/NeoComponents';
import { ArrowLeft, Download, AlertTriangle, CheckCircle, XCircle, Layers, Maximize2, ZoomIn, ZoomOut, Sparkles, Save, Grid, Ruler, Lightbulb, Info, FileText, RefreshCw, MessageSquare, Send, ThumbsUp, ThumbsDown, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

import { useNavigate } from 'react-router-dom';

interface DashboardProps {
  plan: GeneratedPlan | null;
  onSave?: () => void;
  onRegenerate?: () => void;
  onAnalyzeModification?: (request: string) => Promise<ModificationAnalysis>;
  onApplyModification?: (request: string) => Promise<void>;
  isProcessing?: boolean;
  planHistory?: GeneratedPlan[];
  currentPlanIndex?: number;
  onVersionChange?: (index: number) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ plan, onSave, onRegenerate, onAnalyzeModification, onApplyModification, isProcessing, planHistory, currentPlanIndex, onVersionChange }) => {
  const [activeTab, setActiveTab] = useState<'PLAN' | 'BOM'>('PLAN');
  const [zoom, setZoom] = useState(1);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Measurement Tool State
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<{ x: number, y: number }[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  // Modification State
  const [modRequest, setModRequest] = useState("");
  const [modAnalysis, setModAnalysis] = useState<ModificationAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  if (!plan) return <div>No plan data available.</div>;

  const handleAnalyze = async () => {
    if (!modRequest.trim() || !onAnalyzeModification) return;
    setIsAnalyzing(true);
    setModAnalysis(null);
    try {
      const result = await onAnalyzeModification(modRequest);
      setModAnalysis(result);
    } catch (e) {
      console.error(e);
      alert("Analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApply = async () => {
    if (!modAnalysis || !onApplyModification) return;
    await onApplyModification(modAnalysis.originalRequest);
    setModRequest("");
    setModAnalysis(null);
  };

  if (!plan) return <div>No plan data available.</div>;

  // Derive selected room
  const selectedRoom = plan.rooms.find(r => r.id === selectedRoomId);

  // SVG Bounds logic
  const maxX = plan.rooms.length > 0 ? Math.max(...plan.rooms.map(r => r.x + r.width)) : 20;
  const maxY = plan.rooms.length > 0 ? Math.max(...plan.rooms.map(r => r.y + r.height)) : 20;

  const WALL_THICKNESS = 0.2;

  const getZoneStyle = (type: Room['type'], isSelected: boolean) => {
    const isBuilt = ['room', 'circulation', 'service'].includes(type);

    // High contrast styling
    const strokeColor = isSelected ? '#a388ee' : 'black';
    const strokeWidth = isSelected ? 0.3 : (isBuilt ? WALL_THICKNESS : 0.05);
    const strokeDash = isBuilt ? 'none' : '0.2 0.2';

    let fill = 'white';

    switch (type) {
      case 'circulation':
        fill = '#f3f4f6'; // Light gray
        break;
      case 'service':
        fill = '#e2e8f0'; // Darker gray
        break;
      case 'outdoor':
        fill = 'url(#outdoorPattern)';
        break;
      case 'setback':
        fill = 'url(#setbackPattern)';
        break;
      case 'room':
      default:
        fill = 'white';
        break;
    }

    return {
      fill,
      stroke: strokeColor,
      strokeWidth,
      strokeDasharray: strokeDash,
      opacity: isBuilt ? 1 : 0.8
    };
  };

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

  const renderFeature = (room: Room, feature: WallFeature, index: number) => {
    let cx = 0, cy = 0, rot = 0;
    const featWidth = feature.width || 0.9;

    if (feature.wall === 'top') {
      cx = room.x + (room.width * feature.position);
      cy = room.y;
      rot = 0;
    } else if (feature.wall === 'bottom') {
      cx = room.x + (room.width * feature.position);
      cy = room.y + room.height;
      rot = 180;
    } else if (feature.wall === 'left') {
      cx = room.x;
      cy = room.y + (room.height * feature.position);
      rot = 270;
    } else if (feature.wall === 'right') {
      cx = room.x + room.width;
      cy = room.y + (room.height * feature.position);
      rot = 90;
    }

    const transform = `translate(${cx}, ${cy}) rotate(${rot}) translate(${-featWidth / 2}, ${-WALL_THICKNESS / 2})`;

    if (room.type === 'outdoor' || room.type === 'setback') return null;

    if (feature.type === 'door') {
      return (
        <g key={`${room.id}-feat-${index}`} transform={transform}>
          {/* White background to hide wall line */}
          <rect x={-0.05} y={-0.05} width={featWidth + 0.1} height={WALL_THICKNESS + 0.1} fill="white" />
          {/* Door Arc */}
          <path d={`M 0 ${WALL_THICKNESS} A ${featWidth} ${featWidth} 0 0 1 ${featWidth} ${WALL_THICKNESS - featWidth}`} fill="none" stroke="black" strokeWidth="0.05" />
          {/* Door Leaf */}
          <line x1={0} y1={WALL_THICKNESS} x2={0} y2={WALL_THICKNESS - featWidth} stroke="black" strokeWidth="0.08" />
        </g>
      );
    } else if (feature.type === 'window') {
      return (
        <g key={`${room.id}-feat-${index}`} transform={transform}>
          <rect x={0} y={0} width={featWidth} height={WALL_THICKNESS} fill="white" stroke="none" />
          {/* Window Jambs */}
          <line x1={0} y1={0} x2={0} y2={WALL_THICKNESS} stroke="black" strokeWidth="0.08" />
          <line x1={featWidth} y1={0} x2={featWidth} y2={WALL_THICKNESS} stroke="black" strokeWidth="0.08" />
          {/* Glass panes */}
          <line x1={0} y1={WALL_THICKNESS * 0.35} x2={featWidth} y2={WALL_THICKNESS * 0.35} stroke="black" strokeWidth="0.03" />
          <line x1={0} y1={WALL_THICKNESS * 0.65} x2={featWidth} y2={WALL_THICKNESS * 0.65} stroke="black" strokeWidth="0.03" />
        </g>
      );
    }
    return null;
  };

  return (
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
          <NeoButton className="px-4 py-2 text-sm dark:bg-slate-700 dark:text-white" onClick={() => window.print()}>
            <Download size={16} /> Export
          </NeoButton>
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
                  </div>

                  <div style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s' }} className="w-full h-full flex items-center justify-center cursor-crosshair">
                    <svg
                      ref={svgRef}
                      viewBox={`-2 -2 ${maxX + 4} ${maxY + 4}`}
                      className="max-w-full max-h-full shadow-lg bg-white"
                      onClick={handleSvgClick}
                    >
                      <defs>
                        <pattern id="grid" width="1" height="1" patternUnits="userSpaceOnUse">
                          <path d="M 1 0 L 0 0 0 1" fill="none" stroke="#f0f0f0" strokeWidth="0.05" />
                        </pattern>
                        {/* Setback Pattern: Diagonal Lines */}
                        <pattern id="setbackPattern" width="0.5" height="0.5" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                          <rect width="0.5" height="0.5" fill="#f8fafc" />
                          <line x1="0" y1="0" x2="0" y2="0.5" stroke="#cbd5e1" strokeWidth="0.05" />
                        </pattern>
                        {/* Outdoor Pattern: Dots/Grass-like */}
                        <pattern id="outdoorPattern" width="0.5" height="0.5" patternUnits="userSpaceOnUse">
                          <rect width="0.5" height="0.5" fill="#f0fdf4" />
                          <circle cx="0.1" cy="0.1" r="0.05" fill="#bbf7d0" />
                          <circle cx="0.35" cy="0.35" r="0.05" fill="#bbf7d0" />
                        </pattern>
                      </defs>

                      <rect x={-2} y={-2} width={maxX + 4} height={maxY + 4} fill="white" />
                      <rect width="100%" height="100%" fill="url(#grid)" />

                      {/* Render Zones sorted so small rooms are on top of large zones if any overlap, though they shouldn't */}
                      {plan.rooms
                        .sort((a, b) => (a.type === 'setback' ? -1 : 1))
                        .map((room) => {
                          const isSelected = selectedRoomId === room.id;
                          const style = getZoneStyle(room.type, isSelected);
                          return (
                            <g
                              key={room.id}
                              onClick={(e) => {
                                if (!isMeasuring) {
                                  e.stopPropagation();
                                  setSelectedRoomId(room.id);
                                }
                              }}
                              className={!isMeasuring ? "cursor-pointer hover:opacity-90" : ""}
                            >
                              <rect
                                x={room.x}
                                y={room.y}
                                width={room.width}
                                height={room.height}
                                fill={style.fill}
                                stroke={style.stroke}
                                strokeWidth={style.strokeWidth}
                                strokeDasharray={style.strokeDasharray}
                                opacity={style.opacity}
                              />
                              {room.features && room.features.map((feature, idx) => renderFeature(room, feature, idx))}

                              {/* Room Label */}
                              <text
                                x={room.x + room.width / 2}
                                y={room.y + room.height / 2 - 0.15}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fontSize={room.type === 'room' ? "0.25" : "0.20"}
                                fontWeight={room.type === 'room' ? 'bold' : 'normal'}
                                fill={room.type === 'outdoor' ? '#166534' : room.type === 'setback' ? '#94a3b8' : 'black'}
                                className="uppercase tracking-wider pointer-events-none select-none"
                                style={{ textShadow: '0px 0px 2px white' }}
                              >
                                {room.name}
                              </text>
                              {/* Dimensions in Plan */}
                              <text
                                x={room.x + room.width / 2}
                                y={room.y + room.height / 2 + 0.25}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fontSize="0.18"
                                fill="black"
                                className="pointer-events-none select-none"
                                style={{ textShadow: '0px 0px 2px white' }}
                              >
                                {room.width}m x {room.height}m
                              </text>
                            </g>
                          );
                        })}

                      {/* Measurement Overlay */}
                      {renderMeasurementOverlay()}

                      {/* Overall Dimensions */}
                      <g transform={`translate(0, ${maxY + 1})`}>
                        <line x1={0} y1={0} x2={maxX} y2={0} stroke="black" strokeWidth="0.05" />
                        <line x1={0} y1={-0.2} x2={0} y2={0.2} stroke="black" strokeWidth="0.05" />
                        <line x1={maxX} y1={-0.2} x2={maxX} y2={0.2} stroke="black" strokeWidth="0.05" />
                        <text x={maxX / 2} y={-0.3} textAnchor="middle" fontSize="0.3" fontFamily="monospace">
                          PLOT WIDTH: {maxX}m
                        </text>
                      </g>
                    </svg>
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

          {/* AI Modification Assistant */}
          {!plan.imageUrl && onAnalyzeModification && (
            <NeoCard className="border-t-4 border-neo-primary">
              <h3 className="font-black text-lg mb-4 flex items-center gap-2 dark:text-white">
                <MessageSquare size={20} className="text-neo-primary" /> AI Modification Assistant
              </h3>

              <div className="flex gap-2 mb-4">
                <input
                  className="flex-1 p-3 border-2 border-black dark:border-white bg-white dark:bg-slate-800 dark:text-white focus:outline-none"
                  placeholder="Describe a change (e.g., 'Move the kitchen to the North side')..."
                  value={modRequest}
                  onChange={(e) => setModRequest(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                  disabled={isProcessing || isAnalyzing}
                />
                <NeoButton onClick={handleAnalyze} disabled={!modRequest.trim() || isProcessing || isAnalyzing}>
                  {isAnalyzing ? <RefreshCw className="animate-spin" /> : <Send size={20} />}
                </NeoButton>
              </div>

              {modAnalysis && (
                <div className="bg-gray-50 dark:bg-slate-700 p-4 border-2 border-black dark:border-gray-500 animate-in fade-in slide-in-from-top-2">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-lg dark:text-white">Analysis Result</h4>
                    <span className={`px-2 py-1 text-xs font-bold border border-black ${modAnalysis.feasibility === 'FEASIBLE' ? 'bg-green-200 text-green-900' :
                      modAnalysis.feasibility === 'CAUTION' ? 'bg-yellow-200 text-yellow-900' : 'bg-red-200 text-red-900'
                      }`}>
                      {modAnalysis.feasibility}
                    </span>
                  </div>

                  <p className="text-sm mb-3 dark:text-gray-200">{modAnalysis.analysis}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                    <div className="bg-white dark:bg-slate-800 p-2 border border-gray-200 dark:border-gray-600">
                      <strong className="block text-neo-secondary mb-1">Vastu Impact</strong>
                      <p className="dark:text-gray-300">{modAnalysis.vastuImplications}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-2 border border-gray-200 dark:border-gray-600">
                      <strong className="block text-neo-accent mb-1">Regulatory Impact</strong>
                      <p className="dark:text-gray-300">{modAnalysis.regulatoryImplications}</p>
                    </div>
                  </div>

                  {modAnalysis.suggestion && (
                    <div className="flex items-start gap-2 text-sm bg-blue-50 dark:bg-blue-900/30 p-2 mb-4">
                      <Lightbulb size={16} className="text-blue-600 shrink-0 mt-1" />
                      <p className="dark:text-blue-100"><span className="font-bold">Suggestion:</span> {modAnalysis.suggestion}</p>
                    </div>
                  )}

                  {modAnalysis.feasibility !== 'NOT_RECOMMENDED' && (
                    <div className="flex justify-end">
                      <NeoButton onClick={handleApply} className="bg-green-500 hover:bg-green-600 text-white border-green-700" disabled={isProcessing}>
                        {isProcessing ? 'Applying...' : 'Yes, Apply Changes'}
                      </NeoButton>
                    </div>
                  )}
                </div>
              )}
            </NeoCard>
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
  );
};

export default Dashboard;

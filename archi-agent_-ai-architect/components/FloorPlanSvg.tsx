import React from 'react';
import type { Room, WallFeature, FurnitureItem } from '../types';

interface FloorPlanSvgProps {
  rooms: Room[];
  svgRef?: React.RefObject<SVGSVGElement>;
  onRoomClick?: (roomId: string) => void;
  selectedRoomId?: string | null;
  roomOverrides?: Map<string, { fill: string; stroke: string }>;
  furniture?: FurnitureItem[];
  showFurniture?: boolean;
  showDimensions?: boolean;
  showFeatures?: boolean;
  onSvgClick?: (e: React.MouseEvent) => void;
  measurementOverlay?: React.ReactNode;
  isMeasuring?: boolean;
}

const WALL_THICKNESS = 0.2;

function getZoneStyle(type: Room['type'], isSelected: boolean, override?: { fill: string; stroke: string }) {
  if (override) {
    return {
      fill: override.fill,
      stroke: override.stroke,
      strokeWidth: 0.15,
      strokeDasharray: 'none',
      opacity: 1,
    };
  }

  const isBuilt = ['room', 'circulation', 'service'].includes(type);
  const strokeColor = isSelected ? '#a388ee' : 'black';
  const strokeWidth = isSelected ? 0.3 : (isBuilt ? WALL_THICKNESS : 0.05);
  const strokeDash = isBuilt ? 'none' : '0.2 0.2';

  let fill = 'white';
  switch (type) {
    case 'circulation': fill = '#f3f4f6'; break;
    case 'service': fill = '#e2e8f0'; break;
    case 'outdoor': fill = 'url(#outdoorPattern)'; break;
    case 'setback': fill = 'url(#setbackPattern)'; break;
    default: fill = 'white'; break;
  }

  return { fill, stroke: strokeColor, strokeWidth, strokeDasharray: strokeDash, opacity: isBuilt ? 1 : 0.8 };
}

function renderFeature(room: Room, feature: WallFeature, index: number) {
  let cx = 0, cy = 0, rot = 0;
  const featWidth = feature.width || 0.9;

  if (feature.wall === 'top') { cx = room.x + (room.width * feature.position); cy = room.y; rot = 0; }
  else if (feature.wall === 'bottom') { cx = room.x + (room.width * feature.position); cy = room.y + room.height; rot = 180; }
  else if (feature.wall === 'left') { cx = room.x; cy = room.y + (room.height * feature.position); rot = 270; }
  else if (feature.wall === 'right') { cx = room.x + room.width; cy = room.y + (room.height * feature.position); rot = 90; }

  const transform = `translate(${cx}, ${cy}) rotate(${rot}) translate(${-featWidth / 2}, ${-WALL_THICKNESS / 2})`;

  if (room.type === 'outdoor' || room.type === 'setback') return null;

  if (feature.type === 'door') {
    return (
      <g key={`${room.id}-feat-${index}`} transform={transform}>
        <rect x={-0.05} y={-0.05} width={featWidth + 0.1} height={WALL_THICKNESS + 0.1} fill="white" />
        <path d={`M 0 ${WALL_THICKNESS} A ${featWidth} ${featWidth} 0 0 1 ${featWidth} ${WALL_THICKNESS - featWidth}`} fill="none" stroke="black" strokeWidth="0.05" />
        <line x1={0} y1={WALL_THICKNESS} x2={0} y2={WALL_THICKNESS - featWidth} stroke="black" strokeWidth="0.08" />
      </g>
    );
  } else if (feature.type === 'window') {
    return (
      <g key={`${room.id}-feat-${index}`} transform={transform}>
        <rect x={0} y={0} width={featWidth} height={WALL_THICKNESS} fill="white" stroke="none" />
        <line x1={0} y1={0} x2={0} y2={WALL_THICKNESS} stroke="black" strokeWidth="0.08" />
        <line x1={featWidth} y1={0} x2={featWidth} y2={WALL_THICKNESS} stroke="black" strokeWidth="0.08" />
        <line x1={0} y1={WALL_THICKNESS * 0.35} x2={featWidth} y2={WALL_THICKNESS * 0.35} stroke="black" strokeWidth="0.03" />
        <line x1={0} y1={WALL_THICKNESS * 0.65} x2={featWidth} y2={WALL_THICKNESS * 0.65} stroke="black" strokeWidth="0.03" />
      </g>
    );
  }
  return null;
}

const furnitureColors: Record<string, string> = {
  bed: '#93c5fd',
  sofa: '#fbbf24',
  table: '#c084fc',
  desk: '#c084fc',
  chair: '#a78bfa',
  wardrobe: '#6b7280',
  cabinet: '#6b7280',
  sink: '#67e8f9',
  toilet: '#d1d5db',
  shower: '#67e8f9',
  stove: '#f87171',
  refrigerator: '#d1d5db',
  washing_machine: '#d1d5db',
};

function getFurnitureColor(type: string): string {
  const lower = type.toLowerCase();
  for (const [key, color] of Object.entries(furnitureColors)) {
    if (lower.includes(key)) return color;
  }
  return '#d1fae5';
}

const FloorPlanSvg: React.FC<FloorPlanSvgProps> = ({
  rooms,
  svgRef,
  onRoomClick,
  selectedRoomId,
  roomOverrides,
  furniture,
  showFurniture = true,
  showDimensions = true,
  showFeatures = true,
  onSvgClick,
  measurementOverlay,
  isMeasuring,
}) => {
  const maxX = rooms.length > 0 ? Math.max(...rooms.map(r => r.x + r.width)) : 20;
  const maxY = rooms.length > 0 ? Math.max(...rooms.map(r => r.y + r.height)) : 20;

  return (
    <svg
      ref={svgRef as any}
      viewBox={`-2 -2 ${maxX + 4} ${maxY + 4}`}
      className="max-w-full max-h-full shadow-lg bg-white"
      onClick={onSvgClick}
    >
      <defs>
        <pattern id="grid" width="1" height="1" patternUnits="userSpaceOnUse">
          <path d="M 1 0 L 0 0 0 1" fill="none" stroke="#f0f0f0" strokeWidth="0.05" />
        </pattern>
        <pattern id="setbackPattern" width="0.5" height="0.5" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
          <rect width="0.5" height="0.5" fill="#f8fafc" />
          <line x1="0" y1="0" x2="0" y2="0.5" stroke="#cbd5e1" strokeWidth="0.05" />
        </pattern>
        <pattern id="outdoorPattern" width="0.5" height="0.5" patternUnits="userSpaceOnUse">
          <rect width="0.5" height="0.5" fill="#f0fdf4" />
          <circle cx="0.1" cy="0.1" r="0.05" fill="#bbf7d0" />
          <circle cx="0.35" cy="0.35" r="0.05" fill="#bbf7d0" />
        </pattern>
      </defs>

      <rect x={-2} y={-2} width={maxX + 4} height={maxY + 4} fill="white" />
      <rect width="100%" height="100%" fill="url(#grid)" />

      {/* Rooms */}
      {[...rooms]
        .sort((a, b) => (a.type === 'setback' ? -1 : 1))
        .map((room) => {
          const isSelected = selectedRoomId === room.id;
          const override = roomOverrides?.get(room.id);
          const style = getZoneStyle(room.type, isSelected, override);
          return (
            <g
              key={room.id}
              onClick={(e) => {
                if (onRoomClick && !isMeasuring) {
                  e.stopPropagation();
                  onRoomClick(room.id);
                }
              }}
              className={onRoomClick && !isMeasuring ? "cursor-pointer hover:opacity-90" : ""}
            >
              <rect
                x={room.x} y={room.y} width={room.width} height={room.height}
                fill={style.fill} stroke={style.stroke} strokeWidth={style.strokeWidth}
                strokeDasharray={style.strokeDasharray} opacity={style.opacity}
              />
              {showFeatures && room.features && room.features.map((feature, idx) => renderFeature(room, feature, idx))}

              {/* Room Label */}
              <text
                x={room.x + room.width / 2} y={room.y + room.height / 2 - 0.15}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={room.type === 'room' ? "0.25" : "0.20"}
                fontWeight={room.type === 'room' ? 'bold' : 'normal'}
                fill={room.type === 'outdoor' ? '#166534' : room.type === 'setback' ? '#94a3b8' : 'black'}
                className="uppercase tracking-wider pointer-events-none select-none"
                style={{ textShadow: '0px 0px 2px white' }}
              >
                {room.name}
              </text>

              {/* Dimensions */}
              {showDimensions && (
                <text
                  x={room.x + room.width / 2} y={room.y + room.height / 2 + 0.25}
                  textAnchor="middle" dominantBaseline="middle" fontSize="0.18" fill="black"
                  className="pointer-events-none select-none"
                  style={{ textShadow: '0px 0px 2px white' }}
                >
                  {room.width}m x {room.height}m
                </text>
              )}
            </g>
          );
        })}

      {/* Furniture */}
      {showFurniture && furniture && furniture.map((item) => (
        <g key={item.id} transform={`translate(${item.x}, ${item.y}) rotate(${item.rotation}, ${item.width / 2}, ${item.height / 2})`}>
          <rect
            x={0} y={0} width={item.width} height={item.height}
            fill={getFurnitureColor(item.type)} stroke="#374151" strokeWidth="0.03"
            rx="0.05" opacity={0.8}
          />
          <text
            x={item.width / 2} y={item.height / 2}
            textAnchor="middle" dominantBaseline="middle" fontSize="0.12"
            fill="#1f2937" className="pointer-events-none select-none"
          >
            {item.name}
          </text>
        </g>
      ))}

      {/* Measurement Overlay */}
      {measurementOverlay}

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
  );
};

export default FloorPlanSvg;

import type { CardinalDirection, RoomWithDirection, PlotGeometry, RoomClassification } from '../types/agent.types.js';
import type { Room } from '../types/shared.types.js';
import { classifyRoom } from './room-classifier.js';

/**
 * Divides plot into 3x3 grid. Origin (0,0) at NW corner, X→East, Y→South.
 * Returns the cardinal direction of the given center point.
 */
export function computeDirection(
  centerX: number,
  centerY: number,
  plotWidth: number,
  plotDepth: number
): CardinalDirection {
  const colThird = plotWidth / 3;
  const rowThird = plotDepth / 3;

  // Column: 0=W, 1=CENTER, 2=E
  let col: number;
  if (centerX < colThird) col = 0;
  else if (centerX < colThird * 2) col = 1;
  else col = 2;

  // Row: 0=N, 1=CENTER, 2=S
  let row: number;
  if (centerY < rowThird) row = 0;
  else if (centerY < rowThird * 2) row = 1;
  else row = 2;

  const grid: CardinalDirection[][] = [
    ['NW', 'N', 'NE'],
    ['W', 'CENTER', 'E'],
    ['SW', 'S', 'SE'],
  ];

  return grid[row][col];
}

/**
 * Adds direction, center, area, and classification to each room.
 */
export function enrichRoomsWithDirection(
  rooms: Room[],
  plotGeometry: PlotGeometry
): RoomWithDirection[] {
  return rooms.map((room) => {
    const centerX = room.x + room.width / 2;
    const centerY = room.y + room.height / 2;
    const area = room.width * room.height;
    const direction = computeDirection(centerX, centerY, plotGeometry.width, plotGeometry.depth);
    const classification = classifyRoom(room.name);

    return {
      ...room,
      direction,
      centerX,
      centerY,
      area,
      classification,
    };
  });
}

/**
 * Vastu-preferred directions per room type.
 */
export function getPreferredDirections(classification: RoomClassification): CardinalDirection[] {
  const lookup: Record<RoomClassification, CardinalDirection[]> = {
    master_bedroom: ['SW'],
    children_bedroom: ['W', 'NW', 'E'],
    guest_bedroom: ['NW'],
    bedroom: ['SW', 'W', 'S'],
    kitchen: ['SE', 'NW'],
    living_room: ['NE', 'N', 'E'],
    dining_room: ['W', 'NW', 'E'],
    bathroom: ['W', 'S', 'NW'],
    toilet: ['W', 'S', 'NW'],
    pooja_room: ['NE', 'E', 'N'],
    study_room: ['W', 'E', 'NE'],
    balcony: ['N', 'E', 'NE'],
    staircase: ['SW', 'S', 'W'],
    corridor: ['CENTER', 'N', 'E'],
    entrance: ['N', 'E', 'NE'],
    foyer: ['N', 'E', 'NE'],
    storage: ['SW', 'S', 'W'],
    parking: ['NW', 'SE'],
    utility: ['NW', 'W'],
  };

  return lookup[classification] || [];
}

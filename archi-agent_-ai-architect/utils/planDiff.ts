import type { Room } from '../types';

export interface RoomDiff {
  room: Room;
  status: 'added' | 'removed' | 'modified' | 'unchanged';
  changes?: { positionChanged: boolean; sizeChanged: boolean; oldRoom?: Room };
}

export interface PlanDiff {
  leftRooms: RoomDiff[];
  rightRooms: RoomDiff[];
  summary: { added: number; removed: number; modified: number; unchanged: number };
}

function matchRoom(room: Room, candidates: Room[]): Room | undefined {
  // Match by ID first
  const byId = candidates.find(c => c.id === room.id);
  if (byId) return byId;
  // Fallback to name matching
  return candidates.find(c => c.name.toLowerCase() === room.name.toLowerCase());
}

export function computePlanDiff(planARooms: Room[], planBRooms: Room[]): PlanDiff {
  const leftRooms: RoomDiff[] = [];
  const rightRooms: RoomDiff[] = [];
  let added = 0, removed = 0, modified = 0, unchanged = 0;

  const matchedBIds = new Set<string>();

  // Check each room in plan A against plan B
  for (const roomA of planARooms) {
    const matchB = matchRoom(roomA, planBRooms);
    if (!matchB) {
      leftRooms.push({ room: roomA, status: 'removed' });
      removed++;
    } else {
      matchedBIds.add(matchB.id);
      const posChanged = roomA.x !== matchB.x || roomA.y !== matchB.y;
      const sizeChanged = roomA.width !== matchB.width || roomA.height !== matchB.height;
      if (posChanged || sizeChanged) {
        leftRooms.push({ room: roomA, status: 'modified', changes: { positionChanged: posChanged, sizeChanged, oldRoom: roomA } });
        rightRooms.push({ room: matchB, status: 'modified', changes: { positionChanged: posChanged, sizeChanged, oldRoom: roomA } });
        modified++;
      } else {
        leftRooms.push({ room: roomA, status: 'unchanged' });
        rightRooms.push({ room: matchB, status: 'unchanged' });
        unchanged++;
      }
    }
  }

  // Rooms in B not matched to A are "added"
  for (const roomB of planBRooms) {
    if (!matchedBIds.has(roomB.id)) {
      const matchA = matchRoom(roomB, planARooms);
      if (!matchA) {
        rightRooms.push({ room: roomB, status: 'added' });
        added++;
      }
    }
  }

  return { leftRooms, rightRooms, summary: { added, removed, modified, unchanged } };
}

export function getDiffOverrides(diffs: RoomDiff[]): Map<string, { fill: string; stroke: string }> {
  const map = new Map<string, { fill: string; stroke: string }>();
  for (const d of diffs) {
    switch (d.status) {
      case 'added':
        map.set(d.room.id, { fill: '#bbf7d0', stroke: '#16a34a' });
        break;
      case 'removed':
        map.set(d.room.id, { fill: '#fecaca', stroke: '#dc2626' });
        break;
      case 'modified':
        map.set(d.room.id, { fill: '#fef08a', stroke: '#ca8a04' });
        break;
    }
  }
  return map;
}

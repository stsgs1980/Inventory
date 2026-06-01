// Tool implementations for the Canvas CAD editor
// Handles wall drawing, opening placement, selection, and dimensioning

import type { EditorTool, WallData, RoomData, SnapPoint } from '@/types/inventory'
import type { Point } from './geometry'
import { dist, wallLength, wallDirection } from './geometry'
import { findNearestWall } from './snap'
import { MIN_WALL_LENGTH_M } from '@/lib/constants'

// Wall drawing state
export interface WallDrawState {
  startPoint: Point | null
  previewEnd: Point | null
}

// Selection state
export interface SelectionState {
  selectedWallId: string | null
  selectedRoomId: string | null
  dragStart: Point | null
  dragCurrent: Point | null
}

// Tool action results
export type ToolAction =
  | { type: 'create-wall'; startX: number; startY: number; endX: number; endY: number; wallType: string; thickness: number; roomId: string }
  | { type: 'create-opening'; wallId: string; offset: number; width: number; height: number; openingType: string }
  | { type: 'select-wall'; wallId: string }
  | { type: 'select-room'; roomId: string }
  | { type: 'move-wall'; wallId: string; dx: number; dy: number }
  | { type: 'none' }

/** Process wall tool click - returns action or updated state */
export function processWallToolClick(
  clickPoint: Point,
  drawState: WallDrawState,
  wallType: string,
  thickness: number,
  selectedRoomId: string | null
): { action: ToolAction; newState: WallDrawState } {
  if (!drawState.startPoint) {
    // First click - set start point
    return {
      action: { type: 'none' },
      newState: { startPoint: clickPoint, previewEnd: null },
    }
  }

  // Second click - create wall
  const len = dist(drawState.startPoint, clickPoint)
  if (len < MIN_WALL_LENGTH_M) {
    // Too short - reset
    return {
      action: { type: 'none' },
      newState: { startPoint: null, previewEnd: null },
    }
  }

  if (!selectedRoomId) {
    return {
      action: { type: 'none' },
      newState: drawState,
    }
  }

  return {
    action: {
      type: 'create-wall',
      startX: drawState.startPoint[0],
      startY: drawState.startPoint[1],
      endX: clickPoint[0],
      endY: clickPoint[1],
      wallType,
      thickness,
      roomId: selectedRoomId,
    },
    newState: { startPoint: null, previewEnd: null },
  }
}

/** Update wall draw preview line */
export function updateWallPreview(
  drawState: WallDrawState,
  mouseWorld: Point
): WallDrawState {
  if (!drawState.startPoint) return drawState
  return { ...drawState, previewEnd: mouseWorld }
}

/** Process opening tool click - find nearest wall and compute offset */
export function processOpeningToolClick(
  clickPoint: Point,
  walls: WallData[],
  openingType: string,
  defaultWidth: number,
  defaultHeight: number
): ToolAction {
  const wallItems = walls.map(w => ({
    id: w.id, startX: w.startX, startY: w.startY, endX: w.endX, endY: w.endY,
  }))
  const nearest = findNearestWall(clickPoint, wallItems)
  if (!nearest) return { type: 'none' }

  const wall = walls.find(w => w.id === nearest.wallId)
  if (!wall) return { type: 'none' }

  const start: Point = [wall.startX, wall.startY]
  const wLen = wallLength(start, [wall.endX, wall.endY])
  if (wLen < 0.01) return { type: 'none' }

  // Offset from wall start in meters
  const offsetM = nearest.t * wLen
  // Clamp so opening fits within wall
  const maxOffset = wLen - defaultWidth
  const clampedOffset = Math.max(0, Math.min(offsetM, maxOffset))

  return {
    type: 'create-opening',
    wallId: nearest.wallId,
    offset: parseFloat(clampedOffset.toFixed(3)),
    width: defaultWidth,
    height: defaultHeight,
    openingType,
  }
}

/** Process select tool click - find wall or room under cursor */
export function processSelectToolClick(
  clickPoint: Point,
  walls: WallData[],
  rooms: RoomData[]
): ToolAction {
  // Find closest wall
  const wallItems = walls.map(w => ({
    id: w.id, startX: w.startX, startY: w.startY, endX: w.endX, endY: w.endY,
  }))
  const nearest = findNearestWall(clickPoint, wallItems)
  if (nearest && nearest.dist < 0.5) {
    return { type: 'select-wall', wallId: nearest.wallId }
  }

  // Find room containing point
  for (const room of rooms) {
    const polygon = buildRoomPolygonFromWalls(room.walls)
    if (polygon.length < 3) continue
    if (isPointInPolygon(clickPoint[0], clickPoint[1], polygon)) {
      return { type: 'select-room', roomId: room.id }
    }
  }

  return { type: 'none' }
}

// Helpers
function buildRoomPolygonFromWalls(walls: WallData[]): Point[] {
  if (walls.length === 0) return []
  const points: Point[] = [[walls[0].startX, walls[0].startY]]
  let current: Point = [walls[0].endX, walls[0].endY]
  points.push(current)
  const used = new Set([0])
  for (let iter = 0; iter < walls.length - 1; iter++) {
    let found = false
    for (let i = 1; i < walls.length; i++) {
      if (used.has(i)) continue
      const ws: Point = [walls[i].startX, walls[i].startY]
      const we: Point = [walls[i].endX, walls[i].endY]
      if (dist(current, ws) < 0.05) { points.push(we); current = we; used.add(i); found = true; break }
      if (dist(current, we) < 0.05) { points.push(ws); current = ws; used.add(i); found = true; break }
    }
    if (!found) break
  }
  return points
}

function isPointInPolygon(px: number, py: number, poly: Point[]): boolean {
  if (poly.length < 3) return false
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1]
    const xj = poly[j][0], yj = poly[j][1]
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside
  }
  return inside
}

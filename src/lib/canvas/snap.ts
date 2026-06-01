// Snap engine for the Canvas CAD editor
// Finds snap points: grid, endpoint, midpoint, intersection, perpendicular

import type { SnapPoint } from '@/types/inventory'
import type { Point } from './geometry'
import { midpoint, pointToSegmentDist, perpendicularFoot, snapToGrid } from './geometry'
import { GRID_MINOR_M, GRID_MAJOR_M, WALL_SELECT_THRESHOLD_M } from '@/lib/constants'

interface SnapContext {
  mouseWorld: Point
  walls: { startX: number; startY: number; endX: number; endY: number }[]
  gridStep: number
  snapThreshold: number
}

/** Find the best snap point given the current context */
export function findSnapPoint(ctx: SnapContext): SnapPoint | null {
  const candidates: SnapPoint[] = []
  const [mx, my] = ctx.mouseWorld
  const threshold = ctx.snapThreshold

  // 1. Endpoint snap - wall start/end points
  for (const w of ctx.walls) {
    const d1 = Math.sqrt((mx - w.startX) ** 2 + (my - w.startY) ** 2)
    if (d1 < threshold) {
      candidates.push({ x: w.startX, y: w.startY, type: 'endpoint' })
    }
    const d2 = Math.sqrt((mx - w.endX) ** 2 + (my - w.endY) ** 2)
    if (d2 < threshold) {
      candidates.push({ x: w.endX, y: w.endY, type: 'endpoint' })
    }
  }

  // 2. Midpoint snap
  for (const w of ctx.walls) {
    const mid = midpoint([w.startX, w.startY], [w.endX, w.endY])
    const d = Math.sqrt((mx - mid[0]) ** 2 + (my - mid[1]) ** 2)
    if (d < threshold) {
      candidates.push({ x: mid[0], y: mid[1], type: 'midpoint' })
    }
  }

  // 3. Intersection snap
  for (let i = 0; i < ctx.walls.length; i++) {
    for (let j = i + 1; j < ctx.walls.length; j++) {
      const inter = segmentIntersection(
        ctx.walls[i].startX, ctx.walls[i].startY, ctx.walls[i].endX, ctx.walls[i].endY,
        ctx.walls[j].startX, ctx.walls[j].startY, ctx.walls[j].endX, ctx.walls[j].endY,
      )
      if (inter) {
        const d = Math.sqrt((mx - inter[0]) ** 2 + (my - inter[1]) ** 2)
        if (d < threshold) {
          candidates.push({ x: inter[0], y: inter[1], type: 'intersection' })
        }
      }
    }
  }

  // 4. Perpendicular snap to nearest wall
  for (const w of ctx.walls) {
    const foot = perpendicularFoot(mx, my, w.startX, w.startY, w.endX, w.endY)
    const { dist: segDist, t } = pointToSegmentDist(foot[0], foot[1], w.startX, w.startY, w.endX, w.endY)
    if (t >= 0 && t <= 1 && segDist < threshold) {
      const d = Math.sqrt((mx - foot[0]) ** 2 + (my - foot[1]) ** 2)
      if (d < threshold * 2) {
        candidates.push({ x: foot[0], y: foot[1], type: 'perpendicular' })
      }
    }
  }

  // Sort candidates by distance to mouse, prefer non-grid types
  candidates.sort((a, b) => {
    const da = Math.sqrt((mx - a.x) ** 2 + (my - a.y) ** 2)
    const db = Math.sqrt((mx - b.x) ** 2 + (my - b.y) ** 2)
    if (Math.abs(da - db) < 0.001) {
      const priority: Record<string, number> = { endpoint: 0, intersection: 1, midpoint: 2, perpendicular: 3, grid: 4 }
      return (priority[a.type] ?? 5) - (priority[b.type] ?? 5)
    }
    return da - db
  })

  if (candidates.length > 0) return candidates[0]

  // 5. Grid snap (fallback)
  return {
    x: snapToGrid(mx, ctx.gridStep),
    y: snapToGrid(my, ctx.gridStep),
    type: 'grid',
  }
}

/** Segment-segment intersection (only within both segments) */
function segmentIntersection(
  ax1: number, ay1: number, ax2: number, ay2: number,
  bx1: number, by1: number, bx2: number, by2: number
): Point | null {
  const d1x = ax2 - ax1, d1y = ay2 - ay1
  const d2x = bx2 - bx1, d2y = by2 - by1
  const cross = d1x * d2y - d1y * d2x
  if (Math.abs(cross) < 0.0001) return null
  const t = ((bx1 - ax1) * d2y - (by1 - ay1) * d2x) / cross
  const u = ((bx1 - ax1) * d1y - (by1 - ay1) * d1x) / cross
  if (t >= -0.001 && t <= 1.001 && u >= -0.001 && u <= 1.001) {
    return [ax1 + t * d1x, ay1 + t * d1y]
  }
  return null
}

/** Find which wall the mouse is closest to (for opening placement) */
export function findNearestWall(
  mouseWorld: Point,
  walls: { id: string; startX: number; startY: number; endX: number; endY: number }[]
): { wallId: string; t: number; dist: number } | null {
  let best: { wallId: string; t: number; dist: number } | null = null
  for (const w of walls) {
    const { dist, t } = pointToSegmentDist(
      mouseWorld[0], mouseWorld[1],
      w.startX, w.startY, w.endX, w.endY
    )
    if (dist < WALL_SELECT_THRESHOLD_M && (!best || dist < best.dist)) {
      best = { wallId: w.id, t, dist }
    }
  }
  return best
}

// Coordinate math and geometry utilities for the floor plan editor

import { M_TO_MM } from '@/lib/constants'

/** Snap a value to the nearest grid step */
export function snapToGrid(val: number, step: number): number {
  return Math.round(val / step) * step
}

/** Find the nearest 8-point compass direction from a dx/dy vector (Y-up) */
export function nearestCompassDirection(dx: number, dy: number): string {
  const angle = Math.atan2(dy, dx) * (180 / Math.PI)
  const dirs = ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE']
  let idx = Math.round(angle / 45)
  if (idx < 0) idx += 8
  return dirs[idx % 8]
}

/** Distance from point (px,py) to line segment (ax,ay)-(bx,by), plus parametric t */
export function pointToSegmentDistance(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number
): { dist: number; t: number } {
  const abx = bx - ax
  const aby = by - ay
  const apx = px - ax
  const apy = py - ay
  const abLen2 = abx * abx + aby * aby
  if (abLen2 < 0.001) return { dist: Math.sqrt(apx * apx + apy * apy), t: 0 }
  let t = (apx * abx + apy * aby) / abLen2
  t = Math.max(0, Math.min(1, t))
  const closestX = ax + t * abx
  const closestY = ay + t * aby
  const dx = px - closestX
  const dy = py - closestY
  return { dist: Math.sqrt(dx * dx + dy * dy), t }
}

/** Convert world meters (Y-up) to SVG coordinates (Y-down, with origin offset) */
export function mToSvg(xM: number, yM: number, origin: { x: number; y: number }): [number, number] {
  return [origin.x + xM * M_TO_MM, origin.y - yM * M_TO_MM]
}

/** Point-in-polygon test using ray casting */
export function isPointInPolygon(px: number, py: number, polygon: [number, number][]): boolean {
  if (polygon.length < 3) return false
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1]
    const xj = polygon[j][0], yj = polygon[j][1]
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  return inside
}

/** Check if a room polygon is closed (last point near origin, 5cm tolerance) */
export function isPolygonClosed(points: [number, number][]): boolean {
  if (points.length < 2) return false
  const last = points[points.length - 1]
  return Math.abs(last[0]) < 0.05 && Math.abs(last[1]) < 0.05
}

/** Default SVG origin point */
export const PLAN_ORIGIN = { x: 1500, y: 1500 }

/** Grid step constants */
export const GRID_STEP_M = 0.1   // 10cm snap
export const GRID_MAJOR_M = 1.0  // 1m major grid

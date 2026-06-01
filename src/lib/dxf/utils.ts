// DXF utility functions for coordinate-based wall model
// Updated for Phase 2: walls have absolute coordinates (startX,startY,endX,endY)

import { M_TO_MM } from '../constants'

export type Point = [number, number]

/** Convert meters to millimeters */
export function mToMM(valueM: number): number {
  return valueM * M_TO_MM
}

/** Calculate wall length from coordinates */
export function wallLengthFromCoords(startX: number, startY: number, endX: number, endY: number): number {
  const dx = endX - startX
  const dy = endY - startY
  return Math.sqrt(dx * dx + dy * dy)
}

/** Calculate wall direction from coordinates */
export function wallDirectionFromCoords(startX: number, startY: number, endX: number, endY: number): string {
  const angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI)
  const dirs = ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE']
  let idx = Math.round(angle / 45)
  if (idx < 0) idx += 8
  return dirs[idx % 8]
}

/** Build room polygon from coordinate-based walls */
export function buildRoomPolygon(walls: { startX: number; startY: number; endX: number; endY: number }[]): Point[] {
  if (!walls || walls.length === 0) return []
  return buildConnectedPolygon(
    walls.map(w => ({ startX: w.startX, startY: w.startY, endX: w.endX, endY: w.endY }))
  )
}

/** Build connected polygon from wall endpoints by chain-linking */
function buildConnectedPolygon(walls: { startX: number; startY: number; endX: number; endY: number }[]): Point[] {
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
      const tol = 0.05
      if (Math.abs(current[0] - ws[0]) < tol && Math.abs(current[1] - ws[1]) < tol) {
        points.push(we); current = we; used.add(i); found = true; break
      }
      if (Math.abs(current[0] - we[0]) < tol && Math.abs(current[1] - we[1]) < tol) {
        points.push(ws); current = ws; used.add(i); found = true; break
      }
    }
    if (!found) break
  }
  return points
}

/** Calculate room area using Shoelace formula */
export function calculateArea(walls: { startX: number; startY: number; endX: number; endY: number }[]): number {
  const points = buildRoomPolygon(walls)
  const n = points.length
  if (n < 3) return 0
  let area = 0
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += points[i][0] * points[j][1]
    area -= points[j][0] * points[i][1]
  }
  return Math.abs(area) / 2.0
}

/** Offset polygon vertices inward (negative) or outward (positive) */
export function offsetPolygon(points: Point[], offset: number): Point[] {
  if (Math.abs(offset) < 0.01 || points.length < 3) return points
  const result: Point[] = []
  const n = points.length
  for (let i = 0; i < n; i++) {
    const prevPt = points[(i - 1 + n) % n]
    const currPt = points[i]
    const nextPt = points[(i + 1) % n]
    const dx1 = currPt[0] - prevPt[0], dy1 = currPt[1] - prevPt[1]
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1)
    let n1x = 0, n1y = 0
    if (len1 > 0.01) { n1x = -dy1 / len1; n1y = dx1 / len1 }
    const dx2 = nextPt[0] - currPt[0], dy2 = nextPt[1] - currPt[1]
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)
    let n2x = 0, n2y = 0
    if (len2 > 0.01) { n2x = -dy2 / len2; n2y = dx2 / len2 }
    let avgNx = (n1x + n2x) / 2.0, avgNy = (n1y + n2y) / 2.0
    const avgLen = Math.sqrt(avgNx * avgNx + avgNy * avgNy)
    if (avgLen > 0.001) { avgNx /= avgLen; avgNy /= avgLen }
    result.push([currPt[0] + avgNx * offset, currPt[1] + avgNy * offset])
  }
  return result
}

/** Average wall thickness in mm */
export function avgWallThickness(walls: { thickness: number }[]): number {
  if (!walls || walls.length === 0) return 200.0
  return walls.reduce((sum, w) => sum + w.thickness, 0) / walls.length
}

/** Polygon centroid */
export function polygonCenter(points: Point[]): Point {
  if (points.length === 0) return [0, 0]
  const cx = points.reduce((s, p) => s + p[0], 0) / points.length
  const cy = points.reduce((s, p) => s + p[1], 0) / points.length
  return [cx, cy]
}

/** Format number with comma as decimal separator (Romanian convention) */
export function formatDecimal(value: number, decimals: number = 2): string {
  return value.toFixed(decimals).replace('.', ',')
}

// Legacy: build polygon from direction-based walls (backward compat)
export function buildRoomPolygonLegacy(walls: { direction: string; length: number }[]): Point[] {
  if (!walls || walls.length === 0) return []
  const DIR_VECTORS: Record<string, [number, number]> = {
    N: [0, 1], S: [0, -1], E: [1, 0], W: [-1, 0],
    NE: [0.7071, 0.7071], NW: [-0.7071, 0.7071],
    SE: [0.7071, -0.7071], SW: [-0.7071, -0.7071],
  }
  const points: Point[] = [[0.0, 0.0]]
  let x = 0.0, y = 0.0
  for (const wall of walls) {
    const dir = DIR_VECTORS[wall.direction.toUpperCase()]
    if (!dir) continue
    x += dir[0] * wall.length
    y += dir[1] * wall.length
    points.push([x, y])
  }
  return points
}

// DXF utility functions for polygon math, direction vectors, and offsets
import { DIR_VECTORS, M_TO_MM } from '../constants'

export type Point = [number, number]

// Convert meters to millimeters
export function mToMM(valueM: number): number {
  return valueM * M_TO_MM
}

// Build room polygon vertices from wall segments
// Returns list of (x, y) coordinates in meters, starting from (0, 0)
export function buildRoomPolygon(walls: { direction: string; length: number }[]): Point[] {
  if (!walls || walls.length === 0) return []

  const points: Point[] = [[0.0, 0.0]]
  let x = 0.0
  let y = 0.0

  for (const wall of walls) {
    const dir = DIR_VECTORS[wall.direction.toUpperCase()]
    if (!dir) continue
    x += dir[0] * wall.length
    y += dir[1] * wall.length
    points.push([x, y])
  }

  return points
}

// Calculate room area using the Shoelace formula
export function calculateArea(walls: { direction: string; length: number }[]): number {
  if (!walls || walls.length === 0) return 0.0

  const points = buildRoomPolygon(walls)
  const n = points.length
  let area = 0.0

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += points[i][0] * points[j][1]
    area -= points[j][0] * points[i][1]
  }

  return Math.abs(area) / 2.0
}

// Offset polygon vertices inward (negative) or outward (positive)
export function offsetPolygon(points: Point[], offset: number): Point[] {
  if (Math.abs(offset) < 0.01 || points.length < 3) return points

  const result: Point[] = []
  const n = points.length

  for (let i = 0; i < n; i++) {
    const prevPt = points[(i - 1 + n) % n]
    const currPt = points[i]
    const nextPt = points[(i + 1) % n]

    const dx1 = currPt[0] - prevPt[0]
    const dy1 = currPt[1] - prevPt[1]
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1)
    let n1x = 0, n1y = 0
    if (len1 > 0.01) {
      n1x = -dy1 / len1
      n1y = dx1 / len1
    }

    const dx2 = nextPt[0] - currPt[0]
    const dy2 = nextPt[1] - currPt[1]
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)
    let n2x = 0, n2y = 0
    if (len2 > 0.01) {
      n2x = -dy2 / len2
      n2y = dx2 / len2
    }

    let avgNx = (n1x + n2x) / 2.0
    let avgNy = (n1y + n2y) / 2.0
    const avgLen = Math.sqrt(avgNx * avgNx + avgNy * avgNy)

    if (avgLen > 0.001) {
      avgNx /= avgLen
      avgNy /= avgLen
    }

    result.push([
      currPt[0] + avgNx * offset,
      currPt[1] + avgNy * offset,
    ])
  }

  return result
}

// Calculate average wall thickness for a room in mm
export function avgWallThickness(walls: { thickness: number }[]): number {
  if (!walls || walls.length === 0) return 200.0
  return walls.reduce((sum, w) => sum + w.thickness, 0) / walls.length
}

// Calculate polygon center point
export function polygonCenter(points: Point[]): Point {
  if (points.length === 0) return [0, 0]
  const cx = points.reduce((sum, p) => sum + p[0], 0) / points.length
  const cy = points.reduce((sum, p) => sum + p[1], 0) / points.length
  return [cx, cy]
}

// Format number with comma as decimal separator (Romanian convention)
export function formatDecimal(value: number, decimals: number = 2): string {
  return value.toFixed(decimals).replace('.', ',')
}

// Estimate room bounding box from walls (returns w_mm, h_mm)
export function estimateRoomDimensions(walls: { direction: string; length: number }[]): [number, number] {
  const points = buildRoomPolygon(walls)

  if (points.length === 0) return [mToMM(3.0), mToMM(3.0)]

  const minX = Math.min(...points.map(p => p[0]))
  const maxX = Math.max(...points.map(p => p[0]))
  const minY = Math.min(...points.map(p => p[1]))
  const maxY = Math.max(...points.map(p => p[1]))

  const width = (maxX - minX) * M_TO_MM
  const height = (maxY - minY) * M_TO_MM

  return [Math.max(width, mToMM(1.0)), Math.max(height, mToMM(1.0))]
}

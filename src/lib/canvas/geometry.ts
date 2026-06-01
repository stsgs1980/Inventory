// Geometry math utilities for the Canvas CAD editor
// All coordinates in meters unless noted

export type Point = [number, number]

/** Distance between two points */
export function dist(a: Point, b: Point): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  return Math.sqrt(dx * dx + dy * dy)
}

/** Midpoint between two points */
export function midpoint(a: Point, b: Point): Point {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
}

/** Wall angle in radians (from start to end) */
export function wallAngle(start: Point, end: Point): number {
  return Math.atan2(end[1] - start[1], end[0] - start[0])
}

/** Wall direction as compass string (8 directions) */
export function wallDirection(start: Point, end: Point): string {
  const angle = wallAngle(start, end) * (180 / Math.PI)
  const dirs = ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE']
  let idx = Math.round(angle / 45)
  if (idx < 0) idx += 8
  return dirs[idx % 8]
}

/** Wall length in meters */
export function wallLength(start: Point, end: Point): number {
  return dist(start, end)
}

/** Perpendicular unit vector (left side) of a line segment */
export function perpendicularUnit(start: Point, end: Point): Point {
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 0.001) return [0, 1]
  return [-dy / len, dx / len]
}

/** Unit vector along the line from start to end */
export function alongUnit(start: Point, end: Point): Point {
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 0.001) return [1, 0]
  return [dx / len, dy / len]
}

/** Distance from point P to line segment AB, plus parametric t */
export function pointToSegmentDist(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number
): { dist: number; t: number } {
  const abx = bx - ax
  const aby = by - ay
  const apx = px - ax
  const apy = py - ay
  const abLen2 = abx * abx + aby * aby
  if (abLen2 < 0.0001) return { dist: Math.sqrt(apx * apx + apy * apy), t: 0 }
  let t = (apx * abx + apy * aby) / abLen2
  t = Math.max(0, Math.min(1, t))
  const closestX = ax + t * abx
  const closestY = ay + t * aby
  const dx = px - closestX
  const dy = py - closestY
  return { dist: Math.sqrt(dx * dx + dy * dy), t }
}

/** Line-line intersection. Returns null if parallel. */
export function lineIntersection(
  a1: Point, a2: Point, b1: Point, b2: Point
): Point | null {
  const d1x = a2[0] - a1[0]
  const d1y = a2[1] - a1[1]
  const d2x = b2[0] - b1[0]
  const d2y = b2[1] - b1[1]
  const cross = d1x * d2y - d1y * d2x
  if (Math.abs(cross) < 0.0001) return null
  const t = ((b1[0] - a1[0]) * d2y - (b1[1] - a1[1]) * d2x) / cross
  return [a1[0] + t * d1x, a1[1] + t * d1y]
}

/** Calculate polygon area (Shoelace formula) in sq meters */
export function polygonArea(pts: Point[]): number {
  const n = pts.length
  if (n < 3) return 0
  let area = 0
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += pts[i][0] * pts[j][1]
    area -= pts[j][0] * pts[i][1]
  }
  return Math.abs(area) / 2
}

/** Polygon centroid */
export function polygonCenter(pts: Point[]): Point {
  if (pts.length === 0) return [0, 0]
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length
  return [cx, cy]
}

/** Point-in-polygon test (ray casting) */
export function isPointInPolygon(px: number, py: number, poly: Point[]): boolean {
  if (poly.length < 3) return false
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1]
    const xj = poly[j][0], yj = poly[j][1]
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  return inside
}

/** Snap value to nearest grid step */
export function snapToGrid(val: number, step: number): number {
  return Math.round(val / step) * step
}

/** Find perpendicular foot from point to line (extended) */
export function perpendicularFoot(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number
): Point {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  if (len2 < 0.0001) return [ax, ay]
  const t = ((px - ax) * dx + (py - ay) * dy) / len2
  return [ax + t * dx, ay + t * dy]
}

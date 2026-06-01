// Canvas rendering: openings (doors/windows) and room overlays

import type { WallData, RoomData, OpeningData } from '@/types/inventory'
import type { Point } from '@/types/inventory'
import { M_TO_MM, CANVAS_COLORS } from '@/lib/constants'
import { worldToPixel } from './renderer'
import { wallLength, alongUnit, perpendicularUnit, polygonArea, polygonCenter, dist } from './geometry'

interface RenderContext {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  zoom: number
  panX: number
  panY: number
}

/** Draw door opening on a wall */
export function drawDoor(
  rc: RenderContext, wall: WallData, opening: OpeningData
): void {
  const { ctx } = rc
  const start: Point = [wall.startX, wall.startY]
  const end: Point = [wall.endX, wall.endY]
  const wLen = wallLength(start, end)
  if (wLen < 0.01) return

  const [ux, uy] = alongUnit(start, end)
  const [nx, ny] = perpendicularUnit(start, end)

  const offsetM = opening.offset
  const widthM = opening.width
  const opS: Point = [start[0] + ux * offsetM, start[1] + uy * offsetM]
  const opE: Point = [start[0] + ux * (offsetM + widthM), start[1] + uy * (offsetM + widthM)]

  const [opSx, opSy] = worldToPixel(opS[0], opS[1], rc)
  const [opEx, opEy] = worldToPixel(opE[0], opE[1], rc)

  // Door baseline
  ctx.strokeStyle = CANVAS_COLORS.openingDoor
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(opSx, opSy)
  ctx.lineTo(opEx, opEy)
  ctx.stroke()

  // Door arc (quarter circle)
  const radiusPx = widthM * M_TO_MM * rc.zoom
  const arcEndX = opSx + nx * radiusPx
  const arcEndY = opSy - ny * radiusPx  // Note: canvas Y is flipped
  ctx.beginPath()
  ctx.moveTo(opSx, opSy)
  ctx.quadraticCurveTo(opEx, opSy - ny * radiusPx * 0.5, arcEndX, arcEndY)
  ctx.strokeStyle = CANVAS_COLORS.openingDoor
  ctx.lineWidth = 1.5
  ctx.setLineDash([4, 3])
  ctx.stroke()
  ctx.setLineDash([])

  // Door label
  if (rc.zoom > 1.2) {
    const midX = (opSx + opEx) / 2
    const midY = (opSy + opEy) / 2
    ctx.fillStyle = CANVAS_COLORS.openingDoor
    ctx.font = `${Math.max(8, 10 * Math.min(rc.zoom, 2))}px sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('U', midX + nx * 12, midY - ny * 12)
  }
}

/** Draw window opening on a wall */
export function drawWindow(
  rc: RenderContext, wall: WallData, opening: OpeningData
): void {
  const { ctx } = rc
  const start: Point = [wall.startX, wall.startY]
  const end: Point = [wall.endX, wall.endY]
  const wLen = wallLength(start, end)
  if (wLen < 0.01) return

  const [ux, uy] = alongUnit(start, end)
  const [nx, ny] = perpendicularUnit(start, end)

  const offsetM = opening.offset
  const widthM = opening.width
  const halfThick = (wall.thickness / 2 / M_TO_MM)  // mm to m

  const opS: Point = [start[0] + ux * offsetM, start[1] + uy * offsetM]
  const opE: Point = [start[0] + ux * (offsetM + widthM), start[1] + uy * (offsetM + widthM)]

  ctx.strokeStyle = CANVAS_COLORS.openingWindow
  ctx.lineWidth = 2

  // Two parallel lines across wall opening
  for (const t of [-halfThick * 0.3, halfThick * 0.3]) {
    const [s1x, s1y] = worldToPixel(opS[0] + nx * t, opS[1] + ny * t, rc)
    const [e1x, e1y] = worldToPixel(opE[0] + nx * t, opE[1] + ny * t, rc)
    ctx.beginPath()
    ctx.moveTo(s1x, s1y)
    ctx.lineTo(e1x, e1y)
    ctx.stroke()
  }

  // Window label
  if (rc.zoom > 1.2) {
    const [opSx, opSy] = worldToPixel(opS[0], opS[1], rc)
    const [opEx, opEy] = worldToPixel(opE[0], opE[1], rc)
    const midX = (opSx + opEx) / 2
    const midY = (opSy + opEy) / 2
    ctx.fillStyle = CANVAS_COLORS.openingWindow
    ctx.font = `${Math.max(8, 10 * Math.min(rc.zoom, 2))}px sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('F', midX + nx * 12, midY - ny * 12)
  }
}

/** Draw room overlay (fill + label) */
export function drawRoom(
  rc: RenderContext, room: RoomData, isSelected: boolean
): void {
  const { ctx } = rc
  if (room.walls.length < 3) return

  // Build room polygon from wall endpoints
  const polygon = buildRoomPolygon(room.walls)
  if (polygon.length < 3) return

  // Fill
  const pixels = polygon.map(p => worldToPixel(p[0], p[1], rc))
  ctx.beginPath()
  ctx.moveTo(pixels[0][0], pixels[0][1])
  for (let i = 1; i < pixels.length; i++) {
    ctx.lineTo(pixels[i][0], pixels[i][1])
  }
  ctx.closePath()
  ctx.fillStyle = isSelected ? CANVAS_COLORS.roomSelected : CANVAS_COLORS.roomFill
  ctx.fill()
  ctx.strokeStyle = isSelected ? CANVAS_COLORS.roomStroke : '#06b6d4'
  ctx.lineWidth = isSelected ? 2 : 1
  ctx.stroke()

  // Room label
  const center = polygonCenter(polygon)
  const [cx, cy] = worldToPixel(center[0], center[1], rc)
  const area = polygonArea(polygon)
  const fontSize = Math.max(10, 14 * Math.min(rc.zoom, 2))

  ctx.fillStyle = CANVAS_COLORS.roomStroke
  ctx.font = `bold ${fontSize}px sans-serif`
  ctx.textAlign = 'center'
  ctx.fillText(`${room.number}`, cx, cy - fontSize * 0.3)

  ctx.font = `${fontSize * 0.8}px sans-serif`
  ctx.fillStyle = '#0e7490'
  ctx.fillText(`${area.toFixed(1).replace('.', ',')} m2`, cx, cy + fontSize * 0.7)

  if (rc.zoom > 1) {
    ctx.font = `${fontSize * 0.65}px sans-serif`
    ctx.fillStyle = '#6b7280'
    ctx.fillText(room.name, cx, cy + fontSize * 1.5)
  }
}

/** Build ordered polygon from room walls (connected endpoints) */
function buildRoomPolygon(walls: WallData[]): Point[] {
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
      if (dist(current, ws) < 0.05) {
        points.push(we)
        current = we
        used.add(i)
        found = true
        break
      }
      if (dist(current, we) < 0.05) {
        points.push(ws)
        current = ws
        used.add(i)
        found = true
        break
      }
    }
    if (!found) break
  }
  return points
}

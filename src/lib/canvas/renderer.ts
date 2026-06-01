// Canvas rendering functions for the CAD floor plan editor
// Pure drawing functions - no React state, just Canvas2D API calls

import type { WallData, RoomData } from '@/types/inventory'
import type { Point, SnapPoint } from '@/types/inventory'
import { M_TO_MM, CANVAS_COLORS, GRID_MAJOR_M, GRID_MINOR_M } from '@/lib/constants'
import {
  alongUnit, perpendicularUnit, midpoint,
  wallLength, polygonArea, polygonCenter,
} from './geometry'

interface RenderContext {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  zoom: number
  panX: number
  panY: number
}

/** Convert world meters to canvas pixels */
export function worldToPixel(
  wx: number, wy: number,
  rc: RenderContext
): [number, number] {
  const px = (wx * M_TO_MM * rc.zoom) + rc.panX + rc.width / 2
  const py = -(wy * M_TO_MM * rc.zoom) + rc.panY + rc.height / 2
  return [px, py]
}

/** Convert canvas pixels to world meters */
export function pixelToWorld(
  px: number, py: number,
  rc: RenderContext
): [number, number] {
  const wx = (px - rc.panX - rc.width / 2) / (M_TO_MM * rc.zoom)
  const wy = -(py - rc.panY - rc.height / 2) / (M_TO_MM * rc.zoom)
  return [wx, wy]
}

/** Draw the background grid */
export function drawGrid(rc: RenderContext): void {
  const { ctx, width, height, zoom, panX, panY } = rc
  const mmPerPx = 1 / zoom
  const wLeft = (-panX - width / 2) * mmPerPx
  const wRight = (-panX + width / 2) * mmPerPx
  const wTop = (panY - height / 2) * mmPerPx
  const wBottom = (panY + height / 2) * mmPerPx

  // Convert bounds to meters
  const mLeft = wLeft / M_TO_MM
  const mRight = wRight / M_TO_MM
  const mTop = wTop / M_TO_MM
  const mBottom = wBottom / M_TO_MM

  // Minor grid
  ctx.strokeStyle = CANVAS_COLORS.gridMinor
  ctx.lineWidth = 0.5
  const minorStep = GRID_MINOR_M
  if (zoom > 1.5) {
    for (let x = Math.floor(mLeft / minorStep) * minorStep; x <= mRight; x += minorStep) {
      const [px] = worldToPixel(x, 0, rc)
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, height); ctx.stroke()
    }
    for (let y = Math.floor(mBottom / minorStep) * minorStep; y <= mTop; y += minorStep) {
      const [, py] = worldToPixel(0, y, rc)
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(width, py); ctx.stroke()
    }
  }

  // Major grid (1m)
  ctx.strokeStyle = CANVAS_COLORS.gridMajor
  ctx.lineWidth = 1
  for (let x = Math.floor(mLeft / GRID_MAJOR_M) * GRID_MAJOR_M; x <= mRight; x += GRID_MAJOR_M) {
    const [px] = worldToPixel(x, 0, rc)
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, height); ctx.stroke()
  }
  for (let y = Math.floor(mBottom / GRID_MAJOR_M) * GRID_MAJOR_M; y <= mTop; y += GRID_MAJOR_M) {
    const [, py] = worldToPixel(0, y, rc)
    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(width, py); ctx.stroke()
  }

  // Origin axes
  ctx.strokeStyle = CANVAS_COLORS.gridOrigin
  ctx.lineWidth = 2
  const [ox, oy] = worldToPixel(0, 0, rc)
  ctx.beginPath(); ctx.moveTo(ox, 0); ctx.lineTo(ox, height); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(0, oy); ctx.lineTo(width, oy); ctx.stroke()

  // Meter labels
  ctx.fillStyle = '#94a3b8'
  ctx.font = `${Math.max(10, 12 * Math.min(zoom, 3))}px sans-serif`
  ctx.textAlign = 'center'
  for (let x = Math.floor(mLeft); x <= mRight; x += GRID_MAJOR_M) {
    if (x === 0) continue
    const [px, py] = worldToPixel(x, 0, rc)
    ctx.fillText(`${x}m`, px, oy + 16)
  }
  ctx.textAlign = 'left'
  for (let y = Math.floor(mBottom); y <= mTop; y += GRID_MAJOR_M) {
    if (y === 0) continue
    const [px, py] = worldToPixel(0, y, rc)
    ctx.fillText(`${y}m`, ox + 6, py + 4)
  }
}

/** Draw a single wall with thickness */
export function drawWall(
  rc: RenderContext, wall: WallData, highlighted: boolean
): void {
  const { ctx } = rc
  const start: Point = [wall.startX, wall.startY]
  const end: Point = [wall.endX, wall.endY]
  const [sx, sy] = worldToPixel(start[0], start[1], rc)
  const [ex, ey] = worldToPixel(end[0], end[1], rc)
  const dx = ex - sx, dy = ey - sy
  const pixLen = Math.sqrt(dx * dx + dy * dy)
  if (pixLen < 1) return

  const nx = -dy / pixLen, ny = dx / pixLen
  const halfThick = (wall.thickness / 2) * rc.zoom

  const color = wall.wallType === 'portant'
    ? CANVAS_COLORS.wallPortant
    : CANVAS_COLORS.wallDespartitor

  ctx.strokeStyle = highlighted ? '#fbbf24' : color
  ctx.lineWidth = highlighted ? 2.5 : 1.5

  // Two parallel lines
  ctx.beginPath()
  ctx.moveTo(sx + nx * halfThick, sy + ny * halfThick)
  ctx.lineTo(ex + nx * halfThick, ey + ny * halfThick)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(sx - nx * halfThick, sy - ny * halfThick)
  ctx.lineTo(ex - nx * halfThick, ey - ny * halfThick)
  ctx.stroke()

  // End caps
  ctx.beginPath()
  ctx.moveTo(sx + nx * halfThick, sy + ny * halfThick)
  ctx.lineTo(sx - nx * halfThick, sy - ny * halfThick)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(ex + nx * halfThick, ey + ny * halfThick)
  ctx.lineTo(ex - nx * halfThick, ey - ny * halfThick)
  ctx.stroke()

  // Wall label (length + direction)
  const lenM = wallLength(start, end)
  if (lenM > 0.1 && rc.zoom > 0.8) {
    const labelX = (sx + ex) / 2 + nx * (halfThick + 14)
    const labelY = (sy + ey) / 2 + ny * (halfThick + 14)
    ctx.fillStyle = CANVAS_COLORS.dimensionText
    ctx.font = `${Math.max(9, 11 * Math.min(rc.zoom, 2))}px sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText(`${lenM.toFixed(2)}m`, labelX, labelY)
  }
}

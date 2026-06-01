'use client'

import { useRef, useCallback, useEffect } from 'react'
import type { WallData, RoomData, ViewportState } from '@/types/inventory'
import type { Point } from '@/lib/canvas/geometry'
import { drawGrid, drawWall, worldToPixel } from '@/lib/canvas/renderer'
import { drawDoor, drawWindow, drawRoom } from '@/lib/canvas/renderer-rooms'
import { CANVAS_COLORS } from '@/lib/constants'

interface RenderParams {
  canvas: HTMLCanvasElement | null
  building: { rooms: { id: string; number: number; name: string; purpose: string; walls: WallData[] }[] } | null
  viewport: ViewportState
  tool: string
  drawState: { startPoint: Point | null; previewEnd: Point | null }
  selection: { selectedWallId: string | null; selectedRoomId: string | null }
  selectedRoomId: string | null
  snapPoint: Point | null
  mouseWorld: Point
}

/** Main render loop for the Canvas editor */
export function useCanvasRender(params: RenderParams) {
  const animRef = useRef<number>(0)

  const render = useCallback(() => {
    const { canvas } = params
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth, h = canvas.clientHeight
    canvas.width = w * dpr; canvas.height = h * dpr
    ctx.scale(dpr, dpr)
    const rc = { ctx, width: w, height: h, zoom: params.viewport.zoom, panX: params.viewport.panX, panY: params.viewport.panY }

    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h)
    drawGrid(rc)

    const rooms = params.building?.rooms ?? []
    const allWalls: WallData[] = []
    for (const room of rooms) {
      const isSel = room.id === params.selectedRoomId || room.id === params.selection.selectedRoomId
      drawRoom(rc, room, isSel)
      allWalls.push(...room.walls)
    }
    for (const wall of allWalls) {
      drawWall(rc, wall, wall.id === params.selection.selectedWallId)
    }
    for (const wall of allWalls) {
      for (const op of wall.openings) {
        if (op.openingType === 'door') drawDoor(rc, wall, op)
        else drawWindow(rc, wall, op)
      }
    }

    if (params.tool === 'wall' && params.drawState.startPoint && params.drawState.previewEnd) {
      drawWallPreview(rc, params.drawState.startPoint, params.drawState.previewEnd)
    }
    if (params.snapPoint) drawSnapIndicator(rc, params.snapPoint)
    if (params.tool === 'wall' || params.tool === 'opening') drawCrosshair(rc, params.mouseWorld)
    drawNorthArrow(rc)
  }, [params])

  useEffect(() => {
    const loop = () => { render(); animRef.current = requestAnimationFrame(loop) }
    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [render])
}

function drawWallPreview(rc: RC, start: Point, end: Point): void {
  const { ctx } = rc
  const [sx, sy] = worldToPixel(start[0], start[1], rc)
  const [ex, ey] = worldToPixel(end[0], end[1], rc)
  ctx.strokeStyle = CANVAS_COLORS.wallPreview; ctx.lineWidth = 2; ctx.setLineDash([6, 4])
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([])
  ctx.fillStyle = '#059669'; ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI * 2); ctx.fill()
  const lenM = Math.sqrt((end[0] - start[0]) ** 2 + (end[1] - start[1]) ** 2)
  if (lenM > 0.05) {
    ctx.fillStyle = CANVAS_COLORS.wallPreview
    ctx.font = `${Math.max(10, 12 * Math.min(rc.zoom, 2))}px sans-serif`; ctx.textAlign = 'center'
    ctx.fillText(`${lenM.toFixed(2)}m`, (sx + ex) / 2, (sy + ey) / 2 - 12)
  }
}

type RC = { ctx: CanvasRenderingContext2D; width: number; height: number; zoom: number; panX: number; panY: number }

function drawSnapIndicator(rc: RC, point: Point): void {
  const [px, py] = worldToPixel(point[0], point[1], rc)
  rc.ctx.fillStyle = CANVAS_COLORS.snapIndicator; rc.ctx.beginPath(); rc.ctx.arc(px, py, 6, 0, Math.PI * 2); rc.ctx.fill()
  rc.ctx.strokeStyle = '#f59e0b'; rc.ctx.lineWidth = 2; rc.ctx.beginPath(); rc.ctx.arc(px, py, 8, 0, Math.PI * 2); rc.ctx.stroke()
}

function drawCrosshair(rc: RC, mouse: Point): void {
  const [px, py] = worldToPixel(mouse[0], mouse[1], rc)
  rc.ctx.strokeStyle = CANVAS_COLORS.crosshair; rc.ctx.lineWidth = 0.5; rc.ctx.globalAlpha = 0.3
  rc.ctx.beginPath(); rc.ctx.moveTo(px, 0); rc.ctx.lineTo(px, rc.height); rc.ctx.stroke()
  rc.ctx.beginPath(); rc.ctx.moveTo(0, py); rc.ctx.lineTo(rc.width, py); rc.ctx.stroke()
  rc.ctx.globalAlpha = 1
}

function drawNorthArrow(rc: RC): void {
  const { ctx, width } = rc; const cx = width - 40, cy = 40, r = 16
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()
  ctx.fillStyle = '#374151'; ctx.beginPath(); ctx.moveTo(cx, cy - r + 2); ctx.lineTo(cx - 4, cy - 2); ctx.lineTo(cx + 4, cy - 2); ctx.closePath(); ctx.fill()
  ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('N', cx, cy + r + 12)
}

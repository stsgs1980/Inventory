'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { EditorTool, WallData, RoomData, ViewportState } from '@/types/inventory'
import type { Point } from '@/lib/canvas/geometry'
import { useBuildingData } from '@/hooks/use-building-data'
import { useToast } from '@/hooks/use-toast'
import {
  processWallToolClick, updateWallPreview, processOpeningToolClick,
  processSelectToolClick,
  type WallDrawState, type SelectionState,
} from '@/lib/canvas/tools'
import { findSnapPoint } from '@/lib/canvas/snap'
import { createWallAPI, createOpeningAPI, deleteWallAPI } from '@/lib/canvas/api'
import {
  GRID_MINOR_M, WALL_SELECT_THRESHOLD_M, DEFAULT_THICKNESS_PORTANT,
  DEFAULT_THICKNESS_DESPARTITOR, DEFAULT_ZOOM, MIN_ZOOM, MAX_ZOOM, ZOOM_FACTOR,
} from '@/lib/constants'

export function useCanvasEditor(buildingId: string | null) {
  const { building, refresh } = useBuildingData(buildingId)
  const { toast } = useToast()

  const [tool, setTool] = useState<EditorTool>('wall')
  const [wallType, setWallType] = useState<'portant' | 'despartitor'>('portant')
  const [openingType, setOpeningType] = useState<'door' | 'window'>('door')
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [drawState, setDrawState] = useState<WallDrawState>({ startPoint: null, previewEnd: null })
  const [selection, setSelection] = useState<SelectionState>({
    selectedWallId: null, selectedRoomId: null, dragStart: null, dragCurrent: null,
  })
  const [viewport, setViewport] = useState<ViewportState>({ zoom: DEFAULT_ZOOM, panX: 0, panY: 0 })
  const [mouseWorld, setMouseWorld] = useState<Point>([0, 0])
  const [snapPoint, setSnapPoint] = useState<Point | null>(null)

  const isPanning = useRef(false)
  const lastPanPixel = useRef<[number, number]>([0, 0])
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!selectedRoomId && building?.rooms?.length) {
      setSelectedRoomId(building.rooms[0].id)
    }
  }, [building, selectedRoomId])

  const pixelToWorld = useCallback((px: number, py: number): Point => {
    const canvas = canvasRef.current
    if (!canvas) return [0, 0]
    const w = canvas.clientWidth, h = canvas.clientHeight
    const wx = (px - viewport.panX - w / 2) / (1000 * viewport.zoom)
    const wy = -(py - viewport.panY - h / 2) / (1000 * viewport.zoom)
    return [wx, wy]
  }, [viewport])

  const handleMouseMove = useCallback((e: React.PointerEvent) => {
    if (isPanning.current) {
      const dx = e.clientX - lastPanPixel.current[0]
      const dy = e.clientY - lastPanPixel.current[1]
      setViewport(v => ({ ...v, panX: v.panX + dx, panY: v.panY + dy }))
      lastPanPixel.current = [e.clientX, e.clientY]
      return
    }
    const world = pixelToWorld(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
    setMouseWorld(world)
    const walls = building?.rooms.flatMap(r => r.walls) ?? []
    const snapCtx = {
      mouseWorld: world,
      walls: walls.map(w => ({ startX: w.startX, startY: w.startY, endX: w.endX, endY: w.endY })),
      gridStep: GRID_MINOR_M, snapThreshold: WALL_SELECT_THRESHOLD_M,
    }
    const snap = findSnapPoint(snapCtx)
    setSnapPoint(snap ? [snap.x, snap.y] : null)
    if (tool === 'wall' && drawState.startPoint) {
      setDrawState(prev => ({ ...prev, previewEnd: snap ? [snap.x, snap.y] : world }))
    }
  }, [tool, drawState, building, pixelToWorld])

  const handleClick = useCallback((e: React.PointerEvent) => {
    if (isPanning.current) return
    const world = snapPoint ?? pixelToWorld(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
    const walls = building?.rooms.flatMap(r => r.walls) ?? []
    const rooms = building?.rooms ?? []

    if (tool === 'wall') {
      const thickness = wallType === 'portant' ? DEFAULT_THICKNESS_PORTANT : DEFAULT_THICKNESS_DESPARTITOR
      const { action, newState } = processWallToolClick(world, drawState, wallType, thickness, selectedRoomId)
      setDrawState(newState)
      if (action.type === 'create-wall') {
        createWallAPI(action).then(ok => {
          if (ok) { refresh(); toast({ title: 'Perete adaugat' }) }
        })
      }
    } else if (tool === 'opening') {
      const dw = openingType === 'door' ? 0.9 : 1.2
      const dh = openingType === 'door' ? 2.1 : 1.5
      const action = processOpeningToolClick(world, walls, openingType, dw, dh)
      if (action.type === 'create-opening') {
        createOpeningAPI(action).then(ok => {
          if (ok) { refresh(); toast({ title: 'Gol adaugat' }) }
        })
      }
    } else if (tool === 'select') {
      const action = processSelectToolClick(world, walls, rooms)
      if (action.type === 'select-wall') setSelection(s => ({ ...s, selectedWallId: action.wallId }))
      else if (action.type === 'select-room') {
        setSelection(s => ({ ...s, selectedRoomId: action.roomId }))
        setSelectedRoomId(action.roomId)
      }
    }
  }, [tool, drawState, wallType, openingType, selectedRoomId, snapPoint, building, pixelToWorld, refresh, toast])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 1 || (e.button === 0 && (e.shiftKey || e.ctrlKey))) {
      isPanning.current = true; lastPanPixel.current = [e.clientX, e.clientY]; e.preventDefault()
    }
  }, [])

  const handlePointerUp = useCallback(() => { isPanning.current = false }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 1 / ZOOM_FACTOR : ZOOM_FACTOR
    setViewport(v => {
      const newZoom = Math.min(Math.max(v.zoom * factor, MIN_ZOOM), MAX_ZOOM)
      const rect = canvasRef.current?.getBoundingClientRect()
      if (rect) {
        const mx = e.clientX - rect.left - rect.width / 2
        const my = e.clientY - rect.top - rect.height / 2
        const scale = newZoom / v.zoom
        return { zoom: newZoom, panX: v.panX * scale + mx * (1 - scale), panY: v.panY * scale + my * (1 - scale) }
      }
      return { ...v, zoom: newZoom }
    })
  }, [])

  const cancelDraw = useCallback(() => { setDrawState({ startPoint: null, previewEnd: null }) }, [])

  const deleteSelectedWall = useCallback(async () => {
    if (!selection.selectedWallId) return
    const ok = await deleteWallAPI(selection.selectedWallId)
    if (ok) { setSelection(s => ({ ...s, selectedWallId: null })); refresh(); toast({ title: 'Perete sters' }) }
  }, [selection.selectedWallId, refresh, toast])

  return {
    building, refresh, tool, setTool, wallType, setWallType,
    openingType, setOpeningType, selectedRoomId, setSelectedRoomId,
    drawState, selection, viewport, setViewport,
    mouseWorld, snapPoint, canvasRef,
    handleClick, handleMouseMove, handlePointerDown, handlePointerUp, handleWheel,
    cancelDraw, deleteSelectedWall,
  }
}

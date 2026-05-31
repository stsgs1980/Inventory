'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { BuildingData, EditorMode } from '@/types/inventory'
import { useBuildingData } from '@/hooks/use-building-data'
import {
  snapToGrid, nearestCompassDirection, pointToSegmentDistance,
  isPointInPolygon, mToSvg, PLAN_ORIGIN, GRID_STEP_M
} from '@/lib/plan-utils'
import { buildRoomPolygon } from '@/lib/dxf/utils'
import { DEFAULT_THICKNESS_PORTANT, DEFAULT_THICKNESS_DESPARTITOR, M_TO_MM } from '@/lib/constants'
import { useToast } from '@/hooks/use-toast'

export function useFloorPlan(currentBuildingId: string | null) {
  const { building, refresh } = useBuildingData(currentBuildingId)
  const { toast } = useToast()

  const [mode, setMode] = useState<EditorMode>('view')
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [wallTypeForDraw, setWallTypeForDraw] = useState<'portant' | 'despartitor'>('portant')
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([])
  const [mouseWorldM, setMouseWorldM] = useState<[number, number]>([0, 0])
  const [openingFormWallId, setOpeningFormWallId] = useState<string | null>(null)
  const [openingFormWallIndex, setOpeningFormWallIndex] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 })

  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (mode === 'draw' && !selectedRoomId && building?.rooms?.length) {
      setSelectedRoomId(building.rooms[0].id)
    }
  }, [mode, selectedRoomId, building])

  useEffect(() => { setDrawPoints([]) }, [selectedRoomId])

  const completeWalls = useCallback(async () => {
    if (!selectedRoomId || drawPoints.length < 2) return
    const room = building?.rooms.find(r => r.id === selectedRoomId)
    if (!room) return
    const existingCount = room.walls.length
    for (let i = 0; i < drawPoints.length - 1; i++) {
      const [x1, y1] = drawPoints[i]
      const [x2, y2] = drawPoints[i + 1]
      const dx = x2 - x1, dy = y2 - y1
      const length = Math.sqrt(dx * dx + dy * dy)
      if (length < 0.05) continue
      const direction = nearestCompassDirection(dx, dy)
      const thickness = wallTypeForDraw === 'portant' ? DEFAULT_THICKNESS_PORTANT : DEFAULT_THICKNESS_DESPARTITOR
      try {
        await fetch('/api/walls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId: selectedRoomId, direction, length: parseFloat(length.toFixed(2)), thickness, wallType: wallTypeForDraw, orderIndex: existingCount + i }),
        })
      } catch (error) { console.error('Error creating wall:', error) }
    }
    setDrawPoints([])
    refresh()
    toast({ title: 'Pereti adaugati', description: `${drawPoints.length - 1} perete trasat pe plan` })
  }, [selectedRoomId, drawPoints, building, wallTypeForDraw, refresh, toast])

  const screenToWorld = useCallback((clientX: number, clientY: number): [number, number] | null => {
    const svg = svgRef.current
    if (!svg || !building) return null
    const rect = svg.getBoundingClientRect()
    const vb = calculateViewBox()
    const vbObj = vb.viewBox
    const vbX = vbObj.x + ((clientX - rect.left) / rect.width) * vbObj.w
    const vbY = vbObj.y + ((clientY - rect.top) / rect.height) * vbObj.h
    const worldSvgX = (vbX / zoom) - (pan.x / zoom)
    const worldSvgY = (vbY / zoom) - (pan.y / zoom)
    const origin = PLAN_ORIGIN
    const xM = (worldSvgX - origin.x) / M_TO_MM
    const yM = -(worldSvgY - origin.y) / M_TO_MM
    return [xM, yM]
  }, [building, zoom, pan])

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (isPanning) return
    const worldM = screenToWorld(e.clientX, e.clientY)
    if (!worldM) return
    if (mode === 'draw' && selectedRoomId) {
      const sx = snapToGrid(worldM[0], GRID_STEP_M)
      const sy = snapToGrid(worldM[1], GRID_STEP_M)
      setDrawPoints(prev => [...prev, [sx, sy]])
    } else if (mode === 'opening') {
      findAndOpenWall(worldM[0], worldM[1])
    } else {
      findRoomByClick(worldM[0], worldM[1])
    }
  }, [isPanning, mode, selectedRoomId, screenToWorld, building])

  function findAndOpenWall(worldXM: number, worldYM: number) {
    if (!building) return
    const roomOrder = selectedRoomId
      ? [building.rooms.find(r => r.id === selectedRoomId), ...building.rooms.filter(r => r.id !== selectedRoomId)]
      : building.rooms
    let bestDist = Infinity, bestWallId: string | null = null, bestWallIndex = 0
    for (const room of roomOrder) {
      if (!room) continue
      const polygon = buildRoomPolygon(room.walls)
      for (let i = 0; i < room.walls.length; i++) {
        const start = polygon[i], end = polygon[i + 1] || polygon[0]
        if (!start || !end) continue
        const { dist } = pointToSegmentDistance(worldXM, worldYM, start[0], start[1], end[0], end[1])
        if (dist < bestDist) { bestDist = dist; bestWallId = room.walls[i].id; bestWallIndex = i }
      }
    }
    if (bestWallId && bestDist < 1.0) {
      setOpeningFormWallId(bestWallId)
      setOpeningFormWallIndex(bestWallIndex)
    }
  }

  function findRoomByClick(worldXM: number, worldYM: number) {
    if (!building) return
    for (const room of building.rooms) {
      const polygon = buildRoomPolygon(room.walls)
      if (isPointInPolygon(worldXM, worldYM, polygon)) { setSelectedRoomId(room.id); return }
    }
  }

  function calculateViewBox() {
    if (!building || building.rooms.length === 0) return { viewBox: { x: 0, y: 0, w: 10000, h: 8000 } }
    const origin = PLAN_ORIGIN
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const room of building.rooms) {
      const polygonM = buildRoomPolygon(room.walls)
      for (const point of polygonM) {
        const [sx, sy] = mToSvg(point[0], point[1], origin)
        minX = Math.min(minX, sx); minY = Math.min(minY, sy)
        maxX = Math.max(maxX, sx); maxY = Math.max(maxY, sy)
      }
    }
    for (const point of drawPoints) {
      const [sx, sy] = mToSvg(point[0], point[1], origin)
      minX = Math.min(minX, sx); minY = Math.min(minY, sy)
      maxX = Math.max(maxX, sx); maxY = Math.max(maxY, sy)
    }
    const pad = 2000
    return { viewBox: { x: minX - pad, y: minY - pad, w: Math.max(maxX - minX + pad * 2, 5000), h: Math.max(maxY - minY + pad * 2, 4000) } }
  }

  const handleMouseMove = useCallback((e: React.PointerEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastPanPoint.x
      const dy = e.clientY - lastPanPoint.y
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }))
      setLastPanPoint({ x: e.clientX, y: e.clientY })
      return
    }
    if (mode === 'draw') {
      const worldM = screenToWorld(e.clientX, e.clientY)
      if (!worldM) return
      setMouseWorldM([snapToGrid(worldM[0], GRID_STEP_M), snapToGrid(worldM[1], GRID_STEP_M)])
    }
  }, [isPanning, lastPanPoint, mode, screenToWorld])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 0 && (e.shiftKey || e.ctrlKey || mode === 'view')) {
      setIsPanning(true); setLastPanPoint({ x: e.clientX, y: e.clientY }); e.preventDefault()
    }
  }, [mode])

  const handlePointerUp = useCallback(() => { setIsPanning(false) }, [])

  return {
    building, mode, setMode, selectedRoomId, setSelectedRoomId,
    wallTypeForDraw, setWallTypeForDraw, drawPoints, setDrawPoints,
    mouseWorldM, openingFormWallId, setOpeningFormWallId,
    openingFormWallIndex, zoom, setZoom, pan, setPan,
    isPanning, svgRef, refresh, completeWalls, calculateViewBox,
    handleCanvasClick, handleMouseMove, handlePointerDown, handlePointerUp,
  }
}

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useInventoryStore } from '@/store/inventory-store'
import { buildRoomPolygon, calculateArea, polygonCenter } from '@/lib/dxf/utils'
import { DIR_VECTORS, M_TO_MM, DEFAULT_THICKNESS_PORTANT, DEFAULT_THICKNESS_DESPARTITOR } from '@/lib/constants'
import { AlertCircle, ZoomIn, ZoomOut, Move, Pencil, DoorOpen, MousePointer, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OpeningForm } from './opening-form'
import { useToast } from '@/hooks/use-toast'

// ---------- Types ----------

interface WallData {
  id: string
  direction: string
  length: number
  thickness: number
  wallType: string
  orderIndex: number
  openings: {
    id: string
    openingType: string
    wallIndex: number
    offset: number
    width: number
    height: number
  }[]
}

interface RoomData {
  id: string
  number: number
  name: string
  purpose: string
  interiorHeight: number
  walls: WallData[]
}

interface BuildingData {
  id: string
  letter: string
  floorType: string
  floorNumber: number
  interiorHeight: number
  rooms: RoomData[]
}

type EditorMode = 'view' | 'draw' | 'opening'

// ---------- Helpers ----------

const GRID_STEP_M = 0.1 // 10cm snap
const GRID_MAJOR_M = 1.0 // 1m major grid

function snapToGrid(val: number, step: number): number {
  return Math.round(val / step) * step
}

function nearestCompassDirection(dx: number, dy: number): string {
  const angle = Math.atan2(dy, dx) * (180 / Math.PI) // degrees, Y-up
  // Map angle to 8 compass directions
  // E=0, NE=45, N=90, NW=135, W=180/-180, SW=-135, S=-90, SE=-45
  const dirs = ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE']
  let idx = Math.round(angle / 45)
  if (idx < 0) idx += 8
  return dirs[idx % 8]
}

function pointToSegmentDistance(
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

// Convert meters (Y-up) to SVG coordinates (Y-down, with offset)
function mToSvg(xM: number, yM: number, origin: { x: number; y: number }): [number, number] {
  return [origin.x + xM * M_TO_MM, origin.y - yM * M_TO_MM]
}

// ---------- Component ----------

export function FloorPlan() {
  const { currentBuildingId } = useInventoryStore()
  const { toast } = useToast()
  const [building, setBuilding] = useState<BuildingData | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [mode, setMode] = useState<EditorMode>('view')
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [wallTypeForDraw, setWallTypeForDraw] = useState<'portant' | 'despartitor'>('portant')

  // Drawing state
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([])
  const [mouseWorldM, setMouseWorldM] = useState<[number, number]>([0, 0])

  // Opening placement state
  const [openingFormWallId, setOpeningFormWallId] = useState<string | null>(null)
  const [openingFormWallIndex, setOpeningFormWallIndex] = useState(0)

  // View state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 })

  const svgRef = useRef<SVGSVGElement>(null)

  // Load building
  useEffect(() => {
    if (!currentBuildingId) return
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/buildings/${currentBuildingId}`)
        if (res.ok && !cancelled) {
          const data = await res.json()
          setBuilding(data)
        }
      } catch (error) {
        console.error('Error loading building:', error)
      }
    }
    load()
    return () => { cancelled = true }
  }, [currentBuildingId, refreshKey])

  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  // When switching to draw mode, auto-select first room if none selected
  useEffect(() => {
    if (mode === 'draw' && !selectedRoomId && building?.rooms?.length) {
      setSelectedRoomId(building.rooms[0].id)
    }
  }, [mode, selectedRoomId, building])

  // Reset draw points when room changes
  useEffect(() => {
    setDrawPoints([])
  }, [selectedRoomId])

  // ---------- Drawing: complete a wall ----------
  async function completeWalls() {
    if (!selectedRoomId || drawPoints.length < 2) return
    const room = building?.rooms.find(r => r.id === selectedRoomId)
    if (!room) return

    // Convert draw points to walls
    const existingCount = room.walls.length
    for (let i = 0; i < drawPoints.length - 1; i++) {
      const [x1, y1] = drawPoints[i]
      const [x2, y2] = drawPoints[i + 1]
      const dx = x2 - x1
      const dy = y2 - y1
      const length = Math.sqrt(dx * dx + dy * dy)
      if (length < 0.05) continue

      const direction = nearestCompassDirection(dx, dy)
      const thickness = wallTypeForDraw === 'portant' ? DEFAULT_THICKNESS_PORTANT : DEFAULT_THICKNESS_DESPARTITOR

      try {
        await fetch('/api/walls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: selectedRoomId,
            direction,
            length: parseFloat(length.toFixed(2)),
            thickness,
            wallType: wallTypeForDraw,
            orderIndex: existingCount + i,
          }),
        })
      } catch (error) {
        console.error('Error creating wall:', error)
      }
    }

    setDrawPoints([])
    refresh()
    toast({ title: 'Pereti adaugati', description: `${drawPoints.length - 1} perete trasat pe plan` })
  }

  // ---------- Canvas click handler ----------
  function handleCanvasClick(e: React.PointerEvent) {
    if (isPanning) return
    const svg = svgRef.current
    if (!svg) return

    const rect = svg.getBoundingClientRect()
    const svgX = e.clientX - rect.left
    const svgY = e.clientY - rect.top

    if (mode === 'draw' && selectedRoomId) {
      // Convert SVG coords to world meters
      const worldM = svgToWorld(svgX, svgY, rect.width, rect.height)
      const sx = snapToGrid(worldM[0], GRID_STEP_M)
      const sy = snapToGrid(worldM[1], GRID_STEP_M)
      setDrawPoints(prev => [...prev, [sx, sy]])
    } else if (mode === 'opening') {
      // Find closest wall
      const worldM = svgToWorld(svgX, svgY, rect.width, rect.height)
      findAndOpenWall(worldM[0], worldM[1])
    } else {
      // View mode: select room by click
      const worldM = svgToWorld(svgX, svgY, rect.width, rect.height)
      findRoomByClick(worldM[0], worldM[1])
    }
  }

  // Convert SVG screen coords to world meters
  function svgToWorld(svgX: number, svgY: number, containerW: number, containerH: number): [number, number] {
    if (!building || !building.rooms.length) return [0, 0]
    const { viewBox } = calculateViewBox()
    // Convert svgX, svgY to viewBox coordinates
    const vbX = viewBox.x + (svgX / containerW) * viewBox.w
    const vbY = viewBox.y + (svgY / containerH) * viewBox.h
    // Convert viewBox coords to world meters (inverse of mToSvg)
    const origin = getOrigin()
    const xM = (vbX - origin.x) / M_TO_MM
    const yM = -(vbY - origin.y) / M_TO_MM
    return [xM, yM]
  }

  function getOrigin() {
    return { x: 1500, y: 1500 }
  }

  function findAndOpenWall(worldXM: number, worldYM: number) {
    if (!building) return
    for (const room of building.rooms) {
      const polygon = buildRoomPolygon(room.walls)
      for (let i = 0; i < room.walls.length; i++) {
        const start = polygon[i]
        const end = polygon[i + 1] || polygon[0]
        if (!start || !end) continue
        const { dist, t } = pointToSegmentDistance(worldXM, worldYM, start[0], start[1], end[0], end[1])
        if (dist < 0.5) { // Within 50cm
          setOpeningFormWallId(room.walls[i].id)
          setOpeningFormWallIndex(i)
          return
        }
      }
    }
  }

  function findRoomByClick(worldXM: number, worldYM: number) {
    if (!building) return
    for (const room of building.rooms) {
      const polygon = buildRoomPolygon(room.walls)
      if (isPointInPolygon(worldXM, worldYM, polygon)) {
        setSelectedRoomId(room.id)
        return
      }
    }
  }

  function isPointInPolygon(px: number, py: number, polygon: [number, number][]): boolean {
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

  // ---------- Calculate view box ----------
  function calculateViewBox() {
    if (!building || building.rooms.length === 0) {
      return { viewBox: { x: 0, y: 0, w: 10000, h: 8000 } }
    }

    const origin = getOrigin()
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    for (const room of building.rooms) {
      const polygonM = buildRoomPolygon(room.walls)
      for (const point of polygonM) {
        const [sx, sy] = mToSvg(point[0], point[1], origin)
        minX = Math.min(minX, sx)
        minY = Math.min(minY, sy)
        maxX = Math.max(maxX, sx)
        maxY = Math.max(maxY, sy)
      }
    }

    // Add draw points
    for (const point of drawPoints) {
      const [sx, sy] = mToSvg(point[0], point[1], origin)
      minX = Math.min(minX, sx)
      minY = Math.min(minY, sy)
      maxX = Math.max(maxX, sx)
      maxY = Math.max(maxY, sy)
    }

    const pad = 2000
    return {
      viewBox: {
        x: minX - pad,
        y: minY - pad,
        w: Math.max(maxX - minX + pad * 2, 5000),
        h: Math.max(maxY - minY + pad * 2, 4000),
      }
    }
  }

  // ---------- Mouse move for draw preview ----------
  function handleMouseMove(e: React.PointerEvent) {
    if (isPanning) {
      const dx = e.clientX - lastPanPoint.x
      const dy = e.clientY - lastPanPoint.y
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }))
      setLastPanPoint({ x: e.clientX, y: e.clientY })
      return
    }

    if (mode === 'draw') {
      const svg = svgRef.current
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      const worldM = svgToWorld(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height)
      setMouseWorldM([snapToGrid(worldM[0], GRID_STEP_M), snapToGrid(worldM[1], GRID_STEP_M)])
    }
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (e.button === 0 && (e.shiftKey || e.ctrlKey || mode === 'view')) {
      setIsPanning(true)
      setLastPanPoint({ x: e.clientX, y: e.clientY })
      e.preventDefault()
    }
  }

  function handlePointerUp() {
    setIsPanning(false)
  }

  // ---------- Undo last draw point ----------
  function undoLastPoint() {
    setDrawPoints(prev => prev.slice(0, -1))
  }

  // ---------- Clear all draw points ----------
  function clearDrawPoints() {
    setDrawPoints([])
  }

  // ---------- Render guards ----------
  if (!currentBuildingId) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500 text-sm">Selectati o cladire mai intai.</p>
      </div>
    )
  }

  if (!building || building.rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500 text-sm">Adaugati camere si pereti pentru a vedea planul.</p>
      </div>
    )
  }

  const { viewBox } = calculateViewBox()
  const origin = getOrigin()
  const selectedRoom = building.rooms.find(r => r.id === selectedRoomId)

  // ---------- SVG Render ----------
  return (
    <div className="relative w-full h-full min-h-[400px] flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-200 flex-wrap">
        {/* Mode buttons */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <Button
            variant={mode === 'view' ? 'default' : 'ghost'}
            size="sm"
            className={`h-8 text-xs ${mode === 'view' ? 'bg-emerald-600 text-white' : ''}`}
            onClick={() => { setMode('view'); setDrawPoints([]) }}
          >
            <MousePointer className="w-3 h-3 mr-1" />
            Vizualizare
          </Button>
          <Button
            variant={mode === 'draw' ? 'default' : 'ghost'}
            size="sm"
            className={`h-8 text-xs ${mode === 'draw' ? 'bg-emerald-600 text-white' : ''}`}
            onClick={() => { setMode('draw'); setDrawPoints([]) }}
          >
            <Pencil className="w-3 h-3 mr-1" />
            Desenare pereti
          </Button>
          <Button
            variant={mode === 'opening' ? 'default' : 'ghost'}
            size="sm"
            className={`h-8 text-xs ${mode === 'opening' ? 'bg-emerald-600 text-white' : ''}`}
            onClick={() => { setMode('opening'); setDrawPoints([]) }}
          >
            <DoorOpen className="w-3 h-3 mr-1" />
            Adauga goluri
          </Button>
        </div>

        {/* Room selector for draw/opening mode */}
        {(mode === 'draw' || mode === 'opening') && (
          <select
            className="h-8 text-xs border border-gray-300 rounded px-2 bg-white"
            value={selectedRoomId || ''}
            onChange={(e) => { setSelectedRoomId(e.target.value); setDrawPoints([]) }}
          >
            <option value="">-- Selectati camera --</option>
            {building.rooms.map(r => (
              <option key={r.id} value={r.id}>#{r.number} {r.name}</option>
            ))}
          </select>
        )}

        {/* Wall type selector for draw mode */}
        {mode === 'draw' && (
          <div className="flex items-center gap-1">
            <Button
              variant={wallTypeForDraw === 'portant' ? 'default' : 'outline'}
              size="sm"
              className={`h-8 text-xs ${wallTypeForDraw === 'portant' ? 'bg-red-600 text-white' : 'border-red-300 text-red-700'}`}
              onClick={() => setWallTypeForDraw('portant')}
            >
              Portant
            </Button>
            <Button
              variant={wallTypeForDraw === 'despartitor' ? 'default' : 'outline'}
              size="sm"
              className={`h-8 text-xs ${wallTypeForDraw === 'despartitor' ? 'bg-green-600 text-white' : 'border-green-300 text-green-700'}`}
              onClick={() => setWallTypeForDraw('despartitor')}
            >
              Despartitor
            </Button>
          </div>
        )}

        {/* Draw actions */}
        {mode === 'draw' && drawPoints.length > 0 && (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={undoLastPoint}>
              <RotateCcw className="w-3 h-3 mr-1" />
              Inapoi
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={clearDrawPoints}>
              Sterge tot
            </Button>
            {drawPoints.length >= 2 && (
              <Button
                size="sm"
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={completeWalls}
              >
                Salveaza pereti ({drawPoints.length - 1})
              </Button>
            )}
          </div>
        )}

        {/* Zoom controls */}
        <div className="flex items-center gap-1 ml-auto">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.min(z * 1.3, 8))}>
            <ZoomIn className="w-3 h-3" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.max(z / 1.3, 0.2))}>
            <ZoomOut className="w-3 h-3" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}>
            <Move className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Mode hint */}
      {mode === 'draw' && (
        <div className="px-3 py-1.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-700">
          {selectedRoomId
            ? `Camera #${selectedRoom?.number} ${selectedRoom?.name}: apasati pe grid pentru a plasa puncte. ${drawPoints.length > 0 ? `Puncte: ${drawPoints.length}. ` : ''}Puteti desena mai multi pereti odata.`
            : 'Selectati o camera din lista de mai sus.'}
        </div>
      )}
      {mode === 'opening' && (
        <div className="px-3 py-1.5 bg-blue-50 border-b border-blue-200 text-xs text-blue-700">
          {selectedRoomId
            ? `Apasati pe un peret al camerei #${selectedRoom?.number} pentru a adauga usa sau fereastra.`
            : 'Selectati o camera din lista de mai sus.'}
        </div>
      )}

      {/* SVG Canvas */}
      <div className="flex-1 relative overflow-hidden bg-gray-50">
        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{ touchAction: 'manipulation', cursor: isPanning ? 'grabbing' : mode === 'draw' ? 'crosshair' : mode === 'opening' ? 'pointer' : 'default' }}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handleMouseMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onClick={handleCanvasClick}
          onWheel={(e) => {
            e.preventDefault()
            const factor = e.deltaY > 0 ? 0.9 : 1.1
            setZoom(z => Math.min(Math.max(z * factor, 0.2), 8))
          }}
        >
          <g transform={`scale(${zoom}) translate(${pan.x / zoom}, ${pan.y / zoom})`}>
            {/* Grid */}
            {renderGrid(viewBox, origin)}

            {/* North arrow */}
            {renderNorthArrow(origin, viewBox)}

            {/* Rooms */}
            {building.rooms.map(room => {
              const isSelected = room.id === selectedRoomId
              return renderRoom(room, origin, isSelected)
            })}

            {/* Draw preview */}
            {mode === 'draw' && drawPoints.length > 0 && renderDrawPreview(origin)}

            {/* Snap indicator */}
            {mode === 'draw' && renderSnapCursor(origin)}
          </g>
        </svg>

        {/* Legend */}
        <div className="absolute bottom-2 left-2 bg-white/90 rounded-lg p-2 text-xs space-y-1 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-red-500 rounded" />
            <span>Portant</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-green-500 rounded" />
            <span>Despartitor</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-cyan-500 rounded" />
            <span>Incaperi</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-fuchsia-500 rounded" />
            <span>Goluri (usi/ferestre)</span>
          </div>
        </div>

        {/* Draw point count */}
        {mode === 'draw' && drawPoints.length > 0 && (
          <div className="absolute bottom-2 right-2 bg-white/90 rounded-lg px-3 py-2 text-xs shadow-sm">
            <span className="text-gray-600">Puncte: {drawPoints.length}</span>
            {drawPoints.length >= 2 && (
              <span className="text-gray-600 ml-2">
                | Pereti: {drawPoints.length - 1}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Opening form dialog */}
      {openingFormWallId && (
        <OpeningForm
          open={!!openingFormWallId}
          onOpenChange={(open) => { if (!open) setOpeningFormWallId(null) }}
          wallId={openingFormWallId}
          wallIndex={openingFormWallIndex}
          onSubmit={refresh}
        />
      )}
    </div>
  )

  // ---------- Sub-renderers ----------

  function renderGrid(vb: { x: number; y: number; w: number; h: number }, orig: { x: number; y: number }) {
    const lines: React.ReactNode[] = []
    // Major grid lines every 1m (1000mm)
    const startX = Math.floor((vb.x - orig.x) / 1000) * 1000 + orig.x
    const endX = vb.x + vb.w
    const startY = Math.floor((vb.y - orig.y) / 1000) * 1000 + orig.y
    const endY = vb.y + vb.h

    for (let x = startX; x <= endX; x += 1000) {
      const isOrigin = Math.abs(x - orig.x) < 1
      lines.push(
        <line
          key={`gx-${x}`}
          x1={x} y1={vb.y} x2={x} y2={vb.y + vb.h}
          stroke={isOrigin ? '#94a3b8' : '#e5e7eb'}
          strokeWidth={isOrigin ? 2 : 0.5}
        />
      )
    }
    for (let y = startY; y <= endY; y += 1000) {
      const isOrigin = Math.abs(y - orig.y) < 1
      lines.push(
        <line
          key={`gy-${y}`}
          x1={vb.x} y1={y} x2={vb.x + vb.w} y2={y}
          stroke={isOrigin ? '#94a3b8' : '#e5e7eb'}
          strokeWidth={isOrigin ? 2 : 0.5}
        />
      )
    }

    // Meter labels along axes
    for (let x = startX; x <= endX; x += 1000) {
      const meters = Math.round((x - orig.x) / 1000)
      if (meters === 0) continue
      lines.push(
        <text
          key={`lx-${x}`}
          x={x} y={orig.y + 200}
          fill="#94a3b8" fontSize={100} textAnchor="middle"
        >
          {meters}m
        </text>
      )
    }
    for (let y = startY; y <= endY; y += 1000) {
      const meters = -Math.round((y - orig.y) / 1000)
      if (meters === 0) continue
      lines.push(
        <text
          key={`ly-${y}`}
          x={orig.x + 200} y={y}
          fill="#94a3b8" fontSize={100} textAnchor="start"
        >
          {meters}m
        </text>
      )
    }

    return <g>{lines}</g>
  }

  function renderNorthArrow(orig: { x: number; y: number }, vb: { x: number; y: number; w: number; h: number }) {
    const cx = vb.x + vb.w - 800
    const cy = vb.y + 800
    return (
      <g>
        <circle cx={cx} cy={cy} r={350} fill="white" stroke="#94a3b8" strokeWidth={2} />
        <line x1={cx} y1={cy + 250} x2={cx} y2={cy - 250} stroke="#374151" strokeWidth={3} />
        <polygon points={`${cx},${cy - 280} ${cx - 60},${cy - 180} ${cx + 60},${cy - 180}`} fill="#374151" />
        <text x={cx} y={cy - 320} fill="#374151" fontSize={120} textAnchor="middle" fontWeight="bold">N</text>
      </g>
    )
  }

  function renderRoom(room: RoomData, orig: { x: number; y: number }, isSelected: boolean) {
    const polygonM = buildRoomPolygon(room.walls)
    if (polygonM.length < 2) return null

    // Convert all polygon points to SVG coords ONCE
    const polySvg: [number, number][] = polygonM.map(p => mToSvg(p[0], p[1], orig))
    const area = calculateArea(room.walls)
    const [cxSvg, cySvg] = polygonCenter(polySvg)

    return (
      <g key={room.id} opacity={isSelected ? 1 : 0.85}>
        {/* Room fill */}
        <polygon
          points={polySvg.map(p => `${p[0]},${p[1]}`).join(' ')}
          fill={isSelected ? '#ecfdf5' : '#f9fafb'}
          stroke={isSelected ? '#059669' : '#06b6d4'}
          strokeWidth={isSelected ? 3 : 1.5}
          strokeDasharray={room.walls.length >= 3 && !isPolygonClosed(polygonM) ? '8 4' : undefined}
        />

        {/* Walls */}
        {room.walls.map((wall, wallIdx) => {
          const start = polySvg[wallIdx]
          const end = polySvg[wallIdx + 1] || polySvg[0]
          if (!start || !end) return null
          return renderWall(wall, start, end, wallIdx, room.id, orig)
        })}

        {/* Room label */}
        <text
          x={cxSvg} y={cySvg - 120}
          fill="#0e7490" fontSize={180} fontWeight="bold"
          textAnchor="middle" dominantBaseline="middle"
        >
          {room.number}
        </text>
        <text
          x={cxSvg} y={cySvg + 80}
          fill="#0e7490" fontSize={140}
          textAnchor="middle" dominantBaseline="middle"
        >
          {area.toFixed(1).replace('.', ',')} m2
        </text>
        <text
          x={cxSvg} y={cySvg + 250}
          fill="#6b7280" fontSize={100}
          textAnchor="middle" dominantBaseline="middle"
        >
          {room.name}
        </text>
      </g>
    )
  }

  function renderWall(
    wall: WallData,
    startSvg: [number, number],
    endSvg: [number, number],
    wallIdx: number,
    roomId: string,
    orig: { x: number; y: number }
  ) {
    const wallColor = wall.wallType === 'portant' ? '#ef4444' : '#22c55e'
    const [sx, sy] = startSvg
    const [ex, ey] = endSvg

    const dx = ex - sx
    const dy = ey - sy
    const lengthSvg = Math.sqrt(dx * dx + dy * dy)
    if (lengthSvg < 0.01) return null

    const nx = -dy / lengthSvg
    const ny = dx / lengthSvg
    const half = wall.thickness / 2.0

    // Four lines forming the wall rectangle
    const lines = [
      { x1: sx + nx * half, y1: sy + ny * half, x2: ex + nx * half, y2: ey + ny * half },
      { x1: sx - nx * half, y1: sy - ny * half, x2: ex - nx * half, y2: ey - ny * half },
      { x1: sx + nx * half, y1: sy + ny * half, x2: sx - nx * half, y2: sy - ny * half },
      { x1: ex + nx * half, y1: ey + ny * half, x2: ex - nx * half, y2: ey - ny * half },
    ]

    // Direction label for opening mode
    const isHighlighted = mode === 'opening' && selectedRoomId === roomId

    return (
      <g key={`wall-${roomId}-${wallIdx}`}>
        {/* Wall lines */}
        {lines.map((line, li) => (
          <line
            key={li}
            x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
            stroke={wallColor} strokeWidth={2}
          />
        ))}

        {/* Invisible thick line for easier clicking in opening mode */}
        {isHighlighted && (
          <line
            x1={sx} y1={sy} x2={ex} y2={ey}
            stroke="transparent" strokeWidth={Math.max(wall.thickness, 300)}
            style={{ cursor: 'pointer' }}
          />
        )}

        {/* Wall direction indicator */}
        <text
          x={(sx + ex) / 2 + nx * 300}
          y={(sy + ey) / 2 + ny * 300}
          fill={wallColor}
          fontSize={90}
          textAnchor="middle"
          dominantBaseline="middle"
          opacity={0.7}
        >
          {wall.direction}
        </text>

        {/* Dimension label */}
        <text
          x={(sx + ex) / 2 + nx * 600}
          y={(sy + ey) / 2 + ny * 600}
          fill="#06b6d4"
          fontSize={100}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {wall.length.toFixed(2).replace('.', ',')}m
        </text>

        {/* Openings */}
        {wall.openings.map((opening, oi) =>
          renderOpening(opening, sx, sy, ex, ey, lengthSvg, wall.thickness, oi)
        )}
      </g>
    )
  }

  function renderOpening(
    opening: { openingType: string; offset: number; width: number; height: number },
    wallStartSvgX: number, wallStartSvgY: number,
    wallEndSvgX: number, wallEndSvgY: number,
    wallLengthSvg: number,
    wallThickness: number,
    key: number
  ) {
    const dx = wallEndSvgX - wallStartSvgX
    const dy = wallEndSvgY - wallStartSvgY
    const ux = dx / wallLengthSvg
    const uy = dy / wallLengthSvg
    const nx = -uy
    const ny = ux

    const offsetMm = opening.offset * M_TO_MM
    const widthMm = opening.width * M_TO_MM

    const opSx = wallStartSvgX + ux * offsetMm
    const opSy = wallStartSvgY + uy * offsetMm
    const opEx = wallStartSvgX + ux * (offsetMm + widthMm)
    const opEy = wallStartSvgY + uy * (offsetMm + widthMm)

    if (opening.openingType === 'door') {
      // Door: base line from start to end of opening + arc showing swing
      const radius = widthMm
      const arcEndX = opSx + nx * radius
      const arcEndY = opSy + ny * radius

      // Calculate arc sweep
      const startAngle = Math.atan2(0, 0)
      const endAngle = Math.atan2(arcEndY - opSy, arcEndX - opSx)

      return (
        <g key={key}>
          {/* Door base line */}
          <line
            x1={opSx} y1={opSy} x2={opEx} y2={opEy}
            stroke="#d946ef" strokeWidth={2.5}
          />
          {/* Door swing arc */}
          <path
            d={`M ${opSx} ${opSy} A ${radius} ${radius} 0 0 0 ${arcEndX} ${arcEndY}`}
            fill="none" stroke="#d946ef" strokeWidth={1.5} strokeDasharray="6 3"
          />
          {/* Door type label */}
          <text
            x={(opSx + opEx) / 2 + nx * 200}
            y={(opSy + opEy) / 2 + ny * 200}
            fill="#d946ef" fontSize={80} textAnchor="middle"
          >
            U
          </text>
        </g>
      )
    } else {
      // Window: two parallel lines across wall thickness
      const offset1 = wallThickness * 0.3
      const offset2 = -wallThickness * 0.3
      return (
        <g key={key}>
          <line
            x1={opSx + nx * offset1} y1={opSy + ny * offset1}
            x2={opEx + nx * offset1} y2={opEy + ny * offset1}
            stroke="#d946ef" strokeWidth={2.5}
          />
          <line
            x1={opSx + nx * offset2} y1={opSy + ny * offset2}
            x2={opEx + nx * offset2} y2={opEy + ny * offset2}
            stroke="#d946ef" strokeWidth={2.5}
          />
          {/* Window type label */}
          <text
            x={(opSx + opEx) / 2 + nx * 200}
            y={(opSy + opEy) / 2 + ny * 200}
            fill="#d946ef" fontSize={80} textAnchor="middle"
          >
            F
          </text>
        </g>
      )
    }
  }

  function renderDrawPreview(orig: { x: number; y: number }) {
    const elements: React.ReactNode[] = []
    const wallColor = wallTypeForDraw === 'portant' ? '#ef4444' : '#22c55e'
    const thickness = wallTypeForDraw === 'portant' ? DEFAULT_THICKNESS_PORTANT : DEFAULT_THICKNESS_DESPARTITOR

    // Draw completed segments
    for (let i = 0; i < drawPoints.length - 1; i++) {
      const [sx, sy] = mToSvg(drawPoints[i][0], drawPoints[i][1], orig)
      const [ex, ey] = mToSvg(drawPoints[i + 1][0], drawPoints[i + 1][1], orig)

      const dx = ex - sx
      const dy = ey - sy
      const len = Math.sqrt(dx * dx + dy * dy)
      if (len < 0.01) continue

      const nx = -dy / len
      const ny = dx / len
      const half = thickness / 2.0

      // Wall rectangle
      const lines = [
        { x1: sx + nx * half, y1: sy + ny * half, x2: ex + nx * half, y2: ey + ny * half },
        { x1: sx - nx * half, y1: sy - ny * half, x2: ex - nx * half, y2: ey - ny * half },
        { x1: sx + nx * half, y1: sy + ny * half, x2: sx - nx * half, y2: sy - ny * half },
        { x1: ex + nx * half, y1: ey + ny * half, x2: ex - nx * half, y2: ey - ny * half },
      ]

      elements.push(
        <g key={`draw-seg-${i}`}>
          {lines.map((l, li) => (
            <line key={li} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke={wallColor} strokeWidth={2} opacity={0.7} />
          ))}
          {/* Direction and length */}
          {(() => {
            const ddx = drawPoints[i + 1][0] - drawPoints[i][0]
            const ddy = drawPoints[i + 1][1] - drawPoints[i][1]
            const distM = Math.sqrt(ddx * ddx + ddy * ddy)
            const dir = nearestCompassDirection(ddx, ddy)
            return (
              <text
                x={(sx + ex) / 2 + nx * 500}
                y={(sy + ey) / 2 + ny * 500}
                fill={wallColor} fontSize={100} textAnchor="middle"
                opacity={0.8}
              >
                {dir} {distM.toFixed(2)}m
              </text>
            )
          })()}
        </g>
      )
    }

    // Draw point markers
    for (let i = 0; i < drawPoints.length; i++) {
      const [px, py] = mToSvg(drawPoints[i][0], drawPoints[i][1], orig)
      elements.push(
        <circle key={`draw-pt-${i}`} cx={px} cy={py} r={50}
          fill={i === 0 ? '#059669' : wallColor} stroke="white" strokeWidth={2} />
      )
    }

    // Preview line from last point to mouse
    if (drawPoints.length > 0) {
      const [lastX, lastY] = mToSvg(drawPoints[drawPoints.length - 1][0], drawPoints[drawPoints.length - 1][1], orig)
      const [mouseSvgX, mouseSvgY] = mToSvg(mouseWorldM[0], mouseWorldM[1], orig)

      elements.push(
        <line
          x1={lastX} y1={lastY} x2={mouseSvgX} y2={mouseSvgY}
          stroke={wallColor} strokeWidth={1.5} strokeDasharray="8 4" opacity={0.5}
        />
      )

      // Preview distance label
      const ddx = mouseWorldM[0] - drawPoints[drawPoints.length - 1][0]
      const ddy = mouseWorldM[1] - drawPoints[drawPoints.length - 1][1]
      const distM = Math.sqrt(ddx * ddx + ddy * ddy)
      if (distM > 0.05) {
        const dir = nearestCompassDirection(ddx, ddy)
        const midSvgX = (lastX + mouseSvgX) / 2
        const midSvgY = (lastY + mouseSvgY) / 2
        elements.push(
          <text
            x={midSvgX} y={midSvgY - 200}
            fill="#6b7280" fontSize={100} textAnchor="middle"
            opacity={0.7}
          >
            {dir} {distM.toFixed(2)}m
          </text>
        )
      }
    }

    return <g>{elements}</g>
  }

  function renderSnapCursor(orig: { x: number; y: number }) {
    const [svgX, svgY] = mToSvg(mouseWorldM[0], mouseWorldM[1], orig)
    return (
      <g>
        <circle cx={svgX} cy={svgY} r={30} fill="#059669" opacity={0.4} />
        <line x1={svgX - 80} y1={svgY} x2={svgX + 80} y2={svgY} stroke="#059669" strokeWidth={1} opacity={0.3} />
        <line x1={svgX} y1={svgY - 80} x2={svgX} y2={svgY + 80} stroke="#059669" strokeWidth={1} opacity={0.3} />
      </g>
    )
  }
}

// Helper: check if polygon is closed
function isPolygonClosed(points: [number, number][]): boolean {
  if (points.length < 2) return false
  const last = points[points.length - 1]
  return Math.abs(last[0]) < 0.01 && Math.abs(last[1]) < 0.01
}

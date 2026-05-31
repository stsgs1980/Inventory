'use client'

import { useState, useEffect, useRef } from 'react'
import { useInventoryStore } from '@/store/inventory-store'
import { buildRoomPolygon, calculateArea, polygonCenter } from '@/lib/dxf/utils'
import { M_TO_MM, ROOM_SPACING_MM } from '@/lib/constants'
import { AlertCircle, ZoomIn, ZoomOut, Move } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WallData {
  direction: string
  length: number
  thickness: number
  wallType: string
  openings: {
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
  walls: WallData[]
}

interface BuildingData {
  id: string
  rooms: RoomData[]
}

export function FloorPlan() {
  const { currentBuildingId } = useInventoryStore()
  const [building, setBuilding] = useState<BuildingData | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 })
  const svgRef = useRef<SVGSVGElement>(null)

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
  }, [currentBuildingId])

  // Pan handlers
  function handlePointerDown(e: React.PointerEvent) {
    if (e.button === 0 && (e.shiftKey || e.ctrlKey)) {
      setIsPanning(true)
      setLastPanPoint({ x: e.clientX, y: e.clientY })
      e.preventDefault()
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (isPanning) {
      const dx = e.clientX - lastPanPoint.x
      const dy = e.clientY - lastPanPoint.y
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }))
      setLastPanPoint({ x: e.clientX, y: e.clientY })
    }
  }

  function handlePointerUp() {
    setIsPanning(false)
  }

  if (!currentBuildingId) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500 text-sm">
          Selectati o cladire mai intai.
        </p>
      </div>
    )
  }

  if (!building || building.rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500 text-sm">
          Adaugati camere si pereti pentru a vedea planul.
        </p>
      </div>
    )
  }

  // Calculate room positions (left to right with spacing)
  const roomPositions: { x: number; y: number; width: number; height: number }[] = []
  let currentX = 0

  for (const room of building.rooms) {
    const polygonM = buildRoomPolygon(room.walls)
    let width = 3000
    let height = 3000

    if (polygonM.length > 0) {
      const xs = polygonM.map(p => p[0])
      const ys = polygonM.map(p => p[1])
      width = (Math.max(...xs) - Math.min(...xs)) * M_TO_MM
      height = (Math.max(...ys) - Math.min(...ys)) * M_TO_MM
      width = Math.max(width, 1000)
      height = Math.max(height, 1000)
    }

    roomPositions.push({ x: currentX, y: 0, width, height })
    currentX += width + ROOM_SPACING_MM
  }

  // Calculate overall bounding box
  // Flip Y axis: in architecture Y goes UP, in SVG Y goes DOWN
  // We use a negative Y scale transform and recalculate the viewBox
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  for (let i = 0; i < building.rooms.length; i++) {
    const room = building.rooms[i]
    const pos = roomPositions[i]
    const polygonM = buildRoomPolygon(room.walls)

    for (const point of polygonM) {
      const px = pos.x + point[0] * M_TO_MM
      // Flip Y: negate the Y coordinate for SVG display
      const py = -(pos.y + point[1] * M_TO_MM)
      minX = Math.min(minX, px)
      minY = Math.min(minY, py)
      maxX = Math.max(maxX, px)
      maxY = Math.max(maxY, py)
    }
  }

  // Add padding
  const padding = 1000
  minX -= padding
  minY -= padding
  maxX += padding * 2
  maxY += padding * 2

  const viewBoxWidth = maxX - minX
  const viewBoxHeight = maxY - minY

  // Helper to flip Y for display
  const flipY = (x: number, y: number): [number, number] => [x, -y]

  return (
    <div className="relative w-full h-full min-h-[400px]">
      {/* Zoom controls */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 bg-white shadow-sm"
          onClick={() => setZoom(z => Math.min(z * 1.2, 5))}
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 bg-white shadow-sm"
          onClick={() => setZoom(z => Math.max(z / 1.2, 0.2))}
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 bg-white shadow-sm"
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}
        >
          <Move className="w-4 h-4" />
        </Button>
      </div>

      {/* SVG floor plan */}
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ touchAction: 'manipulation', cursor: isPanning ? 'grabbing' : 'default' }}
        viewBox={`${minX} ${minY} ${viewBoxWidth} ${viewBoxHeight}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={(e) => {
          e.preventDefault()
          const factor = e.deltaY > 0 ? 0.9 : 1.1
          setZoom(z => Math.min(Math.max(z * factor, 0.2), 5))
        }}
      >
        <g transform={`scale(${zoom}) translate(${pan.x / zoom}, ${pan.y / zoom})`}>
          {/* Draw rooms */}
          {building.rooms.map((room, roomIdx) => {
            const pos = roomPositions[roomIdx]
            const polygonM = buildRoomPolygon(room.walls)

            if (polygonM.length < 2) return null

            // Convert to mm coordinates with origin offset, Y-flipped for SVG
            const polygonMm = polygonM.map(p => {
              const [fx, fy] = flipY(pos.x + p[0] * M_TO_MM, pos.y + p[1] * M_TO_MM)
              return [fx, fy] as [number, number]
            })

            const area = calculateArea(room.walls)
            const [cx, cy] = polygonCenter(polygonMm)

            return (
              <g key={room.id}>
                {/* Room outline (inner) */}
                <polygon
                  points={polygonMm.map(p => `${p[0]},${p[1]}`).join(' ')}
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth={3}
                  strokeDasharray="8 4"
                  opacity={0.5}
                />

                {/* Walls */}
                {room.walls.map((wall, wallIdx) => {
                  const start = polygonMm[wallIdx]
                  const end = polygonMm[wallIdx + 1] || polygonMm[0]
                  if (!start || !end) return null

                  const wallColor = wall.wallType === 'portant' ? '#ef4444' : '#22c55e'

                  // Calculate wall offset lines
                  const dx = end[0] - start[0]
                  const dy = end[1] - start[1]
                  const length = Math.sqrt(dx * dx + dy * dy)
                  if (length < 0.01) return null

                  const nx = -dy / length
                  const ny = dx / length
                  const half = wall.thickness / 2.0

                  const lines = [
                    // Left side
                    { x1: start[0] + nx * half, y1: start[1] + ny * half, x2: end[0] + nx * half, y2: end[1] + ny * half },
                    // Right side
                    { x1: start[0] - nx * half, y1: start[1] - ny * half, x2: end[0] - nx * half, y2: end[1] - ny * half },
                    // Start cap
                    { x1: start[0] + nx * half, y1: start[1] + ny * half, x2: start[0] - nx * half, y2: start[1] - ny * half },
                    // End cap
                    { x1: end[0] + nx * half, y1: end[1] + ny * half, x2: end[0] - nx * half, y2: end[1] - ny * half },
                  ]

                  return (
                    <g key={wallIdx}>
                      {lines.map((line, li) => {
                        const [x1f, y1f] = flipY(line.x1, line.y1)
                        const [x2f, y2f] = flipY(line.x2, line.y2)
                        return (
                          <line
                            key={li}
                            x1={x1f}
                            y1={y1f}
                            x2={x2f}
                            y2={y2f}
                            stroke={wallColor}
                            strokeWidth={2}
                          />
                        )
                      })}

                      {/* Openings */}
                      {wall.openings.map((opening, oi) => {
                        const uxx = dx / length
                        const uyy = dy / length
                        const nxx = -uyy
                        const nyy = uxx

                        const offsetMm = opening.offset * M_TO_MM
                        const widthMm = opening.width * M_TO_MM

                        const opSx = start[0] + uxx * offsetMm
                        const opSy = start[1] + uyy * offsetMm
                        const opEx = start[0] + uxx * (offsetMm + widthMm)
                        const opEy = start[1] + uyy * (offsetMm + widthMm)

                        if (opening.openingType === 'door') {
                          // Door: arc path (flip Y)
                          const radius = widthMm
                          const [osx, osy] = flipY(opSx, opSy)
                          const [oex, oey] = flipY(opEx, opEy)
                          const [arcEndX, arcEndY] = flipY(opSx + nxx * radius, opSy + nyy * radius)
                          return (
                            <g key={oi}>
                              <line
                                x1={osx} y1={osy} x2={oex} y2={osy}
                                stroke="#d946ef" strokeWidth={2}
                              />
                              <path
                                d={`M ${osx} ${osy} A ${radius} ${radius} 0 0 0 ${arcEndX} ${arcEndY}`}
                                fill="none"
                                stroke="#d946ef"
                                strokeWidth={1.5}
                                strokeDasharray="4 2"
                              />
                            </g>
                          )
                        } else {
                          // Window: two parallel lines (flip Y)
                          const halfT = wall.thickness / 2.0
                          const [w1x1, w1y1] = flipY(opSx + nxx * halfT * 0.3, opSy + nyy * halfT * 0.3)
                          const [w1x2, w1y2] = flipY(opEx + nxx * halfT * 0.3, opEy + nyy * halfT * 0.3)
                          const [w2x1, w2y1] = flipY(opSx - nxx * halfT * 0.3, opSy - nyy * halfT * 0.3)
                          const [w2x2, w2y2] = flipY(opEx - nxx * halfT * 0.3, opEy - nyy * halfT * 0.3)
                          return (
                            <g key={oi}>
                              <line
                                x1={w1x1} y1={w1y1}
                                x2={w1x2} y2={w1y2}
                                stroke="#d946ef" strokeWidth={2}
                              />
                              <line
                                x1={w2x1} y1={w2y1}
                                x2={w2x2} y2={w2y2}
                                stroke="#d946ef" strokeWidth={2}
                              />
                            </g>
                          )
                        }
                      })}

                      {/* Dimension text (flip Y) */}
                      <text
                        x={(() => { const [f] = flipY((start[0] + end[0]) / 2 + nx * 400, (start[1] + end[1]) / 2 + ny * 400); return f })()}
                        y={(() => { const [, f] = flipY((start[0] + end[0]) / 2 + nx * 400, (start[1] + end[1]) / 2 + ny * 400); return f })()}
                        fill="#06b6d4"
                        fontSize={120}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        {wall.length.toFixed(2).replace('.', ',')}
                      </text>
                    </g>
                  )
                })}

                {/* Room label */}
                <text
                  x={cx}
                  y={cy - 100}
                  fill="#0e7490"
                  fontSize={200}
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {room.number}
                </text>
                <text
                  x={cx}
                  y={cy + 120}
                  fill="#0e7490"
                  fontSize={150}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {area.toFixed(1).replace('.', ',')} m2
                </text>
                <text
                  x={cx}
                  y={cy + 280}
                  fill="#6b7280"
                  fontSize={100}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {room.name}
                </text>
              </g>
            )
          })}
        </g>
      </svg>

      {/* Legend */}
      <div className="absolute bottom-2 left-2 bg-white/90 rounded-lg p-2 text-xs space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-red-500" />
          <span>Portant</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-green-500" />
          <span>Despartitor</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-cyan-500" />
          <span>Incaperi</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-fuchsia-500" />
          <span>Goluri</span>
        </div>
      </div>
    </div>
  )
}

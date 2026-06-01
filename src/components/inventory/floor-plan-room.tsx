'use client'

import type { RoomData, EditorMode } from '@/types/inventory'
import { mToSvg, isPolygonClosed, PLAN_ORIGIN } from '@/lib/plan-utils'
import { buildRoomPolygon, calculateArea, polygonCenter } from '@/lib/dxf/utils'
import { FloorPlanWall } from './floor-plan-wall'

interface FloorPlanRoomProps {
  room: RoomData
  isSelected: boolean
  mode: EditorMode
  selectedRoomId: string | null
  origin?: { x: number; y: number }
}

export function FloorPlanRoom({ room, isSelected, mode, selectedRoomId, origin = PLAN_ORIGIN }: FloorPlanRoomProps) {
  const polygonM = buildRoomPolygon(room.walls)
  if (polygonM.length < 2) return null

  const polySvg: [number, number][] = polygonM.map(p => mToSvg(p[0], p[1], origin))
  const area = calculateArea(room.walls)
  const [cxSvg, cySvg] = polygonCenter(polySvg)

  return (
    <g key={room.id} opacity={isSelected ? 1 : 0.85}>
      <polygon
        points={polySvg.map(p => `${p[0]},${p[1]}`).join(' ')}
        fill={isSelected ? '#ecfdf5' : '#f9fafb'}
        stroke={isSelected ? '#059669' : '#06b6d4'}
        strokeWidth={isSelected ? 3 : 1.5}
        strokeDasharray={room.walls.length >= 3 && !isPolygonClosed(polygonM) ? '8 4' : undefined}
      />
      {room.walls.map((wall, wallIdx) => {
        const start = polySvg[wallIdx]
        const end = polySvg[wallIdx + 1] || polySvg[0]
        if (!start || !end) return null
        return <FloorPlanWall key={wall.id} wall={wall} wallIdx={wallIdx}
          startSvg={start} endSvg={end} roomId={room.id}
          mode={mode} selectedRoomId={selectedRoomId} origin={origin} />
      })}
      <text x={cxSvg} y={cySvg - 120} fill="#0e7490" fontSize={180} fontWeight="bold"
        textAnchor="middle" dominantBaseline="middle">{room.number}</text>
      <text x={cxSvg} y={cySvg + 80} fill="#0e7490" fontSize={140}
        textAnchor="middle" dominantBaseline="middle">{area.toFixed(1).replace('.', ',')} m2</text>
      <text x={cxSvg} y={cySvg + 250} fill="#6b7280" fontSize={100}
        textAnchor="middle" dominantBaseline="middle">{room.name}</text>
    </g>
  )
}

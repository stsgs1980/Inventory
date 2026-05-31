'use client'

import type { WallData, OpeningData } from '@/types/inventory'
import type { EditorMode } from '@/types/inventory'
import { mToSvg, PLAN_ORIGIN } from '@/lib/plan-utils'
import { M_TO_MM } from '@/lib/constants'

interface FloorPlanWallProps {
  wall: WallData
  wallIdx: number
  startSvg: [number, number]
  endSvg: [number, number]
  roomId: string
  mode: EditorMode
  selectedRoomId: string | null
  origin?: { x: number; y: number }
}

export function FloorPlanWall({
  wall, wallIdx, startSvg, endSvg, roomId, mode, selectedRoomId, origin = PLAN_ORIGIN
}: FloorPlanWallProps) {
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

  const lines = [
    { x1: sx + nx * half, y1: sy + ny * half, x2: ex + nx * half, y2: ey + ny * half },
    { x1: sx - nx * half, y1: sy - ny * half, x2: ex - nx * half, y2: ey - ny * half },
    { x1: sx + nx * half, y1: sy + ny * half, x2: sx - nx * half, y2: sy - ny * half },
    { x1: ex + nx * half, y1: ey + ny * half, x2: ex - nx * half, y2: ey - ny * half },
  ]
  const isHighlighted = mode === 'opening' && selectedRoomId === roomId

  return (
    <g key={`wall-${roomId}-${wallIdx}`}>
      {lines.map((line, li) => (
        <line key={li} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
          stroke={wallColor} strokeWidth={2} />
      ))}
      {isHighlighted && (
        <line x1={sx} y1={sy} x2={ex} y2={ey}
          stroke="transparent" strokeWidth={Math.max(wall.thickness, 300)}
          style={{ cursor: 'pointer' }} />
      )}
      <text x={(sx + ex) / 2 + nx * 300} y={(sy + ey) / 2 + ny * 300}
        fill={wallColor} fontSize={90} textAnchor="middle" dominantBaseline="middle" opacity={0.7}>
        {wall.direction}
      </text>
      <text x={(sx + ex) / 2 + nx * 600} y={(sy + ey) / 2 + ny * 600}
        fill="#06b6d4" fontSize={100} textAnchor="middle" dominantBaseline="middle">
        {wall.length.toFixed(2).replace('.', ',')}m
      </text>
      {wall.openings.map((opening, oi) => (
        <FloorPlanOpening key={oi} opening={opening}
          wallStartSvgX={sx} wallStartSvgY={sy}
          wallEndSvgX={ex} wallEndSvgY={ey}
          wallLengthSvg={lengthSvg} wallThickness={wall.thickness} idx={oi} />
      ))}
    </g>
  )
}

interface FloorPlanOpeningProps {
  opening: OpeningData
  wallStartSvgX: number
  wallStartSvgY: number
  wallEndSvgX: number
  wallEndSvgY: number
  wallLengthSvg: number
  wallThickness: number
  idx: number
}

function FloorPlanOpening({
  opening, wallStartSvgX, wallStartSvgY, wallEndSvgX, wallEndSvgY, wallLengthSvg, wallThickness, idx
}: FloorPlanOpeningProps) {
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
    const radius = widthMm
    const arcEndX = opSx + nx * radius
    const arcEndY = opSy + ny * radius
    return (
      <g key={idx}>
        <line x1={opSx} y1={opSy} x2={opEx} y2={opEy} stroke="#d946ef" strokeWidth={2.5} />
        <path d={`M ${opSx} ${opSy} A ${radius} ${radius} 0 0 0 ${arcEndX} ${arcEndY}`}
          fill="none" stroke="#d946ef" strokeWidth={1.5} strokeDasharray="6 3" />
        <text x={(opSx + opEx) / 2 + nx * 200} y={(opSy + opEy) / 2 + ny * 200}
          fill="#d946ef" fontSize={80} textAnchor="middle">U</text>
      </g>
    )
  }
  const offset1 = wallThickness * 0.3
  const offset2 = -wallThickness * 0.3
  return (
    <g key={idx}>
      <line x1={opSx + nx * offset1} y1={opSy + ny * offset1}
        x2={opEx + nx * offset1} y2={opEy + ny * offset1} stroke="#d946ef" strokeWidth={2.5} />
      <line x1={opSx + nx * offset2} y1={opSy + ny * offset2}
        x2={opEx + nx * offset2} y2={opEy + ny * offset2} stroke="#d946ef" strokeWidth={2.5} />
      <text x={(opSx + opEx) / 2 + nx * 200} y={(opSy + opEy) / 2 + ny * 200}
        fill="#d946ef" fontSize={80} textAnchor="middle">F</text>
    </g>
  )
}

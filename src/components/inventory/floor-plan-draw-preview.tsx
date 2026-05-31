'use client'

import { mToSvg, nearestCompassDirection, PLAN_ORIGIN } from '@/lib/plan-utils'
import { DEFAULT_THICKNESS_PORTANT, DEFAULT_THICKNESS_DESPARTITOR, M_TO_MM } from '@/lib/constants'

interface FloorPlanDrawPreviewProps {
  drawPoints: [number, number][]
  mouseWorldM: [number, number]
  wallTypeForDraw: 'portant' | 'despartitor'
  origin?: { x: number; y: number }
}

export function FloorPlanDrawPreview({
  drawPoints, mouseWorldM, wallTypeForDraw, origin = PLAN_ORIGIN
}: FloorPlanDrawPreviewProps) {
  const wallColor = wallTypeForDraw === 'portant' ? '#ef4444' : '#22c55e'
  const thickness = wallTypeForDraw === 'portant' ? DEFAULT_THICKNESS_PORTANT : DEFAULT_THICKNESS_DESPARTITOR
  const elements: React.ReactNode[] = []

  for (let i = 0; i < drawPoints.length - 1; i++) {
    const [sx, sy] = mToSvg(drawPoints[i][0], drawPoints[i][1], origin)
    const [ex, ey] = mToSvg(drawPoints[i + 1][0], drawPoints[i + 1][1], origin)
    const dx = ex - sx
    const dy = ey - sy
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len < 0.01) continue
    const nx = -dy / len
    const ny = dx / len
    const half = thickness / 2.0
    const lines = [
      { x1: sx + nx * half, y1: sy + ny * half, x2: ex + nx * half, y2: ey + ny * half },
      { x1: sx - nx * half, y1: sy - ny * half, x2: ex - nx * half, y2: ey - ny * half },
      { x1: sx + nx * half, y1: sy + ny * half, x2: sx - nx * half, y2: sy - ny * half },
      { x1: ex + nx * half, y1: ey + ny * half, x2: ex - nx * half, y2: ey - ny * half },
    ]
    const ddx = drawPoints[i + 1][0] - drawPoints[i][0]
    const ddy = drawPoints[i + 1][1] - drawPoints[i][1]
    const distM = Math.sqrt(ddx * ddx + ddy * ddy)
    const dir = nearestCompassDirection(ddx, ddy)
    elements.push(
      <g key={`draw-seg-${i}`}>
        {lines.map((l, li) => (
          <line key={li} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke={wallColor} strokeWidth={2} opacity={0.7} />
        ))}
        <text x={(sx + ex) / 2 + nx * 500} y={(sy + ey) / 2 + ny * 500}
          fill={wallColor} fontSize={100} textAnchor="middle" opacity={0.8}>
          {dir} {distM.toFixed(2)}m
        </text>
      </g>
    )
  }

  for (let i = 0; i < drawPoints.length; i++) {
    const [px, py] = mToSvg(drawPoints[i][0], drawPoints[i][1], origin)
    elements.push(
      <circle key={`draw-pt-${i}`} cx={px} cy={py} r={50}
        fill={i === 0 ? '#059669' : wallColor} stroke="white" strokeWidth={2} />
    )
  }

  if (drawPoints.length > 0) {
    const last = drawPoints[drawPoints.length - 1]
    const [lastX, lastY] = mToSvg(last[0], last[1], origin)
    const [mouseSvgX, mouseSvgY] = mToSvg(mouseWorldM[0], mouseWorldM[1], origin)
    elements.push(
      <line x1={lastX} y1={lastY} x2={mouseSvgX} y2={mouseSvgY}
        stroke={wallColor} strokeWidth={1.5} strokeDasharray="8 4" opacity={0.5} />
    )
    const ddx = mouseWorldM[0] - last[0]
    const ddy = mouseWorldM[1] - last[1]
    const distM = Math.sqrt(ddx * ddx + ddy * ddy)
    if (distM > 0.05) {
      const dir = nearestCompassDirection(ddx, ddy)
      elements.push(
        <text x={(lastX + mouseSvgX) / 2} y={(lastY + mouseSvgY) / 2 - 200}
          fill="#6b7280" fontSize={100} textAnchor="middle" opacity={0.7}>
          {dir} {distM.toFixed(2)}m
        </text>
      )
    }
  }

  return <g>{elements}</g>
}

interface SnapCursorProps {
  mouseWorldM: [number, number]
  origin?: { x: number; y: number }
}

export function SnapCursor({ mouseWorldM, origin = PLAN_ORIGIN }: SnapCursorProps) {
  const [svgX, svgY] = mToSvg(mouseWorldM[0], mouseWorldM[1], origin)
  return (
    <g>
      <circle cx={svgX} cy={svgY} r={30} fill="#059669" opacity={0.4} />
      <line x1={svgX - 80} y1={svgY} x2={svgX + 80} y2={svgY} stroke="#059669" strokeWidth={1} opacity={0.3} />
      <line x1={svgX} y1={svgY - 80} x2={svgX} y2={svgY + 80} stroke="#059669" strokeWidth={1} opacity={0.3} />
    </g>
  )
}

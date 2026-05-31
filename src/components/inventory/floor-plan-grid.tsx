'use client'

import type { ReactNode } from 'react'
import { PLAN_ORIGIN } from '@/lib/plan-utils'

interface ViewBox {
  x: number
  y: number
  w: number
  h: number
}

interface FloorPlanGridProps {
  viewBox: ViewBox
  origin?: { x: number; y: number }
}

export function FloorPlanGrid({ viewBox, origin = PLAN_ORIGIN }: FloorPlanGridProps) {
  const lines: ReactNode[] = []
  const startX = Math.floor((viewBox.x - origin.x) / 1000) * 1000 + origin.x
  const endX = viewBox.x + viewBox.w
  const startY = Math.floor((viewBox.y - origin.y) / 1000) * 1000 + origin.y
  const endY = viewBox.y + viewBox.h

  for (let x = startX; x <= endX; x += 1000) {
    const isOrigin = Math.abs(x - origin.x) < 1
    lines.push(
      <line key={`gx-${x}`} x1={x} y1={viewBox.y} x2={x} y2={viewBox.y + viewBox.h}
        stroke={isOrigin ? '#94a3b8' : '#e5e7eb'} strokeWidth={isOrigin ? 2 : 0.5} />
    )
  }
  for (let y = startY; y <= endY; y += 1000) {
    const isOrigin = Math.abs(y - origin.y) < 1
    lines.push(
      <line key={`gy-${y}`} x1={viewBox.x} y1={y} x2={viewBox.x + viewBox.w} y2={y}
        stroke={isOrigin ? '#94a3b8' : '#e5e7eb'} strokeWidth={isOrigin ? 2 : 0.5} />
    )
  }
  for (let x = startX; x <= endX; x += 1000) {
    const meters = Math.round((x - origin.x) / 1000)
    if (meters === 0) continue
    lines.push(
      <text key={`lx-${x}`} x={x} y={origin.y + 200} fill="#94a3b8" fontSize={100} textAnchor="middle">{meters}m</text>
    )
  }
  for (let y = startY; y <= endY; y += 1000) {
    const meters = -Math.round((y - origin.y) / 1000)
    if (meters === 0) continue
    lines.push(
      <text key={`ly-${y}`} x={origin.x + 200} y={y} fill="#94a3b8" fontSize={100} textAnchor="start">{meters}m</text>
    )
  }
  return <g>{lines}</g>
}

interface NorthArrowProps {
  viewBox: ViewBox
}

export function NorthArrow({ viewBox }: NorthArrowProps) {
  const cx = viewBox.x + viewBox.w - 800
  const cy = viewBox.y + 800
  return (
    <g>
      <circle cx={cx} cy={cy} r={350} fill="white" stroke="#94a3b8" strokeWidth={2} />
      <line x1={cx} y1={cy + 250} x2={cx} y2={cy - 250} stroke="#374151" strokeWidth={3} />
      <polygon points={`${cx},${cy - 280} ${cx - 60},${cy - 180} ${cx + 60},${cy - 180}`} fill="#374151" />
      <text x={cx} y={cy - 320} fill="#374151" fontSize={120} textAnchor="middle" fontWeight="bold">N</text>
    </g>
  )
}

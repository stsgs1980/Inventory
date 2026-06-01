'use client'

import type { EditorTool } from '@/types/inventory'
import type { Point } from '@/lib/canvas/geometry'

interface CanvasStatusBarProps {
  mouseWorld: Point
  snapPoint: Point | null
  tool: EditorTool
  zoom: number
}

export function CanvasStatusBar({
  mouseWorld, snapPoint, tool, zoom,
}: CanvasStatusBarProps) {
  const displayPt = snapPoint ?? mouseWorld
  const toolLabels: Record<EditorTool, string> = {
    select: 'Selectie',
    wall: 'Desenare pereti',
    opening: 'Adaugare goluri',
    dimension: 'Dimensiuni',
    room: 'Camera',
  }

  return (
    <div className="flex items-center gap-4 px-3 py-1.5 bg-gray-100 border-t border-gray-200 text-xs text-gray-600">
      <span className="font-mono">
        X: {displayPt[0].toFixed(3)}m Y: {displayPt[1].toFixed(3)}m
      </span>
      {snapPoint && (
        <span className="text-amber-600">SNAP</span>
      )}
      <span className="text-gray-400">|</span>
      <span>Zoom: {(zoom * 25).toFixed(0)}%</span>
      <span className="text-gray-400">|</span>
      <span className="text-emerald-700 font-medium">{toolLabels[tool]}</span>
      <span className="ml-auto text-gray-400">
        Shift+drag: Pan | Scroll: Zoom | Esc: Anulare | Del: Sterge
      </span>
    </div>
  )
}

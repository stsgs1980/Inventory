'use client'

import type { EditorTool, RoomData, ViewportState } from '@/types/inventory'
import type { Point } from '@/lib/canvas/geometry'
import { Button } from '@/components/ui/button'
import {
  MousePointer, PenLine, DoorOpen, Ruler, ZoomIn, ZoomOut, Maximize,
  Trash2, X, Square, LayoutGrid,
} from 'lucide-react'
import { DEFAULT_ZOOM, MIN_ZOOM, MAX_ZOOM, ZOOM_FACTOR } from '@/lib/constants'

interface CanvasToolbarProps {
  tool: EditorTool
  onToolChange: (t: EditorTool) => void
  wallType: 'portant' | 'despartitor'
  onWallTypeChange: (t: 'portant' | 'despartitor') => void
  openingType: 'door' | 'window'
  onOpeningTypeChange: (t: 'door' | 'window') => void
  rooms: RoomData[]
  selectedRoomId: string | null
  onRoomSelect: (id: string | null) => void
  drawState: { startPoint: Point | null; previewEnd: Point | null }
  onCancelDraw: () => void
  onDeleteWall: () => void
  hasSelection: boolean
  viewport: ViewportState
  onViewportChange: (v: ViewportState) => void
}

export function CanvasToolbar({
  tool, onToolChange, wallType, onWallTypeChange,
  openingType, onOpeningTypeChange, rooms, selectedRoomId, onRoomSelect,
  drawState, onCancelDraw, onDeleteWall, hasSelection, viewport, onViewportChange,
}: CanvasToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-200 flex-wrap">
      {/* Tool selector */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
        <ToolBtn t="select" current={tool} onClick={onToolChange} icon={<MousePointer className="w-3 h-3" />} label="Selectie" shortcut="1" />
        <ToolBtn t="wall" current={tool} onClick={onToolChange} icon={<PenLine className="w-3 h-3" />} label="Perete" shortcut="2" />
        <ToolBtn t="opening" current={tool} onClick={onToolChange} icon={<DoorOpen className="w-3 h-3" />} label="Gol" shortcut="3" />
      </div>

      {/* Room selector */}
      <select className="h-8 text-xs border border-gray-300 rounded px-2 bg-white"
        value={selectedRoomId || ''} onChange={(e) => onRoomSelect(e.target.value || null)}>
        <option value="">-- Camera --</option>
        {rooms.map(r => <option key={r.id} value={r.id}>#{r.number} {r.name}</option>)}
      </select>

      {/* Wall type toggle */}
      {tool === 'wall' && (
        <div className="flex items-center gap-1">
          <Button variant={wallType === 'portant' ? 'default' : 'outline'} size="sm"
            className={`h-7 text-xs ${wallType === 'portant' ? 'bg-red-600 text-white' : 'border-red-300 text-red-700'}`}
            onClick={() => onWallTypeChange('portant')}>Portant</Button>
          <Button variant={wallType === 'despartitor' ? 'default' : 'outline'} size="sm"
            className={`h-7 text-xs ${wallType === 'despartitor' ? 'bg-green-600 text-white' : 'border-green-300 text-green-700'}`}
            onClick={() => onWallTypeChange('despartitor')}>Despartitor</Button>
        </div>
      )}

      {/* Opening type toggle */}
      {tool === 'opening' && (
        <div className="flex items-center gap-1">
          <Button variant={openingType === 'door' ? 'default' : 'outline'} size="sm"
            className={`h-7 text-xs ${openingType === 'door' ? 'bg-fuchsia-600 text-white' : 'border-fuchsia-300 text-fuchsia-700'}`}
            onClick={() => onOpeningTypeChange('door')}>Usa</Button>
          <Button variant={openingType === 'window' ? 'default' : 'outline'} size="sm"
            className={`h-7 text-xs ${openingType === 'window' ? 'bg-fuchsia-600 text-white' : 'border-fuchsia-300 text-fuchsia-700'}`}
            onClick={() => onOpeningTypeChange('window')}>Fereastra</Button>
        </div>
      )}

      {/* Cancel / Delete */}
      {drawState.startPoint && (
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onCancelDraw}>
          <X className="w-3 h-3 mr-1" />Anuleaza
        </Button>
      )}
      {hasSelection && (
        <Button variant="outline" size="sm" className="h-7 text-xs text-red-600 border-red-300" onClick={onDeleteWall}>
          <Trash2 className="w-3 h-3 mr-1" />Sterge perete
        </Button>
      )}

      {/* Zoom controls */}
      <div className="flex items-center gap-1 ml-auto">
        <Button variant="outline" size="icon" className="h-8 w-8"
          onClick={() => onViewportChange({ ...viewport, zoom: Math.min(viewport.zoom * ZOOM_FACTOR, MAX_ZOOM) })}>
          <ZoomIn className="w-3 h-3" />
        </Button>
        <span className="text-xs text-gray-500 w-12 text-center">{(viewport.zoom * 25).toFixed(0)}%</span>
        <Button variant="outline" size="icon" className="h-8 w-8"
          onClick={() => onViewportChange({ ...viewport, zoom: Math.max(viewport.zoom / ZOOM_FACTOR, MIN_ZOOM) })}>
          <ZoomOut className="w-3 h-3" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8"
          onClick={() => onViewportChange({ zoom: DEFAULT_ZOOM, panX: 0, panY: 0 })}>
          <Maximize className="w-3 h-3" />
        </Button>
      </div>
    </div>
  )
}

function ToolBtn({ t, current, onClick, icon, label, shortcut }: {
  t: EditorTool; current: EditorTool; onClick: (t: EditorTool) => void
  icon: React.ReactNode; label: string; shortcut: string
}) {
  return (
    <Button variant={current === t ? 'default' : 'ghost'} size="sm"
      className={`h-7 text-xs ${current === t ? 'bg-emerald-600 text-white' : ''}`}
      onClick={() => onClick(t)} title={`${label} (${shortcut})`}>
      {icon}<span className="ml-1">{label}</span>
    </Button>
  )
}

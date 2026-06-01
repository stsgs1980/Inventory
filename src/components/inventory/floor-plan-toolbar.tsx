'use client'

import type { EditorMode } from '@/types/inventory'
import type { RoomData } from '@/types/inventory'
import { Button } from '@/components/ui/button'
import { ZoomIn, ZoomOut, Move, Pencil, DoorOpen, MousePointer, RotateCcw } from 'lucide-react'

interface FloorPlanToolbarProps {
  mode: EditorMode
  onModeChange: (mode: EditorMode) => void
  rooms: RoomData[]
  selectedRoomId: string | null
  onRoomSelect: (id: string) => void
  wallTypeForDraw: 'portant' | 'despartitor'
  onWallTypeChange: (type: 'portant' | 'despartitor') => void
  drawPointCount: number
  onUndo: () => void
  onClear: () => void
  onComplete: () => void
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
}

export function FloorPlanToolbar({
  mode, onModeChange, rooms, selectedRoomId, onRoomSelect,
  wallTypeForDraw, onWallTypeChange, drawPointCount,
  onUndo, onClear, onComplete, zoom, onZoomIn, onZoomOut, onZoomReset
}: FloorPlanToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-200 flex-wrap">
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
        <ModeButton mode="view" current={mode} onClick={onModeChange} icon={<MousePointer className="w-3 h-3 mr-1" />} label="Vizualizare" />
        <ModeButton mode="draw" current={mode} onClick={onModeChange} icon={<Pencil className="w-3 h-3 mr-1" />} label="Desenare pereti" />
        <ModeButton mode="opening" current={mode} onClick={onModeChange} icon={<DoorOpen className="w-3 h-3 mr-1" />} label="Adauga goluri" />
      </div>

      {(mode === 'draw' || mode === 'opening') && (
        <select className="h-8 text-xs border border-gray-300 rounded px-2 bg-white"
          value={selectedRoomId || ''} onChange={(e) => onRoomSelect(e.target.value)}>
          <option value="">-- Selectati camera --</option>
          {rooms.map(r => <option key={r.id} value={r.id}>#{r.number} {r.name}</option>)}
        </select>
      )}

      {mode === 'draw' && (
        <div className="flex items-center gap-1">
          <Button variant={wallTypeForDraw === 'portant' ? 'default' : 'outline'} size="sm"
            className={`h-8 text-xs ${wallTypeForDraw === 'portant' ? 'bg-red-600 text-white' : 'border-red-300 text-red-700'}`}
            onClick={() => onWallTypeChange('portant')}>Portant</Button>
          <Button variant={wallTypeForDraw === 'despartitor' ? 'default' : 'outline'} size="sm"
            className={`h-8 text-xs ${wallTypeForDraw === 'despartitor' ? 'bg-green-600 text-white' : 'border-green-300 text-green-700'}`}
            onClick={() => onWallTypeChange('despartitor')}>Despartitor</Button>
        </div>
      )}

      {mode === 'draw' && drawPointCount > 0 && (
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onUndo}>
            <RotateCcw className="w-3 h-3 mr-1" />Inapoi
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClear}>Sterge tot</Button>
          {drawPointCount >= 2 && (
            <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onComplete}>
              Salveaza pereti ({drawPointCount - 1})
            </Button>
          )}
        </div>
      )}

      <div className="flex items-center gap-1 ml-auto">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={onZoomIn}><ZoomIn className="w-3 h-3" /></Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={onZoomOut}><ZoomOut className="w-3 h-3" /></Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={onZoomReset}><Move className="w-3 h-3" /></Button>
      </div>
    </div>
  )
}

function ModeButton({ mode, current, onClick, icon, label }: {
  mode: EditorMode; current: EditorMode; onClick: (m: EditorMode) => void
  icon: React.ReactNode; label: string
}) {
  return (
    <Button variant={current === mode ? 'default' : 'ghost'} size="sm"
      className={`h-8 text-xs ${current === mode ? 'bg-emerald-600 text-white' : ''}`}
      onClick={() => onClick(mode)}>{icon}{label}</Button>
  )
}

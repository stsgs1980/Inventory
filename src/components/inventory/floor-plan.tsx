'use client'

import { useInventoryStore } from '@/store/inventory-store'
import { AlertCircle } from 'lucide-react'
import { OpeningForm } from './opening-form'
import { useFloorPlan } from '@/hooks/use-floor-plan'
import { FloorPlanToolbar } from './floor-plan-toolbar'
import { FloorPlanGrid, NorthArrow } from './floor-plan-grid'
import { FloorPlanRoom } from './floor-plan-room'
import { FloorPlanDrawPreview, SnapCursor } from './floor-plan-draw-preview'

export function FloorPlan() {
  const { currentBuildingId } = useInventoryStore()
  const fp = useFloorPlan(currentBuildingId)

  if (!currentBuildingId) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500 text-sm">Selectati o cladire mai intai.</p>
      </div>
    )
  }
  if (!fp.building || fp.building.rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500 text-sm">Adaugati camere si pereti pentru a vedea planul.</p>
      </div>
    )
  }

  const { viewBox } = fp.calculateViewBox()
  const selectedRoom = fp.building.rooms.find(r => r.id === fp.selectedRoomId)

  return (
    <div className="relative w-full h-full min-h-[400px] flex flex-col">
      <FloorPlanToolbar
        mode={fp.mode} onModeChange={(m) => { fp.setMode(m); fp.setDrawPoints([]) }}
        rooms={fp.building.rooms} selectedRoomId={fp.selectedRoomId}
        onRoomSelect={(id) => { fp.setSelectedRoomId(id); fp.setDrawPoints([]) }}
        wallTypeForDraw={fp.wallTypeForDraw} onWallTypeChange={fp.setWallTypeForDraw}
        drawPointCount={fp.drawPoints.length} onUndo={() => fp.setDrawPoints(p => p.slice(0, -1))}
        onClear={() => fp.setDrawPoints([])} onComplete={fp.completeWalls}
        zoom={fp.zoom} onZoomIn={() => fp.setZoom(z => Math.min(z * 1.3, 8))}
        onZoomOut={() => fp.setZoom(z => Math.max(z / 1.3, 0.2))}
        onZoomReset={() => { fp.setZoom(1); fp.setPan({ x: 0, y: 0 }) }}
      />

      {fp.mode === 'draw' && (
        <div className="px-3 py-1.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-700">
          {fp.selectedRoomId
            ? `Camera #${selectedRoom?.number} ${selectedRoom?.name}: apasati pe grid pentru a plasa puncte. ${fp.drawPoints.length > 0 ? `Puncte: ${fp.drawPoints.length}. ` : ''}Puteti desena mai multi pereti odata.`
            : 'Selectati o camera din lista de mai sus.'}
        </div>
      )}
      {fp.mode === 'opening' && (
        <div className="px-3 py-1.5 bg-blue-50 border-b border-blue-200 text-xs text-blue-700">
          {fp.selectedRoomId
            ? `Apasati pe un peret al camerei #${selectedRoom?.number} pentru a adauga usa sau fereastra.`
            : 'Selectati o camera din lista de mai sus.'}
        </div>
      )}

      <div className="flex-1 relative overflow-hidden bg-gray-50">
        <svg ref={fp.svgRef} className="w-full h-full"
          style={{ touchAction: 'manipulation', cursor: fp.isPanning ? 'grabbing' : fp.mode === 'draw' ? 'crosshair' : fp.mode === 'opening' ? 'pointer' : 'default' }}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          onPointerDown={fp.handlePointerDown} onPointerMove={fp.handleMouseMove}
          onPointerUp={fp.handlePointerUp} onPointerLeave={fp.handlePointerUp}
          onClick={fp.handleCanvasClick}
          onWheel={(e) => { e.preventDefault(); fp.setZoom(z => Math.min(Math.max(z * (e.deltaY > 0 ? 0.9 : 1.1), 0.2), 8)) }}
        >
          <g transform={`scale(${fp.zoom}) translate(${fp.pan.x / fp.zoom}, ${fp.pan.y / fp.zoom})`}>
            <FloorPlanGrid viewBox={viewBox} />
            <NorthArrow viewBox={viewBox} />
            {fp.building.rooms.map(room => (
              <FloorPlanRoom key={room.id} room={room} isSelected={room.id === fp.selectedRoomId}
                mode={fp.mode} selectedRoomId={fp.selectedRoomId} />
            ))}
            {fp.mode === 'draw' && fp.drawPoints.length > 0 && (
              <FloorPlanDrawPreview drawPoints={fp.drawPoints} mouseWorldM={fp.mouseWorldM} wallTypeForDraw={fp.wallTypeForDraw} />
            )}
            {fp.mode === 'draw' && <SnapCursor mouseWorldM={fp.mouseWorldM} />}
          </g>
        </svg>

        <div className="absolute bottom-2 left-2 bg-white/90 rounded-lg p-2 text-xs space-y-1 shadow-sm">
          <LegendItem color="bg-red-500" label="Portant" />
          <LegendItem color="bg-green-500" label="Despartitor" />
          <LegendItem color="bg-cyan-500" label="Incaperi" />
          <LegendItem color="bg-fuchsia-500" label="Goluri (usi/ferestre)" />
        </div>

        {fp.mode === 'draw' && fp.drawPoints.length > 0 && (
          <div className="absolute bottom-2 right-2 bg-white/90 rounded-lg px-3 py-2 text-xs shadow-sm">
            <span className="text-gray-600">Puncte: {fp.drawPoints.length}</span>
            {fp.drawPoints.length >= 2 && <span className="text-gray-600 ml-2">| Pereti: {fp.drawPoints.length - 1}</span>}
          </div>
        )}
      </div>

      {fp.openingFormWallId && (
        <OpeningForm open={!!fp.openingFormWallId}
          onOpenChange={(open) => { if (!open) fp.setOpeningFormWallId(null) }}
          wallId={fp.openingFormWallId} wallIndex={fp.openingFormWallIndex} onSubmit={fp.refresh} />
      )}
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-1 ${color} rounded`} />
      <span>{label}</span>
    </div>
  )
}

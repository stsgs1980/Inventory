'use client'

import { useEffect, useRef } from 'react'
import { useInventoryStore } from '@/store/inventory-store'
import { useCanvasEditor } from '@/hooks/use-canvas-editor'
import { useCanvasRender } from '@/hooks/use-canvas-render'
import { CanvasToolbar } from './canvas-toolbar'
import { CanvasStatusBar } from './canvas-status-bar'
import { OpeningForm } from '@/components/inventory/opening-form'
import { AlertCircle } from 'lucide-react'

export function CanvasEditor() {
  const { currentBuildingId } = useInventoryStore()
  const editor = useCanvasEditor(currentBuildingId)

  // Render hook
  useCanvasRender({
    canvas: editor.canvasRef.current,
    building: editor.building,
    viewport: editor.viewport,
    tool: editor.tool,
    drawState: editor.drawState,
    selection: editor.selection,
    selectedRoomId: editor.selectedRoomId,
    snapPoint: editor.snapPoint,
    mouseWorld: editor.mouseWorld,
  })

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') editor.cancelDraw()
      if (e.key === 'Delete' && editor.selection.selectedWallId) editor.deleteSelectedWall()
      if (e.key === '1') editor.setTool('select')
      if (e.key === '2') editor.setTool('wall')
      if (e.key === '3') editor.setTool('opening')
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editor])

  if (!currentBuildingId) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-full">
        <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500 text-sm">Selectati o cladire mai intai.</p>
      </div>
    )
  }

  if (!editor.building) return null

  return (
    <div className="relative w-full h-full min-h-[400px] flex flex-col">
      <CanvasToolbar
        tool={editor.tool} onToolChange={editor.setTool}
        wallType={editor.wallType} onWallTypeChange={editor.setWallType}
        openingType={editor.openingType} onOpeningTypeChange={editor.setOpeningType}
        rooms={editor.building.rooms} selectedRoomId={editor.selectedRoomId}
        onRoomSelect={editor.setSelectedRoomId}
        drawState={editor.drawState} onCancelDraw={editor.cancelDraw}
        onDeleteWall={editor.deleteSelectedWall}
        hasSelection={!!editor.selection.selectedWallId}
        viewport={editor.viewport} onViewportChange={editor.setViewport}
      />

      <div className="flex-1 relative overflow-hidden bg-white">
        <canvas
          ref={editor.canvasRef}
          className="w-full h-full"
          style={{ touchAction: 'none', cursor: getCursor(editor.tool) }}
          onPointerDown={editor.handlePointerDown}
          onPointerMove={editor.handleMouseMove}
          onPointerUp={editor.handlePointerUp}
          onPointerLeave={editor.handlePointerUp}
          onClick={editor.handleClick}
          onWheel={editor.handleWheel}
        />

        {/* Legend */}
        <div className="absolute bottom-2 left-2 bg-white/90 rounded-lg p-2 text-xs space-y-1 shadow-sm">
          <LegendItem color="bg-red-500" label="Portant" />
          <LegendItem color="bg-green-500" label="Despartitor" />
          <LegendItem color="bg-cyan-500" label="Incaperi" />
          <LegendItem color="bg-fuchsia-500" label="Goluri" />
        </div>

        {/* Drawing info */}
        {editor.tool === 'wall' && editor.drawState.startPoint && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-xs text-amber-700 shadow-sm">
            Apasati pentru a plasa capatul peretelui. Escape pentru anulare.
          </div>
        )}
      </div>

      <CanvasStatusBar
        mouseWorld={editor.mouseWorld}
        snapPoint={editor.snapPoint}
        tool={editor.tool}
        zoom={editor.viewport.zoom}
      />
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

function getCursor(tool: string): string {
  switch (tool) {
    case 'wall': return 'crosshair'
    case 'opening': return 'pointer'
    case 'select': return 'default'
    default: return 'crosshair'
  }
}

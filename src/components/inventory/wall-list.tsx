'use client'

import { useState } from 'react'
import { calculateArea } from '@/lib/dxf/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2, Plus, ChevronDown, ChevronUp, Edit2, ArrowUp, ArrowDown } from 'lucide-react'
import { OpeningForm } from './opening-form'
import { WallForm } from './wall-form'
import { useToast } from '@/hooks/use-toast'

interface WallData {
  id: string
  direction: string
  length: number
  thickness: number
  wallType: string
  orderIndex: number
  openings: {
    id: string
    openingType: string
    wallIndex: number
    offset: number
    width: number
    height: number
  }[]
}

interface WallListProps {
  walls: WallData[]
  roomId: string
  onRefresh: () => void
}

export function WallList({ walls, roomId, onRefresh }: WallListProps) {
  const { toast } = useToast()
  const [openingFormWallId, setOpeningFormWallId] = useState<string | null>(null)
  const [openingFormWallIndex, setOpeningFormWallIndex] = useState(0)
  const [openingFormWallLength, setOpeningFormWallLength] = useState(0)
  const [expandedWallId, setExpandedWallId] = useState<string | null>(null)
  const [editWallData, setEditWallData] = useState<WallData | null>(null)
  const [editOpeningData, setEditOpeningData] = useState<{
    id: string
    openingType: string
    offset: number
    width: number
    height: number
  } | null>(null)

  const area = calculateArea(walls)

  async function handleDeleteWall(wallId: string) {
    try {
      await fetch(`/api/walls/${wallId}`, { method: 'DELETE' })
      onRefresh()
      toast({ title: 'Perete sters' })
    } catch (error) {
      console.error('Error deleting wall:', error)
    }
  }

  async function handleDeleteOpening(openingId: string) {
    try {
      await fetch(`/api/openings/${openingId}`, { method: 'DELETE' })
      onRefresh()
      toast({ title: 'Deschidere stearsa' })
    } catch (error) {
      console.error('Error deleting opening:', error)
    }
  }

  function handleAddOpening(wallId: string, wallIndex: number, wallLength: number) {
    setOpeningFormWallId(wallId)
    setOpeningFormWallIndex(wallIndex)
    setOpeningFormWallLength(wallLength)
    setEditOpeningData(null)
  }

  function handleEditOpening(opening: {
    id: string
    openingType: string
    offset: number
    width: number
    height: number
  }, wallId: string, wallIndex: number, wallLength: number) {
    setOpeningFormWallId(wallId)
    setOpeningFormWallIndex(wallIndex)
    setOpeningFormWallLength(wallLength)
    setEditOpeningData(opening)
  }

  async function handleMoveWall(wallId: string, direction: 'up' | 'down') {
    const wallIndex = walls.findIndex(w => w.id === wallId)
    if (wallIndex < 0) return
    if (direction === 'up' && wallIndex === 0) return
    if (direction === 'down' && wallIndex === walls.length - 1) return

    const swapIndex = direction === 'up' ? wallIndex - 1 : wallIndex + 1
    const wall1 = walls[wallIndex]
    const wall2 = walls[swapIndex]

    try {
      // Swap orderIndex values
      await fetch(`/api/walls/${wall1.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIndex: wall2.orderIndex }),
      })
      await fetch(`/api/walls/${wall2.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIndex: wall1.orderIndex }),
      })
      onRefresh()
      toast({ title: 'Ordine actualizata' })
    } catch (error) {
      console.error('Error reordering wall:', error)
    }
  }

  return (
    <div className="space-y-2">
      {/* Area display */}
      {walls.length >= 3 && (
        <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 rounded-lg">
          <span className="text-sm font-medium text-emerald-700">Suprafata camera:</span>
          <span className="text-sm font-bold text-emerald-700">{area.toFixed(2)} m2</span>
        </div>
      )}

      {/* Wall list */}
      {walls.map((wall, index) => {
        const isExpanded = expandedWallId === wall.id
        return (
          <div key={wall.id} className="border border-gray-200 rounded-lg">
            <div
              className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpandedWallId(isExpanded ? null : wall.id)}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">#{index + 1}</span>
                <Badge
                  variant="outline"
                  className={`text-xs font-bold ${
                    wall.wallType === 'portant'
                      ? 'border-red-300 text-red-700 bg-red-50'
                      : 'border-green-300 text-green-700 bg-green-50'
                  }`}
                >
                  {wall.direction}
                </Badge>
                <span className="text-sm text-gray-700">
                  {wall.length}m x {wall.thickness}mm
                </span>
                <span className="text-xs text-gray-400">
                  ({wall.wallType === 'portant' ? 'Portant' : 'Despartitor'})
                </span>
              </div>
              <div className="flex items-center gap-2">
                {wall.openings.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {wall.openings.length} {wall.openings.length === 1 ? 'gol' : 'goluri'}
                  </Badge>
                )}
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-gray-100 px-3 py-3 space-y-2 bg-gray-50">
                {/* Openings list */}
                {wall.openings.map((opening) => (
                  <div
                    key={opening.id}
                    className="flex items-center justify-between p-2 bg-white rounded border border-gray-200"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          opening.openingType === 'door'
                            ? 'border-amber-300 text-amber-700 bg-amber-50'
                            : 'border-blue-300 text-blue-700 bg-blue-50'
                        }`}
                      >
                        {opening.openingType === 'door' ? 'Usa' : 'Fereastra'}
                      </Badge>
                      <span className="text-xs text-gray-600">
                        {opening.width}m x {opening.height}m
                      </span>
                      <span className="text-xs text-gray-400">
                        de la {opening.offset}m
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-blue-400 hover:text-blue-600"
                        onClick={() => handleEditOpening(opening, wall.id, index, wall.length)}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-400 hover:text-red-600"
                        onClick={() => handleDeleteOpening(opening.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs min-h-[36px]"
                    onClick={() => handleAddOpening(wall.id, index, wall.length)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Adauga deschidere
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs min-h-[36px]"
                    onClick={() => setEditWallData(wall)}
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    Editeaza
                  </Button>
                  {/* Reorder buttons */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs min-h-[36px]"
                    disabled={index === 0}
                    onClick={() => handleMoveWall(wall.id, 'up')}
                  >
                    <ArrowUp className="w-3 h-3 mr-1" />
                    Sus
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs min-h-[36px]"
                    disabled={index === walls.length - 1}
                    onClick={() => handleMoveWall(wall.id, 'down')}
                  >
                    <ArrowDown className="w-3 h-3 mr-1" />
                    Jos
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-red-500 hover:text-red-700 min-h-[36px]"
                    onClick={() => handleDeleteWall(wall.id)}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Sterge
                  </Button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Opening form dialog (add or edit) */}
      {openingFormWallId && (
        <OpeningForm
          open={!!openingFormWallId}
          onOpenChange={(open) => {
            if (!open) {
              setOpeningFormWallId(null)
              setEditOpeningData(null)
            }
          }}
          wallId={openingFormWallId}
          wallIndex={openingFormWallIndex}
          wallLength={openingFormWallLength}
          editOpening={editOpeningData}
          onSubmit={onRefresh}
        />
      )}

      {/* Edit wall form dialog */}
      {editWallData && (
        <WallForm
          open={!!editWallData}
          onOpenChange={(open) => { if (!open) setEditWallData(null) }}
          roomId={roomId}
          orderIndex={editWallData.orderIndex}
          editWall={editWallData}
          onSubmit={onRefresh}
        />
      )}
    </div>
  )
}

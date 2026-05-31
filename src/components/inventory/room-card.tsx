'use client'

import { useState } from 'react'
import { calculateArea, buildRoomPolygon } from '@/lib/dxf/utils'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { WallList } from './wall-list'
import { WallForm } from './wall-form'
import { ChevronDown, ChevronUp, Plus, Trash2, Edit2 } from 'lucide-react'
import { RoomForm } from './room-form'

interface RoomCardProps {
  buildingId: string
  room: {
    id: string
    number: number
    name: string
    purpose: string
    interiorHeight: number
    walls: {
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
    }[]
  }
  onRefresh: () => void
  onDelete: (id: string) => void
  defaultExpanded?: boolean
}

export function RoomCard({ buildingId, room, onRefresh, onDelete, defaultExpanded = false }: RoomCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [wallFormOpen, setWallFormOpen] = useState(false)
  const [editFormOpen, setEditFormOpen] = useState(false)

  const area = calculateArea(room.walls)
  const wallCount = room.walls.length
  const openingCount = room.walls.reduce((sum, w) => sum + w.openings.length, 0)

  // Check if polygon is closed (last point returns near origin)
  const polygon = buildRoomPolygon(room.walls)
  const lastPoint = polygon.length > 1 ? polygon[polygon.length - 1] : null
  const isClosed = lastPoint !== null && Math.abs(lastPoint[0]) < 0.01 && Math.abs(lastPoint[1]) < 0.01

  return (
    <>
      <Card className={`transition-all ${expanded ? 'ring-1 ring-emerald-200' : ''}`}>
        <CardHeader
          className="cursor-pointer hover:bg-gray-50 p-4"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-gray-900">#{room.number}</span>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">{room.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      room.purpose === 'Locuibila'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {room.purpose === 'Locuibila' ? 'Locuibila' : 'Auxiliara'}
                  </span>
                  <span className="text-xs text-gray-500">
                    h={room.interiorHeight}m
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-bold text-emerald-600">
                  {area.toFixed(2)} m2
                </div>
                <div className="text-xs text-gray-400">
                  {wallCount}p / {openingCount}g
                </div>
                {wallCount >= 3 && (
                  <div className={`text-xs font-medium ${isClosed ? 'text-emerald-600' : 'text-amber-500'}`}>
                    {isClosed ? 'Inchis' : 'Deschis'}
                  </div>
                )}
              </div>
              {expanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>
        </CardHeader>

        {expanded && (
          <CardContent className="px-4 pb-4 space-y-3">
            {/* Edit / Delete buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs min-h-[40px]"
                onClick={() => setEditFormOpen(true)}
              >
                <Edit2 className="w-3 h-3 mr-1" />
                Editeaza camera
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-red-500 hover:text-red-700 min-h-[40px]"
                onClick={() => onDelete(room.id)}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Sterge camera
              </Button>
            </div>

            {/* Wall list */}
            <WallList walls={room.walls} roomId={room.id} onRefresh={onRefresh} />

            {/* Add wall button */}
            <Button
              variant="outline"
              className="w-full min-h-[44px] border-dashed"
              onClick={() => setWallFormOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adauga Perete
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Wall form dialog */}
      <WallForm
        open={wallFormOpen}
        onOpenChange={setWallFormOpen}
        roomId={room.id}
        orderIndex={room.walls.length}
        onSubmit={onRefresh}
      />

      {/* Edit room form dialog */}
      <RoomForm
        open={editFormOpen}
        onOpenChange={setEditFormOpen}
        buildingId={buildingId}
        editRoom={room}
        onSubmit={onRefresh}
      />
    </>
  )
}

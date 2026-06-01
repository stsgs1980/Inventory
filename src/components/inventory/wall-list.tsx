'use client'

import { useState } from 'react'
import type { WallData } from '@/types/inventory'
import { calculateArea } from '@/lib/dxf/utils'
import { OpeningForm } from './opening-form'
import { WallForm } from './wall-form'
import { WallItem } from './wall-item'
import { useWallMutations } from '@/hooks/use-wall-mutations'

interface WallListProps {
  walls: WallData[]
  roomId: string
  onRefresh: () => void
}

export function WallList({ walls, roomId, onRefresh }: WallListProps) {
  const [openingFormWallId, setOpeningFormWallId] = useState<string | null>(null)
  const [openingFormWallIndex, setOpeningFormWallIndex] = useState(0)
  const [openingFormWallLength, setOpeningFormWallLength] = useState(0)
  const [expandedWallId, setExpandedWallId] = useState<string | null>(null)
  const [editWallData, setEditWallData] = useState<WallData | null>(null)
  const [editOpeningData, setEditOpeningData] = useState<WallData['openings'][0] | null>(null)

  const area = calculateArea(walls)

  function handleAddOpening(wallId: string, wallIndex: number, wallLength: number) {
    setOpeningFormWallId(wallId)
    setOpeningFormWallIndex(wallIndex)
    setOpeningFormWallLength(wallLength)
    setEditOpeningData(null)
  }

  function handleEditOpening(opening: WallData['openings'][0], wallId: string, wallIndex: number, wallLength: number) {
    setOpeningFormWallId(wallId)
    setOpeningFormWallIndex(wallIndex)
    setOpeningFormWallLength(wallLength)
    setEditOpeningData(opening)
  }

  return (
    <div className="space-y-2">
      {walls.length >= 3 && (
        <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 rounded-lg">
          <span className="text-sm font-medium text-emerald-700">Suprafata camera:</span>
          <span className="text-sm font-bold text-emerald-700">{area.toFixed(2)} m2</span>
        </div>
      )}

      {walls.map((wall, index) => (
        <WallItem key={wall.id} wall={wall} index={index} totalWalls={walls.length}
          isExpanded={expandedWallId === wall.id}
          onToggleExpand={() => setExpandedWallId(expandedWallId === wall.id ? null : wall.id)}
          onAddOpening={handleAddOpening} onEditOpening={handleEditOpening}
          onEditWall={setEditWallData} onRefresh={onRefresh} />
      ))}

      {openingFormWallId && (
        <OpeningForm open={!!openingFormWallId}
          onOpenChange={(open) => { if (!open) { setOpeningFormWallId(null); setEditOpeningData(null) } }}
          wallId={openingFormWallId} wallIndex={openingFormWallIndex} wallLength={openingFormWallLength}
          editOpening={editOpeningData} onSubmit={onRefresh} />
      )}

      {editWallData && (
        <WallForm open={!!editWallData}
          onOpenChange={(open) => { if (!open) setEditWallData(null) }}
          roomId={roomId} orderIndex={editWallData.orderIndex} editWall={editWallData} onSubmit={onRefresh} />
      )}
    </div>
  )
}

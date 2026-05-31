'use client'

import type { WallData } from '@/types/inventory'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2, Plus, ChevronDown, ChevronUp, Edit2, ArrowUp, ArrowDown } from 'lucide-react'
import { useWallMutations } from '@/hooks/use-wall-mutations'

interface WallItemProps {
  wall: WallData
  index: number
  totalWalls: number
  isExpanded: boolean
  onToggleExpand: () => void
  onAddOpening: (wallId: string, wallIndex: number, wallLength: number) => void
  onEditOpening: (opening: WallData['openings'][0], wallId: string, wallIndex: number, wallLength: number) => void
  onEditWall: (wall: WallData) => void
  onRefresh: () => void
}

export function WallItem({ wall, index, totalWalls, isExpanded, onToggleExpand, onAddOpening, onEditOpening, onEditWall, onRefresh }: WallItemProps) {
  const { deleteWall, deleteOpening, moveWall } = useWallMutations(onRefresh)

  return (
    <div className="border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50" onClick={onToggleExpand}>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">#{index + 1}</span>
          <Badge variant="outline" className={`text-xs font-bold ${
            wall.wallType === 'portant' ? 'border-red-300 text-red-700 bg-red-50' : 'border-green-300 text-green-700 bg-green-50'
          }`}>{wall.direction}</Badge>
          <span className="text-sm text-gray-700">{wall.length}m x {wall.thickness}mm</span>
          <span className="text-xs text-gray-400">({wall.wallType === 'portant' ? 'Portant' : 'Despartitor'})</span>
        </div>
        <div className="flex items-center gap-2">
          {wall.openings.length > 0 && (
            <Badge variant="secondary" className="text-xs">{wall.openings.length} {wall.openings.length === 1 ? 'gol' : 'goluri'}</Badge>
          )}
          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-100 px-3 py-3 space-y-2 bg-gray-50">
          {wall.openings.map((opening) => (
            <OpeningItem key={opening.id} opening={opening}
              onEdit={() => onEditOpening(opening, wall.id, index, wall.length)}
              onDelete={() => deleteOpening(opening.id)} />
          ))}
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="text-xs min-h-[36px]" onClick={() => onAddOpening(wall.id, index, wall.length)}>
              <Plus className="w-3 h-3 mr-1" />Adauga deschidere
            </Button>
            <Button variant="outline" size="sm" className="text-xs min-h-[36px]" onClick={() => onEditWall(wall)}>
              <Edit2 className="w-3 h-3 mr-1" />Editeaza
            </Button>
            <Button variant="ghost" size="sm" className="text-xs min-h-[36px]" disabled={index === 0}
              onClick={() => moveWall(wall.id, 'up', [])}>
              <ArrowUp className="w-3 h-3 mr-1" />Sus
            </Button>
            <Button variant="ghost" size="sm" className="text-xs min-h-[36px]" disabled={index === totalWalls - 1}
              onClick={() => moveWall(wall.id, 'down', [])}>
              <ArrowDown className="w-3 h-3 mr-1" />Jos
            </Button>
            <Button variant="ghost" size="sm" className="text-xs text-red-500 hover:text-red-700 min-h-[36px]"
              onClick={() => deleteWall(wall.id)}>
              <Trash2 className="w-3 h-3 mr-1" />Sterge
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

interface OpeningItemProps {
  opening: WallData['openings'][0]
  onEdit: () => void
  onDelete: () => void
}

function OpeningItem({ opening, onEdit, onDelete }: OpeningItemProps) {
  return (
    <div className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={`text-xs ${
          opening.openingType === 'door' ? 'border-amber-300 text-amber-700 bg-amber-50' : 'border-blue-300 text-blue-700 bg-blue-50'
        }`}>{opening.openingType === 'door' ? 'Usa' : 'Fereastra'}</Badge>
        <span className="text-xs text-gray-600">{opening.width}m x {opening.height}m</span>
        <span className="text-xs text-gray-400">de la {opening.offset}m</span>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-400 hover:text-blue-600" onClick={onEdit}>
          <Edit2 className="w-3 h-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={onDelete}>
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  )
}

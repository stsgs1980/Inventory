'use client'

import type { BuildingData } from '@/types/inventory'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

interface BuildingSelectorProps {
  buildings: BuildingData[]
  currentBuildingId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

export function BuildingSelector({ buildings, currentBuildingId, onSelect, onDelete }: BuildingSelectorProps) {
  if (buildings.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-gray-700">Cladiri existente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {buildings.map((b) => (
          <div key={b.id}
            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
              currentBuildingId === b.id ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onSelect(b.id)}
          >
            <div>
              <span className="font-medium text-gray-900">Lit. {b.letter || '-'}</span>
              <span className="text-sm text-gray-500 ml-2">{b.floorType} - {b.permitNumber || 'fara autorizatie'}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600"
              onClick={(e) => { e.stopPropagation(); onDelete(b.id) }}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

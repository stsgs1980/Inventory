'use client'

import { useState } from 'react'
import { useInventoryStore } from '@/store/inventory-store'
import { useBuildingData } from '@/hooks/use-building-data'
import { RoomCard } from './room-card'
import { RoomForm } from './room-form'
import { Button } from '@/components/ui/button'
import { Plus, AlertCircle } from 'lucide-react'

export function RoomList({ autoExpand = false }: { autoExpand?: boolean }) {
  const { currentBuildingId } = useInventoryStore()
  const { building, refresh } = useBuildingData(currentBuildingId)
  const [roomFormOpen, setRoomFormOpen] = useState(false)

  async function handleDeleteRoom(roomId: string) {
    if (!confirm('Sigur doriti sa stergeti aceasta camera?')) return
    try {
      await fetch(`/api/rooms/${roomId}`, { method: 'DELETE' })
      refresh()
    } catch (error) { console.error('Error deleting room:', error) }
  }

  if (!currentBuildingId) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500 text-sm">Selectati sau creati o cladire in pasul 1 mai intai.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      {building?.rooms.map((room) => (
        <RoomCard key={room.id} buildingId={currentBuildingId} room={room}
          onRefresh={refresh} onDelete={handleDeleteRoom} defaultExpanded={autoExpand} />
      ))}

      {(!building?.rooms || building.rooms.length === 0) && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">Nicio camera adaugata.</p>
          <p className="text-xs mt-1">Apasati butonul de mai jos pentru a adauga.</p>
        </div>
      )}

      <Button variant="outline" className="w-full min-h-[48px] border-dashed border-emerald-300 text-emerald-600 hover:bg-emerald-50"
        onClick={() => setRoomFormOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />Adauga Camera
      </Button>

      {currentBuildingId && (
        <RoomForm open={roomFormOpen} onOpenChange={setRoomFormOpen}
          buildingId={currentBuildingId} nextRoomNumber={(building?.rooms.length ?? 0) + 1}
          existingRoomCount={building?.rooms.length ?? 0} onSubmit={refresh} />
      )}
    </div>
  )
}

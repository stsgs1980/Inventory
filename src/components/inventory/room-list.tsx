'use client'

import { useState, useEffect, useCallback } from 'react'
import { useInventoryStore } from '@/store/inventory-store'
import { RoomCard } from './room-card'
import { RoomForm } from './room-form'
import { Button } from '@/components/ui/button'
import { Plus, AlertCircle } from 'lucide-react'

interface RoomData {
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

interface BuildingData {
  id: string
  rooms: RoomData[]
}

export function RoomList({ autoExpand = false }: { autoExpand?: boolean }) {
  const { currentBuildingId } = useInventoryStore()
  const [building, setBuilding] = useState<BuildingData | null>(null)
  const [roomFormOpen, setRoomFormOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  useEffect(() => {
    if (!currentBuildingId) return
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/buildings/${currentBuildingId}`)
        if (res.ok && !cancelled) {
          const data = await res.json()
          setBuilding(data)
        }
      } catch (error) {
        console.error('Error loading building:', error)
      }
    }
    load()
    return () => { cancelled = true }
  }, [currentBuildingId, refreshKey])

  async function handleDeleteRoom(roomId: string) {
    if (!confirm('Sigur doriti sa stergeti aceasta camera?')) return
    try {
      await fetch(`/api/rooms/${roomId}`, { method: 'DELETE' })
      refresh()
    } catch (error) {
      console.error('Error deleting room:', error)
    }
  }

  if (!currentBuildingId) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500 text-sm">
          Selectati sau creati o cladire in pasul 1 mai intai.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      {/* Room cards */}
      {building?.rooms.map((room) => (
        <RoomCard
          key={room.id}
          buildingId={currentBuildingId}
          room={room}
          onRefresh={refresh}
          onDelete={handleDeleteRoom}
          defaultExpanded={autoExpand}
        />
      ))}

      {/* Empty state */}
      {(!building?.rooms || building.rooms.length === 0) && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">Nicio camera adaugata.</p>
          <p className="text-xs mt-1">Apasati butonul de mai jos pentru a adauga.</p>
        </div>
      )}

      {/* Add room button */}
      <Button
        variant="outline"
        className="w-full min-h-[48px] border-dashed border-emerald-300 text-emerald-600 hover:bg-emerald-50"
        onClick={() => setRoomFormOpen(true)}
      >
        <Plus className="w-4 h-4 mr-2" />
        Adauga Camera
      </Button>

      {/* Room form dialog */}
      {currentBuildingId && (
        <RoomForm
          open={roomFormOpen}
          onOpenChange={setRoomFormOpen}
          buildingId={currentBuildingId}
          nextRoomNumber={(building?.rooms.length ?? 0) + 1}
          onSubmit={refresh}
        />
      )}
    </div>
  )
}

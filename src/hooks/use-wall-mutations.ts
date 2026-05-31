'use client'

import { useToast } from '@/hooks/use-toast'
import type { WallData } from '@/types/inventory'

/**
 * Hook for wall and opening CRUD mutations.
 * Extracts the complex reorder logic and delete handlers from wall-list.tsx.
 */
export function useWallMutations(onRefresh: () => void) {
  const { toast } = useToast()

  async function deleteWall(wallId: string) {
    try {
      await fetch(`/api/walls/${wallId}`, { method: 'DELETE' })
      onRefresh()
      toast({ title: 'Perete sters' })
    } catch (error) { console.error('Error deleting wall:', error) }
  }

  async function deleteOpening(openingId: string) {
    try {
      await fetch(`/api/openings/${openingId}`, { method: 'DELETE' })
      onRefresh()
      toast({ title: 'Deschidere stearsa' })
    } catch (error) { console.error('Error deleting opening:', error) }
  }

  async function moveWall(wallId: string, direction: 'up' | 'down', walls: WallData[]) {
    const wallIndex = walls.findIndex(w => w.id === wallId)
    if (wallIndex < 0) return
    if (direction === 'up' && wallIndex === 0) return
    if (direction === 'down' && wallIndex === walls.length - 1) return

    const swapIndex = direction === 'up' ? wallIndex - 1 : wallIndex + 1
    const wall1 = walls[wallIndex]
    const wall2 = walls[swapIndex]

    try {
      const tempIndex = 9999
      const res1 = await fetch(`/api/walls/${wall1.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderIndex: tempIndex }) })
      if (!res1.ok) throw new Error('Failed to update first wall')
      const res2 = await fetch(`/api/walls/${wall2.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderIndex: wall1.orderIndex }) })
      if (!res2.ok) throw new Error('Failed to update second wall')
      const res3 = await fetch(`/api/walls/${wall1.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderIndex: wall2.orderIndex }) })
      if (!res3.ok) throw new Error('Failed to finalize wall order')

      for (const op of wall1.openings) {
        await fetch(`/api/openings/${op.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wallIndex: swapIndex }) })
      }
      for (const op of wall2.openings) {
        await fetch(`/api/openings/${op.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wallIndex: wallIndex }) })
      }

      onRefresh()
      toast({ title: 'Ordine actualizata' })
    } catch (error) {
      console.error('Error reordering wall:', error)
      toast({ title: 'Eroare', description: 'Nu s-a putut schimba ordinea', variant: 'destructive' })
    }
  }

  return { deleteWall, deleteOpening, moveWall }
}

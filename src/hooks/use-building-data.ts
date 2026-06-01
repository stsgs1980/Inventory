'use client'

import { useState, useEffect, useCallback } from 'react'
import type { BuildingData } from '@/types/inventory'

/**
 * Shared hook for loading building data.
 * Eliminates the duplicated fetch('/api/buildings/${id}') across 5 components.
 */
export function useBuildingData(buildingId: string | null) {
  const [building, setBuilding] = useState<BuildingData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  useEffect(() => {
    if (!buildingId) {
      setBuilding(null)
      return
    }
    let cancelled = false
    setLoading(true)
    async function load() {
      try {
        const res = await fetch(`/api/buildings/${buildingId}`)
        if (res.ok && !cancelled) {
          const data = await res.json()
          setBuilding(data)
          setError(null)
        } else if (!cancelled) {
          setError('Failed to load building')
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [buildingId, refreshKey])

  return { building, loading, error, refresh, setBuilding }
}

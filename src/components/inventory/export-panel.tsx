'use client'

import { useState, useEffect } from 'react'
import { useInventoryStore } from '@/store/inventory-store'
import { calculateArea } from '@/lib/dxf/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, Download, FileText, Building2, LayoutGrid, PenTool, DoorOpen } from 'lucide-react'

interface BuildingData {
  id: string
  letter: string
  permitNumber: string
  permitDate: string
  floorType: string
  floorNumber: number
  interiorHeight: number
  exteriorHeight: number
  rooms: {
    id: string
    number: number
    name: string
    purpose: string
    walls: {
      direction: string
      length: number
      thickness: number
      wallType: string
      openings: {
        openingType: string
      }[]
    }[]
  }[]
}

export function ExportPanel() {
  const { currentBuildingId } = useInventoryStore()
  const [building, setBuilding] = useState<BuildingData | null>(null)
  const [exporting, setExporting] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

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
  }, [currentBuildingId])

  // Reset download URL when building changes
  useEffect(() => {
    setDownloadUrl(null)
  }, [currentBuildingId])

  if (!currentBuildingId) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500 text-sm">
          Selectati o cladire mai intai.
        </p>
      </div>
    )
  }

  if (!building) return null

  // Calculate statistics
  const totalArea = building.rooms.reduce((sum, r) => sum + calculateArea(r.walls), 0)
  const habitableArea = building.rooms
    .filter(r => r.purpose === 'Locuibila')
    .reduce((sum, r) => sum + calculateArea(r.walls), 0)
  const auxiliaryArea = building.rooms
    .filter(r => r.purpose === 'Auxiliara')
    .reduce((sum, r) => sum + calculateArea(r.walls), 0)
  const wallCount = building.rooms.reduce((sum, r) => sum + r.walls.length, 0)
  const openingCount = building.rooms.reduce(
    (sum, r) => sum + r.walls.reduce((s, w) => s + w.openings.length, 0), 0
  )

  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch(`/api/buildings/${currentBuildingId}/export`)
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        setDownloadUrl(url)

        // Auto-trigger download
        const a = document.createElement('a')
        a.href = url
        const contentDisposition = res.headers.get('Content-Disposition')
        const filename = contentDisposition
          ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
          : 'building.dxf'
        a.download = filename || 'building.dxf'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error exporting DXF:', error)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4 p-4">
      {/* Building info summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Informatii cladire
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-gray-500">Litera:</div>
            <div className="font-medium">{building.letter || '-'}</div>
            <div className="text-gray-500">Tip etaj:</div>
            <div className="font-medium">{building.floorType}</div>
            <div className="text-gray-500">Nr. etaj:</div>
            <div className="font-medium">{building.floorNumber}</div>
            <div className="text-gray-500">h interioara:</div>
            <div className="font-medium">{building.interiorHeight} m</div>
            <div className="text-gray-500">H exterioara:</div>
            <div className="font-medium">{building.exteriorHeight} m</div>
            {building.permitNumber && (
              <>
                <div className="text-gray-500">Autorizatie:</div>
                <div className="font-medium">Nr. {building.permitNumber} {building.permitDate ? `din ${building.permitDate}` : ''}</div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Statistici
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <LayoutGrid className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
              <div className="text-lg font-bold text-gray-900">{building.rooms.length}</div>
              <div className="text-xs text-gray-500">Camere</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <PenTool className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
              <div className="text-lg font-bold text-gray-900">{wallCount}</div>
              <div className="text-xs text-gray-500">Pereti</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <DoorOpen className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
              <div className="text-lg font-bold text-gray-900">{openingCount}</div>
              <div className="text-xs text-gray-500">Deschideri</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Areas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700">
            Suprafete
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
            <span className="text-sm font-medium text-emerald-700">Suprafata totala</span>
            <span className="text-sm font-bold text-emerald-700">{totalArea.toFixed(2)} m2</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
            <span className="text-sm font-medium text-blue-700">Suprafata locuibila</span>
            <span className="text-sm font-bold text-blue-700">{habitableArea.toFixed(2)} m2</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Suprafata auxiliara</span>
            <span className="text-sm font-bold text-gray-700">{auxiliaryArea.toFixed(2)} m2</span>
          </div>

          {/* Per-room breakdown */}
          {building.rooms.length > 0 && (
            <div className="mt-3 space-y-1">
              <div className="text-xs font-medium text-gray-500 mb-2">Pe camera:</div>
              {building.rooms.map((room) => {
                const roomArea = calculateArea(room.walls)
                return (
                  <div key={room.id} className="flex justify-between items-center text-xs py-1 px-2">
                    <span className="text-gray-600">
                      #{room.number} {room.name}
                    </span>
                    <span className="font-medium">{roomArea.toFixed(2)} m2</span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export button */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <Button
            onClick={handleExport}
            disabled={exporting || wallCount === 0}
            className="w-full bg-emerald-600 hover:bg-emerald-700 min-h-[52px] text-base"
          >
            <Download className="w-5 h-5 mr-2" />
            {exporting ? 'Se genereaza...' : 'Genereaza DXF'}
          </Button>

          {downloadUrl && (
            <a
              href={downloadUrl}
              download
              className="flex items-center justify-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 underline"
            >
              <Download className="w-4 h-4" />
              Descarca din nou fisierul DXF
            </a>
          )}

          {wallCount === 0 && (
            <p className="text-xs text-center text-gray-400">
              Adaugati pereti la camere inainte de a exporta.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

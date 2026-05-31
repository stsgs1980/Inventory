'use client'

import { useState, useEffect } from 'react'
import { useInventoryStore } from '@/store/inventory-store'
import { useBuildingData } from '@/hooks/use-building-data'
import type { BuildingData } from '@/types/inventory'
import { calculateArea } from '@/lib/dxf/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, Download, FileText, Building2, LayoutGrid, PenTool, DoorOpen } from 'lucide-react'

export function ExportPanel() {
  const { currentBuildingId } = useInventoryStore()
  const { building, refresh } = useBuildingData(currentBuildingId)
  const [exporting, setExporting] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

  useEffect(() => { setDownloadUrl(null) }, [currentBuildingId])

  if (!currentBuildingId) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500 text-sm">Selectati o cladire mai intai.</p>
      </div>
    )
  }
  if (!building) return null

  const stats = computeStats(building)

  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch(`/api/buildings/${currentBuildingId}/export`)
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        setDownloadUrl(url)
        const a = document.createElement('a')
        a.href = url
        const cd = res.headers.get('Content-Disposition')
        a.download = cd ? cd.split('filename=')[1]?.replace(/"/g, '') || 'building.dxf' : 'building.dxf'
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
      }
    } catch (error) { console.error('Error exporting DXF:', error) }
    finally { setExporting(false) }
  }

  return (
    <div className="space-y-4 p-4">
      <BuildingInfoCard building={building} />
      <StatsCard stats={stats} />
      <AreasCard building={building} stats={stats} />
      <Card>
        <CardContent className="pt-6 space-y-3">
          <Button onClick={handleExport} disabled={exporting || stats.wallCount === 0}
            className="w-full bg-emerald-600 hover:bg-emerald-700 min-h-[52px] text-base">
            <Download className="w-5 h-5 mr-2" />{exporting ? 'Se genereaza...' : 'Genereaza DXF'}
          </Button>
          {downloadUrl && (
            <a href={downloadUrl} download className="flex items-center justify-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 underline">
              <Download className="w-4 h-4" />Descarca din nou fisierul DXF
            </a>
          )}
          {stats.wallCount === 0 && <p className="text-xs text-center text-gray-400">Adaugati pereti la camere inainte de a exporta.</p>}
        </CardContent>
      </Card>
    </div>
  )
}

function BuildingInfoCard({ building }: { building: BuildingData }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Building2 className="w-4 h-4" />Informatii cladire</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="text-gray-500">Litera:</div><div className="font-medium">{building.letter || '-'}</div>
          <div className="text-gray-500">Tip etaj:</div><div className="font-medium">{building.floorType}</div>
          <div className="text-gray-500">Nr. etaj:</div><div className="font-medium">{building.floorNumber}</div>
          <div className="text-gray-500">h interioara:</div><div className="font-medium">{building.interiorHeight} m</div>
          <div className="text-gray-500">H exterioara:</div><div className="font-medium">{building.exteriorHeight} m</div>
          {building.permitNumber && (<><div className="text-gray-500">Autorizatie:</div><div className="font-medium">Nr. {building.permitNumber} {building.permitDate ? `din ${building.permitDate}` : ''}</div></>)}
        </div>
      </CardContent>
    </Card>
  )
}

interface BuildingStats { roomCount: number; wallCount: number; openingCount: number; totalArea: number; habitableArea: number; auxiliaryArea: number }

function StatsCard({ stats }: { stats: BuildingStats }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2"><FileText className="w-4 h-4" />Statistici</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          <StatBox icon={<LayoutGrid className="w-5 h-5 mx-auto text-emerald-600 mb-1" />} value={stats.roomCount} label="Camere" />
          <StatBox icon={<PenTool className="w-5 h-5 mx-auto text-emerald-600 mb-1" />} value={stats.wallCount} label="Pereti" />
          <StatBox icon={<DoorOpen className="w-5 h-5 mx-auto text-emerald-600 mb-1" />} value={stats.openingCount} label="Deschideri" />
        </div>
      </CardContent>
    </Card>
  )
}

function StatBox({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="text-center p-3 bg-gray-50 rounded-lg">
      {icon}<div className="text-lg font-bold text-gray-900">{value}</div><div className="text-xs text-gray-500">{label}</div>
    </div>
  )
}

function AreasCard({ building, stats }: { building: BuildingData; stats: BuildingStats }) {
  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-gray-700">Suprafete</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <AreaRow label="Suprafata totala" value={stats.totalArea} color="emerald" />
        <AreaRow label="Suprafata locuibila" value={stats.habitableArea} color="blue" />
        <AreaRow label="Suprafata auxiliara" value={stats.auxiliaryArea} color="gray" />
        {building.rooms.length > 0 && (
          <div className="mt-3 space-y-1">
            <div className="text-xs font-medium text-gray-500 mb-2">Pe camera:</div>
            {building.rooms.map((room) => (
              <div key={room.id} className="flex justify-between items-center text-xs py-1 px-2">
                <span className="text-gray-600">#{room.number} {room.name}</span>
                <span className="font-medium">{calculateArea(room.walls).toFixed(2)} m2</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AreaRow({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = { emerald: 'text-emerald-700 bg-emerald-50', blue: 'text-blue-700 bg-blue-50', gray: 'text-gray-700 bg-gray-50' }
  return (
    <div className={`flex justify-between items-center p-3 rounded-lg ${colors[color]}`}>
      <span className={`text-sm font-medium`}>{label}</span>
      <span className="text-sm font-bold">{value.toFixed(2)} m2</span>
    </div>
  )
}

function computeStats(building: BuildingData): BuildingStats {
  const totalArea = building.rooms.reduce((sum, r) => sum + calculateArea(r.walls), 0)
  const habitableArea = building.rooms.filter(r => r.purpose === 'Locuibila').reduce((sum, r) => sum + calculateArea(r.walls), 0)
  const auxiliaryArea = building.rooms.filter(r => r.purpose === 'Auxiliara').reduce((sum, r) => sum + calculateArea(r.walls), 0)
  const wallCount = building.rooms.reduce((sum, r) => sum + r.walls.length, 0)
  const openingCount = building.rooms.reduce((sum, r) => sum + r.walls.reduce((s, w) => s + w.openings.length, 0), 0)
  return { roomCount: building.rooms.length, wallCount, openingCount, totalArea, habitableArea, auxiliaryArea }
}

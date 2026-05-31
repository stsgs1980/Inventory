'use client'

import { useState, useEffect } from 'react'
import { useInventoryStore } from '@/store/inventory-store'
import { FLOOR_TYPES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Save, Plus, Trash2 } from 'lucide-react'

interface BuildingData {
  id?: string
  letter: string
  permitNumber: string
  permitDate: string
  floorType: string
  floorNumber: number
  interiorHeight: number
  exteriorHeight: number
  notes: string
}

export function BuildingForm() {
  const { currentBuildingId, setBuilding } = useInventoryStore()
  const [buildings, setBuildings] = useState<BuildingData[]>([])
  const [form, setForm] = useState<BuildingData>({
    letter: '',
    permitNumber: '',
    permitDate: '',
    floorType: 'Parter',
    floorNumber: 1,
    interiorHeight: 2.70,
    exteriorHeight: 3.00,
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  // Load buildings list
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/buildings')
        if (res.ok && !cancelled) {
          const data = await res.json()
          setBuildings(data)
          // Auto-select first building if none selected
          if (!currentBuildingId && data.length > 0) {
            setBuilding(data[0].id)
          }
        }
      } catch (error) {
        console.error('Error loading buildings:', error)
      }
    }
    load()
    return () => { cancelled = true }
  }, [currentBuildingId, setBuilding])

  // Load current building data when selected
  useEffect(() => {
    if (!currentBuildingId) return
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/buildings/${currentBuildingId}`)
        if (res.ok && !cancelled) {
          const data = await res.json()
          setForm({
            id: data.id,
            letter: data.letter || '',
            permitNumber: data.permitNumber || '',
            permitDate: data.permitDate || '',
            floorType: data.floorType || 'Parter',
            floorNumber: data.floorNumber ?? 1,
            interiorHeight: data.interiorHeight ?? 2.70,
            exteriorHeight: data.exteriorHeight ?? 3.00,
            notes: data.notes || '',
          })
        }
      } catch (error) {
        console.error('Error loading building:', error)
      }
    }
    load()
    return () => { cancelled = true }
  }, [currentBuildingId])

  async function reloadBuildings() {
    try {
      const res = await fetch('/api/buildings')
      if (res.ok) {
        const data = await res.json()
        setBuildings(data)
      }
    } catch (error) {
      console.error('Error loading buildings:', error)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (currentBuildingId) {
        // Update existing
        const res = await fetch(`/api/buildings/${currentBuildingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (res.ok) {
          const updated = await res.json()
          setForm(updated)
        }
      } else {
        // Create new
        const res = await fetch('/api/buildings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (res.ok) {
          const created = await res.json()
          setBuilding(created.id)
          setForm(prev => ({ ...prev, id: created.id }))
        }
      }
      await reloadBuildings()
    } catch (error) {
      console.error('Error saving building:', error)
    } finally {
      setSaving(false)
    }
  }

  async function handleNew() {
    setBuilding(null)
    setForm({
      letter: '',
      permitNumber: '',
      permitDate: '',
      floorType: 'Parter',
      floorNumber: 1,
      interiorHeight: 2.70,
      exteriorHeight: 3.00,
      notes: '',
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Sigur doriti sa stergeti aceasta cladire?')) return
    try {
      await fetch(`/api/buildings/${id}`, { method: 'DELETE' })
      if (currentBuildingId === id) {
        setBuilding(null)
        handleNew()
      }
      await reloadBuildings()
    } catch (error) {
      console.error('Error deleting building:', error)
    }
  }

  return (
    <div className="space-y-4 p-4">
      {/* Building selector */}
      {buildings.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">Cladiri existente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {buildings.map((b) => (
              <div
                key={b.id}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                  currentBuildingId === b.id
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setBuilding(b.id!)}
              >
                <div>
                  <span className="font-medium text-gray-900">
                    Lit. {b.letter || '-'}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">
                    {b.floorType} - {b.permitNumber || 'fara autorizatie'}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-400 hover:text-red-600"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(b.id!)
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Building form */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-700">
              {currentBuildingId ? 'Editeaza cladire' : 'Cladire noua'}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleNew} className="min-h-[44px]">
              <Plus className="w-4 h-4 mr-1" />
              Noua
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="letter">Litera cladire</Label>
              <Input
                id="letter"
                value={form.letter}
                onChange={(e) => setForm(prev => ({ ...prev, letter: e.target.value }))}
                placeholder="B"
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="floorNumber">Nr. Etaj</Label>
              <Input
                id="floorNumber"
                type="number"
                value={form.floorNumber}
                onChange={(e) => setForm(prev => ({ ...prev, floorNumber: parseInt(e.target.value) || 1 }))}
                min={1}
                className="min-h-[44px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="permitNumber">Nr. Autorizatie</Label>
              <Input
                id="permitNumber"
                value={form.permitNumber}
                onChange={(e) => setForm(prev => ({ ...prev, permitNumber: e.target.value }))}
                placeholder="1922"
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="permitDate">Data Autorizatie</Label>
              <Input
                id="permitDate"
                value={form.permitDate}
                onChange={(e) => setForm(prev => ({ ...prev, permitDate: e.target.value }))}
                placeholder="DD.MM.YYYY"
                className="min-h-[44px]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="floorType">Tip Etaj</Label>
            <Select
              value={form.floorType}
              onValueChange={(v) => setForm(prev => ({ ...prev, floorType: v }))}
            >
              <SelectTrigger className="min-h-[44px]">
                <SelectValue placeholder="Selectati tipul etajului" />
              </SelectTrigger>
              <SelectContent>
                {FLOOR_TYPES.map((ft) => (
                  <SelectItem key={ft} value={ft}>{ft}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interiorHeight">Inaltime Interioara (m)</Label>
              <Input
                id="interiorHeight"
                type="number"
                step="0.01"
                value={form.interiorHeight}
                onChange={(e) => setForm(prev => ({ ...prev, interiorHeight: parseFloat(e.target.value) || 2.70 }))}
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exteriorHeight">Inaltime Exterioara (m)</Label>
              <Input
                id="exteriorHeight"
                type="number"
                step="0.01"
                value={form.exteriorHeight}
                onChange={(e) => setForm(prev => ({ ...prev, exteriorHeight: parseFloat(e.target.value) || 3.00 }))}
                className="min-h-[44px]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Note</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Note aditionale..."
              rows={3}
              className="min-h-[44px]"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-emerald-600 hover:bg-emerald-700 min-h-[48px]"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Se salveaza...' : 'Salveaza'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

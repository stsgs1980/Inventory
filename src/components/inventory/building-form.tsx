'use client'

import { useState, useEffect } from 'react'
import { useInventoryStore } from '@/store/inventory-store'
import { useBuildingData } from '@/hooks/use-building-data'
import { FLOOR_TYPES } from '@/lib/constants'
import type { BuildingData } from '@/types/inventory'
import { BuildingSelector } from './building-selector'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Save, Plus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const EMPTY_FORM: Omit<BuildingData, 'id' | 'rooms'> = {
  letter: '', permitNumber: '', permitDate: '',
  floorType: 'Parter', floorNumber: 1,
  interiorHeight: 2.70, exteriorHeight: 3.00, notes: '',
}

export function BuildingForm() {
  const { currentBuildingId, setBuilding } = useInventoryStore()
  const { toast } = useToast()
  const [buildings, setBuildings] = useState<BuildingData[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/buildings')
        if (res.ok && !cancelled) {
          const data = await res.json()
          setBuildings(data)
          if (!currentBuildingId && data.length > 0) setBuilding(data[0].id)
        }
      } catch (error) { console.error('Error loading buildings:', error) }
    }
    load()
    return () => { cancelled = true }
  }, [currentBuildingId, setBuilding])

  useEffect(() => {
    if (!currentBuildingId) return
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/buildings/${currentBuildingId}`)
        if (res.ok && !cancelled) {
          const data = await res.json()
          setForm({ letter: data.letter || '', permitNumber: data.permitNumber || '', permitDate: data.permitDate || '',
            floorType: data.floorType || 'Parter', floorNumber: data.floorNumber ?? 1,
            interiorHeight: data.interiorHeight ?? 2.70, exteriorHeight: data.exteriorHeight ?? 3.00, notes: data.notes || '' })
        }
      } catch (error) { console.error('Error loading building:', error) }
    }
    load()
    return () => { cancelled = true }
  }, [currentBuildingId])

  async function reloadBuildings() {
    try {
      const res = await fetch('/api/buildings')
      if (res.ok) setBuildings(await res.json())
    } catch (error) { console.error('Error loading buildings:', error) }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = currentBuildingId
        ? await fetch(`/api/buildings/${currentBuildingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        : await fetch('/api/buildings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (res.ok) {
        const saved = await res.json()
        if (!currentBuildingId) { setBuilding(saved.id) }
      }
      await reloadBuildings()
      toast({ title: currentBuildingId ? 'Cladire actualizata' : 'Cladire creata', description: `Lit. ${form.letter || '-'} ${form.floorType}` })
    } catch (error) {
      console.error('Error saving building:', error)
      toast({ title: 'Eroare', description: 'Nu s-a putut salva cladirea', variant: 'destructive' })
    } finally { setSaving(false) }
  }

  function handleNew() {
    setBuilding(null)
    setForm(EMPTY_FORM)
  }

  async function handleDelete(id: string) {
    if (!confirm('Sigur doriti sa stergeti aceasta cladire?')) return
    try {
      await fetch(`/api/buildings/${id}`, { method: 'DELETE' })
      if (currentBuildingId === id) { setBuilding(null); setForm(EMPTY_FORM) }
      await reloadBuildings()
      toast({ title: 'Cladire stearsa' })
    } catch (error) { console.error('Error deleting building:', error) }
  }

  return (
    <div className="space-y-4 p-4">
      <BuildingSelector buildings={buildings} currentBuildingId={currentBuildingId}
        onSelect={(id) => setBuilding(id)} onDelete={handleDelete} />
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-700">{currentBuildingId ? 'Editeaza cladire' : 'Cladire noua'}</CardTitle>
            <Button variant="outline" size="sm" onClick={handleNew} className="min-h-[44px]"><Plus className="w-4 h-4 mr-1" />Noua</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormFields form={form} onChange={setForm} />
          <Button onClick={handleSave} disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-700 min-h-[48px]">
            <Save className="w-4 h-4 mr-2" />{saving ? 'Se salveaza...' : 'Salveaza'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function FormFields({ form, onChange }: { form: typeof EMPTY_FORM; onChange: (f: typeof EMPTY_FORM) => void }) {
  const up = (patch: Partial<typeof EMPTY_FORM>) => onChange({ ...form, ...patch })
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="letter">Litera cladire</Label>
          <Input id="letter" value={form.letter} onChange={(e) => up({ letter: e.target.value })} placeholder="B" className="min-h-[44px]" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="floorNumber">Nr. Etaj</Label>
          <Input id="floorNumber" type="number" value={form.floorNumber} onChange={(e) => up({ floorNumber: parseInt(e.target.value) || 1 })} min={1} className="min-h-[44px]" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="permitNumber">Nr. Autorizatie</Label>
          <Input id="permitNumber" value={form.permitNumber} onChange={(e) => up({ permitNumber: e.target.value })} placeholder="1922" className="min-h-[44px]" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="permitDate">Data Autorizatie</Label>
          <Input id="permitDate" value={form.permitDate} onChange={(e) => up({ permitDate: e.target.value })} placeholder="DD.MM.YYYY" className="min-h-[44px]" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="floorType">Tip Etaj</Label>
        <Select value={form.floorType} onValueChange={(v) => up({ floorType: v })}>
          <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Selectati tipul etajului" /></SelectTrigger>
          <SelectContent>{FLOOR_TYPES.map((ft) => <SelectItem key={ft} value={ft}>{ft}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="interiorHeight">Inaltime Interioara (m)</Label>
          <Input id="interiorHeight" type="number" step="0.01" value={form.interiorHeight} onChange={(e) => up({ interiorHeight: parseFloat(e.target.value) || 2.70 })} className="min-h-[44px]" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="exteriorHeight">Inaltime Exterioara (m)</Label>
          <Input id="exteriorHeight" type="number" step="0.01" value={form.exteriorHeight} onChange={(e) => up({ exteriorHeight: parseFloat(e.target.value) || 3.00 })} className="min-h-[44px]" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Note</Label>
        <Textarea id="notes" value={form.notes} onChange={(e) => up({ notes: e.target.value })} placeholder="Note aditionale..." rows={3} className="min-h-[44px]" />
      </div>
    </>
  )
}

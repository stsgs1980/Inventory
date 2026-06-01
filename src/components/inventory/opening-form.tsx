'use client'

import { useReducer } from 'react'
import type { OpeningData } from '@/types/inventory'
import { OPENING_TYPES } from '@/lib/constants'
import { DOOR_PRESETS, WINDOW_PRESETS, DEFAULT_OPENING_DIMS } from '@/lib/opening-presets'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

interface OpeningFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallId: string
  wallIndex: number
  wallLength?: number
  onSubmit: () => void
  editOpening?: OpeningData | null
}

interface FormState {
  openingType: string
  offset: number
  width: number
  height: number
  saving: boolean
  error: string | null
}

type Action =
  | { type: 'setType'; payload: string }
  | { type: 'setField'; field: 'offset' | 'width' | 'height'; value: number }
  | { type: 'setSaving'; value: boolean }
  | { type: 'setError'; value: string | null }
  | { type: 'reset'; openingType: string; offset: number; width: number; height: number }

function reducer(state: FormState, action: Action): FormState {
  switch (action.type) {
    case 'setType': {
      const dims = DEFAULT_OPENING_DIMS[action.payload as keyof typeof DEFAULT_OPENING_DIMS]
      return { ...state, openingType: action.payload, width: dims.width, height: dims.height }
    }
    case 'setField': return { ...state, [action.field]: action.value }
    case 'setSaving': return { ...state, saving: action.value }
    case 'setError': return { ...state, error: action.value }
    case 'reset': return { saving: false, error: null, openingType: action.openingType, offset: action.offset, width: action.width, height: action.height }
  }
}

export function OpeningForm({ open, onOpenChange, wallId, wallIndex, wallLength, onSubmit, editOpening }: OpeningFormProps) {
  const { toast } = useToast()
  const [state, dispatch] = useReducer(reducer, {
    openingType: editOpening?.openingType ?? 'door',
    offset: editOpening?.offset ?? 0,
    width: editOpening?.width ?? DEFAULT_OPENING_DIMS.door.width,
    height: editOpening?.height ?? DEFAULT_OPENING_DIMS.door.height,
    saving: false,
    error: null,
  })

  function handleOpenChange(isOpen: boolean) {
    if (isOpen) {
      dispatch({ type: 'reset', openingType: editOpening?.openingType ?? 'door',
        offset: editOpening?.offset ?? 0,
        width: editOpening?.width ?? (editOpening?.openingType === 'door' ? 0.9 : 1.2),
        height: editOpening?.height ?? (editOpening?.openingType === 'door' ? 2.1 : 1.5) })
    }
    onOpenChange(isOpen)
  }

  function validate(): string | null {
    if (state.width <= 0) return 'Latimea trebuie sa fie mai mare de 0'
    if (state.height <= 0) return 'Inaltimea trebuie sa fie mai mare de 0'
    if (state.offset < 0) return 'Distanta nu poate fi negativa'
    if (wallLength && state.offset + state.width > wallLength) {
      return `Deschiderea depaseste lungimea peretelui (${wallLength}m). Distanta + Latime = ${(state.offset + state.width).toFixed(2)}m`
    }
    return null
  }

  async function handleSubmit() {
    const validationError = validate()
    if (validationError) { dispatch({ type: 'setError', value: validationError }); return }
    dispatch({ type: 'setError', value: null })
    dispatch({ type: 'setSaving', value: true })
    try {
      if (editOpening) {
        await fetch(`/api/openings/${editOpening.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ openingType: state.openingType, wallIndex, offset: state.offset, width: state.width, height: state.height }) })
      } else {
        await fetch('/api/openings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wallId, openingType: state.openingType, wallIndex, offset: state.offset, width: state.width, height: state.height }) })
      }
      onSubmit()
      onOpenChange(false)
      toast({ title: editOpening ? 'Deschidere actualizata' : 'Deschidere adaugata', description: `${state.openingType === 'door' ? 'Usa' : 'Fereastra'} ${state.width}m x ${state.height}m` })
    } catch (error) {
      console.error('Error saving opening:', error)
      toast({ title: 'Eroare', description: 'Nu s-a putut salva deschiderea', variant: 'destructive' })
    } finally { dispatch({ type: 'setSaving', value: false }) }
  }

  const presets = state.openingType === 'door' ? DOOR_PRESETS : WINDOW_PRESETS

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{editOpening ? 'Editeaza deschidere' : 'Adauga deschidere'}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>Tip deschidere</Label>
            <RadioGroup value={state.openingType} onValueChange={(v) => dispatch({ type: 'setType', payload: v })} className="flex gap-4">
              {OPENING_TYPES.map((ot) => (
                <div key={ot} className="flex items-center space-x-2">
                  <RadioGroupItem value={ot} id={`openingType-${ot}`} />
                  <Label htmlFor={`openingType-${ot}`} className="cursor-pointer">{ot === 'door' ? 'Usa' : 'Fereastra'}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormField id="openingOffset" label="Distanta (m)" value={state.offset} onChange={(v) => dispatch({ type: 'setField', field: 'offset', value: v })} placeholder="0.00" min={0} />
            <FormField id="openingWidth" label="Latime (m)" value={state.width} onChange={(v) => dispatch({ type: 'setField', field: 'width', value: v })} placeholder={state.openingType === 'door' ? '0.90' : '1.20'} min={0.01} />
            <FormField id="openingHeight" label="Inaltime (m)" value={state.height} onChange={(v) => dispatch({ type: 'setField', field: 'height', value: v })} placeholder={state.openingType === 'door' ? '2.10' : '1.50'} min={0.01} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Dimensiuni standard</Label>
            <div className="flex flex-wrap gap-1">
              {presets.map(preset => (
                <button key={preset.label} type="button"
                  onClick={() => { dispatch({ type: 'setField', field: 'width', value: preset.width }); dispatch({ type: 'setField', field: 'height', value: preset.height }) }}
                  className={`text-xs px-2 py-1 rounded border ${
                    Math.abs(state.width - preset.width) < 0.01 && Math.abs(state.height - preset.height) < 0.01
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}>{preset.label}</button>
              ))}
            </div>
          </div>
          {state.error && <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">{state.error}</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="min-h-[44px]">Anuleaza</Button>
          <Button onClick={handleSubmit} disabled={state.saving || state.width <= 0 || state.height <= 0} className="bg-emerald-600 hover:bg-emerald-700 min-h-[44px]">
            {state.saving ? 'Se salveaza...' : editOpening ? 'Salveaza' : 'Adauga'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FormField({ id, label, value, onChange, placeholder, min }: {
  id: string; label: string; value: number; onChange: (v: number) => void; placeholder: string; min: number
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" step="0.01" value={value || ''} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} placeholder={placeholder} min={min} className="min-h-[44px]" />
    </div>
  )
}

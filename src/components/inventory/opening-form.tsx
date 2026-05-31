'use client'

import { useState } from 'react'
import { OPENING_TYPES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

interface OpeningFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallId: string
  wallIndex: number
  wallLength?: number
  onSubmit: () => void
  editOpening?: {
    id: string
    openingType: string
    offset: number
    width: number
    height: number
  } | null
}

export function OpeningForm({ open, onOpenChange, wallId, wallIndex, wallLength, onSubmit, editOpening }: OpeningFormProps) {
  const { toast } = useToast()
  const [openingType, setOpeningType] = useState(editOpening?.openingType ?? 'door')
  const [offset, setOffset] = useState(editOpening?.offset ?? 0)
  const [width, setWidth] = useState(editOpening?.width ?? 0.9)
  const [height, setHeight] = useState(editOpening?.height ?? 2.1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset when opening
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setOpeningType(editOpening?.openingType ?? 'door')
      setOffset(editOpening?.offset ?? 0)
      setWidth(editOpening?.width ?? (editOpening?.openingType === 'door' ? 0.9 : 1.2))
      setHeight(editOpening?.height ?? (editOpening?.openingType === 'door' ? 2.1 : 1.5))
      setError(null)
    }
    onOpenChange(isOpen)
  }

  // Default sizes by type
  function handleTypeChange(type: string) {
    setOpeningType(type)
    if (type === 'door') {
      setWidth(0.9)
      setHeight(2.1)
    } else {
      setWidth(1.2)
      setHeight(1.5)
    }
  }

  function validate(): string | null {
    if (width <= 0) return 'Latimea trebuie sa fie mai mare de 0'
    if (height <= 0) return 'Inaltimea trebuie sa fie mai mare de 0'
    if (offset < 0) return 'Distanta nu poate fi negativa'
    if (wallLength && offset + width > wallLength) {
      return `Deschiderea depaseste lungimea peretelui (${wallLength}m). Distanta + Latime = ${(offset + width).toFixed(2)}m`
    }
    return null
  }

  async function handleSubmit() {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setSaving(true)
    try {
      if (editOpening) {
        await fetch(`/api/openings/${editOpening.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            openingType,
            wallIndex,
            offset,
            width,
            height,
          }),
        })
      } else {
        await fetch('/api/openings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallId,
            openingType,
            wallIndex,
            offset,
            width,
            height,
          }),
        })
      }
      onSubmit()
      onOpenChange(false)
      toast({
        title: editOpening ? 'Deschidere actualizata' : 'Deschidere adaugata',
        description: `${openingType === 'door' ? 'Usa' : 'Fereastra'} ${width}m x ${height}m`,
      })
    } catch (error) {
      console.error('Error saving opening:', error)
      toast({ title: 'Eroare', description: 'Nu s-a putut salva deschiderea', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editOpening ? 'Editeaza deschidere' : 'Adauga deschidere'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>Tip deschidere</Label>
            <RadioGroup value={openingType} onValueChange={handleTypeChange} className="flex gap-4">
              {OPENING_TYPES.map((ot) => (
                <div key={ot} className="flex items-center space-x-2">
                  <RadioGroupItem value={ot} id={`openingType-${ot}`} />
                  <Label htmlFor={`openingType-${ot}`} className="cursor-pointer">
                    {ot === 'door' ? 'Usa' : 'Fereastra'}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="openingOffset">Distanta (m)</Label>
              <Input
                id="openingOffset"
                type="number"
                step="0.01"
                value={offset || ''}
                onChange={(e) => setOffset(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                min={0}
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="openingWidth">Latime (m)</Label>
              <Input
                id="openingWidth"
                type="number"
                step="0.01"
                value={width || ''}
                onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
                placeholder={openingType === 'door' ? '0.90' : '1.20'}
                min={0.01}
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="openingHeight">Inaltime (m)</Label>
              <Input
                id="openingHeight"
                type="number"
                step="0.01"
                value={height || ''}
                onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
                placeholder={openingType === 'door' ? '2.10' : '1.50'}
                min={0.01}
                className="min-h-[44px]"
              />
            </div>
          </div>

          {/* Quick presets */}
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Dimensiuni standard</Label>
            {openingType === 'door' ? (
              <div className="flex flex-wrap gap-1">
                {[
                  { w: 0.7, h: 2.05, label: '0.70x2.05' },
                  { w: 0.8, h: 2.05, label: '0.80x2.05' },
                  { w: 0.9, h: 2.10, label: '0.90x2.10' },
                  { w: 1.0, h: 2.10, label: '1.00x2.10' },
                ].map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => { setWidth(preset.w); setHeight(preset.h) }}
                    className={`text-xs px-2 py-1 rounded border ${
                      Math.abs(width - preset.w) < 0.01 && Math.abs(height - preset.h) < 0.01
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {[
                  { w: 0.60, h: 1.20, label: '0.60x1.20' },
                  { w: 0.90, h: 1.20, label: '0.90x1.20' },
                  { w: 1.00, h: 1.40, label: '1.00x1.40' },
                  { w: 1.20, h: 1.50, label: '1.20x1.50' },
                  { w: 1.50, h: 1.50, label: '1.50x1.50' },
                ].map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => { setWidth(preset.w); setHeight(preset.h) }}
                    className={`text-xs px-2 py-1 rounded border ${
                      Math.abs(width - preset.w) < 0.01 && Math.abs(height - preset.h) < 0.01
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Validation error */}
          {error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              {error}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="min-h-[44px]">
            Anuleaza
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || width <= 0 || height <= 0}
            className="bg-emerald-600 hover:bg-emerald-700 min-h-[44px]"
          >
            {saving ? 'Se salveaza...' : editOpening ? 'Salveaza' : 'Adauga'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

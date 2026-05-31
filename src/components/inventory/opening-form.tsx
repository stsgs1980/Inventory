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
  onSubmit: () => void
}

export function OpeningForm({ open, onOpenChange, wallId, wallIndex, onSubmit }: OpeningFormProps) {
  const { toast } = useToast()
  const [openingType, setOpeningType] = useState('door')
  const [offset, setOffset] = useState(0)
  const [width, setWidth] = useState(0.9)
  const [height, setHeight] = useState(2.1)
  const [saving, setSaving] = useState(false)

  // Reset when opening
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setOpeningType('door')
      setOffset(0)
      setWidth(0.9)
      setHeight(2.1)
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

  async function handleSubmit() {
    if (width <= 0 || height <= 0) return
    setSaving(true)
    try {
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
      onSubmit()
      onOpenChange(false)
      toast({
        title: 'Deschidere adaugata',
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
          <DialogTitle>Adauga deschidere</DialogTitle>
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
                placeholder="0.90"
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
                placeholder="2.10"
                min={0.01}
                className="min-h-[44px]"
              />
            </div>
          </div>
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
            {saving ? 'Se salveaza...' : 'Adauga'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

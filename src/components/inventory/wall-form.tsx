'use client'

import { useState } from 'react'
import { WALL_TYPES, DEFAULT_THICKNESS_PORTANT, DEFAULT_THICKNESS_DESPARTITOR } from '@/lib/constants'
import { CompassSelector } from './compass-selector'
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

interface WallFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roomId: string
  orderIndex: number
  onSubmit: () => void
  editWall?: {
    id: string
    direction: string
    length: number
    thickness: number
    wallType: string
    orderIndex: number
  } | null
}

export function WallForm({ open, onOpenChange, roomId, orderIndex, onSubmit, editWall }: WallFormProps) {
  const { toast } = useToast()
  const [direction, setDirection] = useState(editWall?.direction ?? 'N')
  const [length, setLength] = useState(editWall?.length ?? 0)
  const [thickness, setThickness] = useState(editWall?.thickness ?? DEFAULT_THICKNESS_PORTANT)
  const [wallType, setWallType] = useState(editWall?.wallType ?? 'portant')
  const [saving, setSaving] = useState(false)

  // Reset when opening
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setDirection(editWall?.direction ?? 'N')
      setLength(editWall?.length ?? 0)
      setThickness(editWall?.thickness ?? DEFAULT_THICKNESS_PORTANT)
      setWallType(editWall?.wallType ?? 'portant')
    }
    onOpenChange(isOpen)
  }

  // Update thickness preset when wall type changes
  function handleWallTypeChange(type: string) {
    setWallType(type)
    if (type === 'portant') {
      setThickness(DEFAULT_THICKNESS_PORTANT)
    } else {
      setThickness(DEFAULT_THICKNESS_DESPARTITOR)
    }
  }

  async function handleSubmit() {
    if (length <= 0 || thickness <= 0) return
    setSaving(true)
    try {
      if (editWall) {
        await fetch(`/api/walls/${editWall.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            direction,
            length,
            thickness,
            wallType,
          }),
        })
      } else {
        await fetch('/api/walls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId,
            direction,
            length,
            thickness,
            wallType,
            orderIndex,
          }),
        })
      }
      onSubmit()
      onOpenChange(false)
      toast({
        title: editWall ? 'Perete actualizat' : 'Perete adaugat',
        description: `${direction} ${length}m x ${thickness}mm (${wallType === 'portant' ? 'Portant' : 'Despartitor'})`,
      })
    } catch (error) {
      console.error('Error saving wall:', error)
      toast({ title: 'Eroare', description: 'Nu s-a putut salva peretele', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editWall ? 'Editeaza perete' : 'Adauga perete'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Compass direction selector */}
          <div className="space-y-2">
            <Label>Directie</Label>
            <CompassSelector value={direction} onChange={setDirection} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wallLength">Lungime (m)</Label>
            <Input
              id="wallLength"
              type="number"
              step="0.01"
              value={length || ''}
              onChange={(e) => setLength(parseFloat(e.target.value) || 0)}
              placeholder="3.50"
              min={0.01}
              className="min-h-[44px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wallThickness">Grosime (mm)</Label>
            <Input
              id="wallThickness"
              type="number"
              step="10"
              value={thickness || ''}
              onChange={(e) => setThickness(parseFloat(e.target.value) || 0)}
              placeholder="400"
              min={1}
              className="min-h-[44px]"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setThickness(DEFAULT_THICKNESS_PORTANT)}
                className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
              >
                Portant: {DEFAULT_THICKNESS_PORTANT}mm
              </button>
              <button
                type="button"
                onClick={() => setThickness(DEFAULT_THICKNESS_DESPARTITOR)}
                className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
              >
                Despartitor: {DEFAULT_THICKNESS_DESPARTITOR}mm
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Tip perete</Label>
            <RadioGroup value={wallType} onValueChange={handleWallTypeChange} className="flex gap-4">
              {WALL_TYPES.map((wt) => (
                <div key={wt} className="flex items-center space-x-2">
                  <RadioGroupItem value={wt} id={`wallType-${wt}`} />
                  <Label htmlFor={`wallType-${wt}`} className="cursor-pointer capitalize">
                    {wt === 'portant' ? 'Portant' : 'Despartitor'}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="min-h-[44px]">
            Anuleaza
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || length <= 0 || thickness <= 0}
            className="bg-emerald-600 hover:bg-emerald-700 min-h-[44px]"
          >
            {saving ? 'Se salveaza...' : editWall ? 'Salveaza' : 'Adauga'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

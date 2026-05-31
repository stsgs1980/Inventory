'use client'

import { useState } from 'react'
import { ROOM_NAMES, ROOM_PURPOSES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

interface RoomFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  buildingId: string
  onSubmit: () => void
  editRoom?: {
    id: string
    number: number
    name: string
    purpose: string
    interiorHeight: number
  } | null
  nextRoomNumber?: number
}

export function RoomForm({ open, onOpenChange, buildingId, onSubmit, editRoom, nextRoomNumber }: RoomFormProps) {
  const { toast } = useToast()
  const [number, setNumber] = useState(editRoom?.number ?? nextRoomNumber ?? 1)
  const [name, setName] = useState(editRoom?.name ?? 'Antreu')
  const [purpose, setPurpose] = useState(editRoom?.purpose ?? 'Auxiliara')
  const [interiorHeight, setInteriorHeight] = useState(editRoom?.interiorHeight ?? 2.70)
  const [saving, setSaving] = useState(false)

  // Reset form when dialog opens or editRoom changes
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setNumber(editRoom?.number ?? nextRoomNumber ?? 1)
      setName(editRoom?.name ?? 'Antreu')
      setPurpose(editRoom?.purpose ?? 'Auxiliara')
      setInteriorHeight(editRoom?.interiorHeight ?? 2.70)
    }
    onOpenChange(isOpen)
  }

  async function handleSubmit() {
    setSaving(true)
    try {
      if (editRoom) {
        await fetch(`/api/rooms/${editRoom.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ number, name, purpose, interiorHeight }),
        })
      } else {
        await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            buildingId,
            number,
            name,
            purpose,
            interiorHeight,
            orderIndex: 0,
          }),
        })
      }
      onSubmit()
      onOpenChange(false)
      toast({
        title: editRoom ? 'Camera actualizata' : 'Camera adaugata',
        description: `#${number} ${name}`,
      })
    } catch (error) {
      console.error('Error saving room:', error)
      toast({ title: 'Eroare', description: 'Nu s-a putut salva camera', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editRoom ? 'Editeaza camera' : 'Adauga camera'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="roomNumber">Numar camera</Label>
              <Input
                id="roomNumber"
                type="number"
                value={number}
                onChange={(e) => setNumber(parseInt(e.target.value) || 1)}
                min={1}
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roomHeight">Inaltime (m)</Label>
              <Input
                id="roomHeight"
                type="number"
                step="0.01"
                value={interiorHeight}
                onChange={(e) => setInteriorHeight(parseFloat(e.target.value) || 2.70)}
                className="min-h-[44px]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="roomName">Nume camera</Label>
            <Select value={name} onValueChange={setName}>
              <SelectTrigger className="min-h-[44px]">
                <SelectValue placeholder="Selectati numele" />
              </SelectTrigger>
              <SelectContent>
                {ROOM_NAMES.map((rn) => (
                  <SelectItem key={rn} value={rn}>{rn}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Scop</Label>
            <RadioGroup value={purpose} onValueChange={setPurpose} className="flex gap-4">
              {ROOM_PURPOSES.map((rp) => (
                <div key={rp} className="flex items-center space-x-2">
                  <RadioGroupItem value={rp} id={`purpose-${rp}`} />
                  <Label htmlFor={`purpose-${rp}`} className="cursor-pointer">
                    {rp === 'Locuibila' ? 'Locuibila' : 'Auxiliara'}
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
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 min-h-[44px]"
          >
            {saving ? 'Se salveaza...' : 'Salveaza'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

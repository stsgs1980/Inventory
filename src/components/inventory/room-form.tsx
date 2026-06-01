'use client'

import { useReducer } from 'react'
import { ROOM_NAMES, ROOM_PURPOSES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

interface RoomFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  buildingId: string
  onSubmit: () => void
  editRoom?: { id: string; number: number; name: string; purpose: string; interiorHeight: number } | null
  nextRoomNumber?: number
  existingRoomCount?: number
}

interface FormState {
  number: number
  name: string
  purpose: string
  interiorHeight: number
  saving: boolean
}

type Action =
  | { type: 'setNumber'; value: number }
  | { type: 'setName'; value: string }
  | { type: 'setPurpose'; value: string }
  | { type: 'setHeight'; value: number }
  | { type: 'setSaving'; value: boolean }
  | { type: 'reset'; number: number; name: string; purpose: string; interiorHeight: number }

function reducer(state: FormState, action: Action): FormState {
  switch (action.type) {
    case 'setNumber': return { ...state, number: action.value }
    case 'setName': return { ...state, name: action.value }
    case 'setPurpose': return { ...state, purpose: action.value }
    case 'setHeight': return { ...state, interiorHeight: action.value }
    case 'setSaving': return { ...state, saving: action.value }
    case 'reset': return { saving: false, number: action.number, name: action.name, purpose: action.purpose, interiorHeight: action.interiorHeight }
  }
}

export function RoomForm({ open, onOpenChange, buildingId, onSubmit, editRoom, nextRoomNumber, existingRoomCount = 0 }: RoomFormProps) {
  const { toast } = useToast()
  const [state, dispatch] = useReducer(reducer, {
    number: editRoom?.number ?? nextRoomNumber ?? 1, name: editRoom?.name ?? 'Antreu',
    purpose: editRoom?.purpose ?? 'Auxiliara', interiorHeight: editRoom?.interiorHeight ?? 2.70, saving: false,
  })

  function handleOpenChange(isOpen: boolean) {
    if (isOpen) {
      dispatch({ type: 'reset', number: editRoom?.number ?? nextRoomNumber ?? 1,
        name: editRoom?.name ?? 'Antreu', purpose: editRoom?.purpose ?? 'Auxiliara',
        interiorHeight: editRoom?.interiorHeight ?? 2.70 })
    }
    onOpenChange(isOpen)
  }

  async function handleSubmit() {
    dispatch({ type: 'setSaving', value: true })
    try {
      if (editRoom) {
        await fetch(`/api/rooms/${editRoom.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ number: state.number, name: state.name, purpose: state.purpose, interiorHeight: state.interiorHeight }) })
      } else {
        await fetch('/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ buildingId, number: state.number, name: state.name, purpose: state.purpose, interiorHeight: state.interiorHeight, orderIndex: existingRoomCount }) })
      }
      onSubmit(); onOpenChange(false)
      toast({ title: editRoom ? 'Camera actualizata' : 'Camera adaugata', description: `#${state.number} ${state.name}` })
    } catch (error) {
      console.error('Error saving room:', error)
      toast({ title: 'Eroare', description: 'Nu s-a putut salva camera', variant: 'destructive' })
    } finally { dispatch({ type: 'setSaving', value: false }) }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{editRoom ? 'Editeaza camera' : 'Adauga camera'}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="roomNumber">Numar camera</Label>
              <Input id="roomNumber" type="number" value={state.number} onChange={(e) => dispatch({ type: 'setNumber', value: parseInt(e.target.value) || 1 })} min={1} className="min-h-[44px]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roomHeight">Inaltime (m)</Label>
              <Input id="roomHeight" type="number" step="0.01" value={state.interiorHeight} onChange={(e) => dispatch({ type: 'setHeight', value: parseFloat(e.target.value) || 2.70 })} className="min-h-[44px]" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="roomName">Nume camera</Label>
            <Select value={state.name} onValueChange={(v) => dispatch({ type: 'setName', value: v })}>
              <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Selectati numele" /></SelectTrigger>
              <SelectContent>{ROOM_NAMES.map((rn) => <SelectItem key={rn} value={rn}>{rn}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <Label>Scop</Label>
            <RadioGroup value={state.purpose} onValueChange={(v) => dispatch({ type: 'setPurpose', value: v })} className="flex gap-4">
              {ROOM_PURPOSES.map((rp) => (
                <div key={rp} className="flex items-center space-x-2">
                  <RadioGroupItem value={rp} id={`purpose-${rp}`} />
                  <Label htmlFor={`purpose-${rp}`} className="cursor-pointer">{rp === 'Locuibila' ? 'Locuibila' : 'Auxiliara'}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="min-h-[44px]">Anuleaza</Button>
          <Button onClick={handleSubmit} disabled={state.saving} className="bg-emerald-600 hover:bg-emerald-700 min-h-[44px]">
            {state.saving ? 'Se salveaza...' : 'Salveaza'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

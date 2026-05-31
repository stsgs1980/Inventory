'use client'

import { useReducer } from 'react'
import { WALL_TYPES, DEFAULT_THICKNESS_PORTANT, DEFAULT_THICKNESS_DESPARTITOR } from '@/lib/constants'
import { CompassSelector } from './compass-selector'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

interface WallFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roomId: string
  orderIndex: number
  onSubmit: () => void
  editWall?: { id: string; direction: string; length: number; thickness: number; wallType: string; orderIndex: number } | null
}

interface FormState {
  direction: string
  length: number
  thickness: number
  wallType: string
  saving: boolean
}

type Action =
  | { type: 'setDirection'; value: string }
  | { type: 'setLength'; value: number }
  | { type: 'setThickness'; value: number }
  | { type: 'setWallType'; value: string }
  | { type: 'setSaving'; value: boolean }
  | { type: 'reset'; direction: string; length: number; thickness: number; wallType: string }

function reducer(state: FormState, action: Action): FormState {
  switch (action.type) {
    case 'setDirection': return { ...state, direction: action.value }
    case 'setLength': return { ...state, length: action.value }
    case 'setThickness': return { ...state, thickness: action.value }
    case 'setWallType': {
      const thickness = action.value === 'portant' ? DEFAULT_THICKNESS_PORTANT : DEFAULT_THICKNESS_DESPARTITOR
      return { ...state, wallType: action.value, thickness }
    }
    case 'setSaving': return { ...state, saving: action.value }
    case 'reset': return { saving: false, direction: action.direction, length: action.length, thickness: action.thickness, wallType: action.wallType }
  }
}

export function WallForm({ open, onOpenChange, roomId, orderIndex, onSubmit, editWall }: WallFormProps) {
  const { toast } = useToast()
  const [state, dispatch] = useReducer(reducer, {
    direction: editWall?.direction ?? 'N', length: editWall?.length ?? 0,
    thickness: editWall?.thickness ?? DEFAULT_THICKNESS_PORTANT,
    wallType: editWall?.wallType ?? 'portant', saving: false,
  })

  function handleOpenChange(isOpen: boolean) {
    if (isOpen) {
      dispatch({ type: 'reset', direction: editWall?.direction ?? 'N', length: editWall?.length ?? 0,
        thickness: editWall?.thickness ?? DEFAULT_THICKNESS_PORTANT, wallType: editWall?.wallType ?? 'portant' })
    }
    onOpenChange(isOpen)
  }

  async function handleSubmit() {
    if (state.length <= 0 || state.thickness <= 0) return
    dispatch({ type: 'setSaving', value: true })
    try {
      if (editWall) {
        await fetch(`/api/walls/${editWall.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ direction: state.direction, length: state.length, thickness: state.thickness, wallType: state.wallType }) })
      } else {
        await fetch('/api/walls', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomId, direction: state.direction, length: state.length, thickness: state.thickness, wallType: state.wallType, orderIndex }) })
      }
      onSubmit(); onOpenChange(false)
      toast({ title: editWall ? 'Perete actualizat' : 'Perete adaugat', description: `${state.direction} ${state.length}m x ${state.thickness}mm (${state.wallType === 'portant' ? 'Portant' : 'Despartitor'})` })
    } catch (error) {
      console.error('Error saving wall:', error)
      toast({ title: 'Eroare', description: 'Nu s-a putut salva peretele', variant: 'destructive' })
    } finally { dispatch({ type: 'setSaving', value: false }) }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{editWall ? 'Editeaza perete' : 'Adauga perete'}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Directie</Label>
            <CompassSelector value={state.direction} onChange={(v) => dispatch({ type: 'setDirection', value: v })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wallLength">Lungime (m)</Label>
            <Input id="wallLength" type="number" step="0.01" value={state.length || ''} onChange={(e) => dispatch({ type: 'setLength', value: parseFloat(e.target.value) || 0 })} placeholder="3.50" min={0.01} className="min-h-[44px]" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wallThickness">Grosime (mm)</Label>
            <Input id="wallThickness" type="number" step="10" value={state.thickness || ''} onChange={(e) => dispatch({ type: 'setThickness', value: parseFloat(e.target.value) || 0 })} placeholder="400" min={1} className="min-h-[44px]" />
            <div className="flex gap-2">
              <button type="button" onClick={() => dispatch({ type: 'setThickness', value: DEFAULT_THICKNESS_PORTANT })} className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600">Portant: {DEFAULT_THICKNESS_PORTANT}mm</button>
              <button type="button" onClick={() => dispatch({ type: 'setThickness', value: DEFAULT_THICKNESS_DESPARTITOR })} className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600">Despartitor: {DEFAULT_THICKNESS_DESPARTITOR}mm</button>
            </div>
          </div>
          <div className="space-y-3">
            <Label>Tip perete</Label>
            <RadioGroup value={state.wallType} onValueChange={(v) => dispatch({ type: 'setWallType', value: v })} className="flex gap-4">
              {WALL_TYPES.map((wt) => (
                <div key={wt} className="flex items-center space-x-2">
                  <RadioGroupItem value={wt} id={`wallType-${wt}`} />
                  <Label htmlFor={`wallType-${wt}`} className="cursor-pointer capitalize">{wt === 'portant' ? 'Portant' : 'Despartitor'}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="min-h-[44px]">Anuleaza</Button>
          <Button onClick={handleSubmit} disabled={state.saving || state.length <= 0 || state.thickness <= 0} className="bg-emerald-600 hover:bg-emerald-700 min-h-[44px]">
            {state.saving ? 'Se salveaza...' : editWall ? 'Salveaza' : 'Adauga'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

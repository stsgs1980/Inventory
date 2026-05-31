import { create } from 'zustand'

interface InventoryStore {
  currentBuildingId: string | null
  currentRoomId: string | null
  currentStep: number // 1-5
  expandedRoomId: string | null

  // Actions
  setBuilding: (id: string | null) => void
  setRoom: (id: string | null) => void
  setStep: (step: number) => void
  setExpandedRoom: (id: string | null) => void
  reset: () => void
}

const initialState = {
  currentBuildingId: null as string | null,
  currentRoomId: null as string | null,
  currentStep: 1,
  expandedRoomId: null as string | null,
}

export const useInventoryStore = create<InventoryStore>((set) => ({
  ...initialState,

  setBuilding: (id) => set({ currentBuildingId: id }),
  setRoom: (id) => set({ currentRoomId: id }),
  setStep: (step) => set({ currentStep: step }),
  setExpandedRoom: (id) => set({ expandedRoomId: id }),
  reset: () => set(initialState),
}))

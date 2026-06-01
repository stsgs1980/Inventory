// Shared types for the inventory measurement application

export interface OpeningData {
  id: string
  openingType: string
  wallIndex: number
  offset: number
  width: number
  height: number
}

export interface WallData {
  id: string
  direction: string
  length: number
  thickness: number
  wallType: string
  orderIndex: number
  openings: OpeningData[]
}

export interface RoomData {
  id: string
  number: number
  name: string
  purpose: string
  interiorHeight: number
  walls: WallData[]
}

export interface BuildingData {
  id: string
  letter: string
  permitNumber: string
  permitDate: string
  floorType: string
  floorNumber: number
  interiorHeight: number
  exteriorHeight: number
  notes: string
  rooms: RoomData[]
}

export type EditorMode = 'view' | 'draw' | 'opening'

// Shared types for the inventory measurement application
// Phase 2: Coordinate-based wall model for CAD-like drawing

export interface OpeningData {
  id: string
  openingType: string
  // offset from wall start point (meters)
  offset: number
  width: number
  height: number
}

export interface WallData {
  id: string
  // Absolute world coordinates (meters) - primary for Canvas editor
  startX: number
  startY: number
  endX: number
  endY: number
  // Computed/legacy fields
  direction: string
  length: number
  // Wall properties
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

// Canvas editor tool types
export type EditorTool =
  | 'select'    // Select and move walls/openings
  | 'wall'      // Draw walls by clicking start/end points
  | 'opening'   // Place doors/windows on walls
  | 'dimension' // Add dimension annotations
  | 'room'      // Assign walls to rooms

// Legacy: kept for toolbar compatibility
export type EditorMode = 'view' | 'draw' | 'opening'

// Snap point types for the CAD editor
export interface SnapPoint {
  x: number
  y: number
  type: 'grid' | 'endpoint' | 'midpoint' | 'intersection' | 'perpendicular'
}

// Canvas viewport state
export interface ViewportState {
  zoom: number
  panX: number
  panY: number
}

// Undo/Redo command
export interface EditorCommand {
  type: 'add-wall' | 'delete-wall' | 'move-wall' | 'add-opening' | 'delete-opening'
  data: Record<string, unknown>
  timestamp: number
}

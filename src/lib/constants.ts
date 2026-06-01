// Constants for the Inventory DXF application
// Matches CADSoftTools Inventory conventions

// Layer names (matching Inventory convention)
export const LAYER_PORTANT = 'Portant'
export const LAYER_DESPARTITOR = 'Despartitor'
export const LAYER_INCAPERI = 'Incaperi'
export const LAYER_INCIZOLATE = 'IncIzolate'
export const LAYER_NIVEL = 'Nivel'
export const LAYER_GOL = 'Gol'
export const LAYER_DIMENSIUNI = 'Dimensiuni'
export const LAYER_TEXT = 'Text'
export const LAYER_ALTE = 'Alte'
export const LAYER_GREVARI = 'Grevari'

// Layer colors (AutoCAD color index)
export const COLOR_PORTANT = 1 // Red
export const COLOR_DESPARTITOR = 3 // Green
export const COLOR_INCAPERI = 150 // Cyan
export const COLOR_INCIZOLATE = 4 // Blue
export const COLOR_NIVEL = 202 // Purple
export const COLOR_GOL = 5 // Magenta
export const COLOR_DIMENSIUNI = 150 // Cyan
export const COLOR_TEXT = 7 // White
export const COLOR_ALTE = 100 // Green variant

// DXF version compatible with Inventory
export const DXF_VERSION = 'AC1021' // AutoCAD 2007

// Unit conversion
export const M_TO_MM = 1000.0

// Drawing parameters (millimeters)
export const TEXT_HEIGHT = 250.0
export const DIM_TEXT_HEIGHT = 180.0
export const DIM_OFFSET = 800.0

// Layer definitions for DXF
export const LAYER_DEFS: [string, number][] = [
  [LAYER_PORTANT, COLOR_PORTANT],
  [LAYER_DESPARTITOR, COLOR_DESPARTITOR],
  [LAYER_INCAPERI, COLOR_INCAPERI],
  [LAYER_INCIZOLATE, COLOR_INCIZOLATE],
  [LAYER_NIVEL, COLOR_NIVEL],
  [LAYER_GOL, COLOR_GOL],
  [LAYER_DIMENSIUNI, COLOR_DIMENSIUNI],
  [LAYER_TEXT, COLOR_TEXT],
  [LAYER_ALTE, COLOR_ALTE],
  [LAYER_GREVARI, 2],
]

// Enum values
export const WALL_TYPES = ['portant', 'despartitor'] as const
export const OPENING_TYPES = ['window', 'door'] as const
export const ROOM_PURPOSES = ['Locuibila', 'Auxiliara'] as const
export const FLOOR_TYPES = ['Parter', 'Etaj 1', 'Etaj 2', 'Etaj 3', 'Mansarda', 'Subsol'] as const

// Room names (Romanian)
export const ROOM_NAMES = [
  'Antreu', 'Cazangerie', 'Bucatarie', 'Sufragerie', 'Terasa',
  'Coridor', 'Garderoba', 'Dormitor', 'Grup sanitar', 'Cabinet',
  'Balcon', 'Depozit', 'Camera tehnica', 'Alta incapere',
] as const

// Default wall thickness by type (mm)
export const DEFAULT_THICKNESS_PORTANT = 400
export const DEFAULT_THICKNESS_DESPARTITOR = 130

// Room spacing in DXF (mm)
export const ROOM_SPACING_MM = 500

// Canvas editor constants (all in meters unless noted)
export const GRID_MINOR_M = 0.1       // 10cm minor grid
export const GRID_MAJOR_M = 1.0       // 1m major grid
export const SNAP_THRESHOLD_PX = 12   // Pixel distance for snap detection
export const WALL_SELECT_THRESHOLD_M = 0.3  // How close to click a wall
export const MIN_WALL_LENGTH_M = 0.05 // Minimum wall length
export const DEFAULT_ZOOM = 4.0       // Default zoom (pixels per mm at 1x)
export const MIN_ZOOM = 0.3
export const MAX_ZOOM = 20.0
export const ZOOM_FACTOR = 1.15       // Mouse wheel zoom multiplier

// Canvas rendering colors
export const CANVAS_COLORS = {
  gridMinor: '#f0f0f0',
  gridMajor: '#d4d4d8',
  gridOrigin: '#94a3b8',
  wallPortant: '#ef4444',
  wallDespartitor: '#22c55e',
  wallPreview: '#f97316',
  roomFill: '#f0fdf4',
  roomStroke: '#059669',
  roomSelected: '#dcfce7',
  openingDoor: '#d946ef',
  openingWindow: '#d946ef',
  dimensionLine: '#0891b2',
  dimensionText: '#0e7490',
  snapPoint: '#059669',
  snapIndicator: '#fbbf24',
  selectionBox: '#3b82f6',
  crosshair: '#6b7280',
} as const

// Step labels (Romanian)
export const STEP_LABELS = ['Cladire', 'Incaperi', 'Pereti', 'Plan', 'Export'] as const

// Compass direction labels for the 3x3 grid (legacy)
export const COMPASS_GRID = [
  ['NW', 'N', 'NE'],
  ['W', '', 'E'],
  ['SW', 'S', 'SE'],
] as const

// Direction vectors (legacy, for backward compat)
export const DIR_VECTORS: Record<string, [number, number]> = {
  N: [0.0, 1.0], S: [0.0, -1.0],
  E: [1.0, 0.0], W: [-1.0, 0.0],
  NE: [0.7071, 0.7071], NW: [-0.7071, 0.7071],
  SE: [0.7071, -0.7071], SW: [-0.7071, -0.7071],
}

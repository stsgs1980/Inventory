// Standard opening dimension presets

export interface OpeningPreset {
  width: number
  height: number
  label: string
}

export const DOOR_PRESETS: OpeningPreset[] = [
  { width: 0.7, height: 2.05, label: '0.70x2.05' },
  { width: 0.8, height: 2.05, label: '0.80x2.05' },
  { width: 0.9, height: 2.10, label: '0.90x2.10' },
  { width: 1.0, height: 2.10, label: '1.00x2.10' },
]

export const WINDOW_PRESETS: OpeningPreset[] = [
  { width: 0.60, height: 1.20, label: '0.60x1.20' },
  { width: 0.90, height: 1.20, label: '0.90x1.20' },
  { width: 1.00, height: 1.40, label: '1.00x1.40' },
  { width: 1.20, height: 1.50, label: '1.20x1.50' },
  { width: 1.50, height: 1.50, label: '1.50x1.50' },
]

/** Default dimensions by opening type */
export const DEFAULT_OPENING_DIMS = {
  door:   { width: 0.9,  height: 2.1 },
  window: { width: 1.2,  height: 1.5 },
} as const

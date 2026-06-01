// API calls for Canvas editor - wall and opening creation
// Separated from hook for anti-monolith compliance

import type { Point } from './geometry'
import { dist } from './geometry'

/** Create a wall via API */
export async function createWallAPI(params: {
  startX: number; startY: number; endX: number; endY: number
  wallType: string; thickness: number; roomId: string
}): Promise<boolean> {
  const len = dist([params.startX, params.startY], [params.endX, params.endY])
  const dir = getDirection([params.startX, params.startY], [params.endX, params.endY])
  try {
    const res = await fetch('/api/walls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: params.roomId,
        startX: params.startX, startY: params.startY,
        endX: params.endX, endY: params.endY,
        direction: dir,
        length: parseFloat(len.toFixed(3)),
        thickness: params.thickness,
        wallType: params.wallType,
        orderIndex: 0,
      }),
    })
    return res.ok
  } catch (err) {
    console.error('Error creating wall:', err)
    return false
  }
}

/** Create an opening via API */
export async function createOpeningAPI(params: {
  wallId: string; offset: number; width: number; height: number; openingType: string
}): Promise<boolean> {
  try {
    const res = await fetch('/api/openings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    return res.ok
  } catch (err) {
    console.error('Error creating opening:', err)
    return false
  }
}

/** Delete a wall via API */
export async function deleteWallAPI(wallId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/walls/${wallId}`, { method: 'DELETE' })
    return res.ok
  } catch (err) {
    console.error('Error deleting wall:', err)
    return false
  }
}

function getDirection(start: Point, end: Point): string {
  const angle = Math.atan2(end[1] - start[1], end[0] - start[0]) * (180 / Math.PI)
  const dirs = ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE']
  let idx = Math.round(angle / 45)
  if (idx < 0) idx += 8
  return dirs[idx % 8]
}

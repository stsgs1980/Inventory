// DXF generation orchestrator - coordinate-based walls
// Transforms building data into a complete DXF file

import { DXFWriter } from './writer'
import { Point, mToMM, buildRoomPolygon, calculateArea, polygonCenter, formatDecimal } from './utils'
import {
  drawWall, drawRoomOutline, drawRoomLabel,
  drawDimension, drawOpening, drawLevelLabels, drawBuildingInfo,
} from './entities'
import { M_TO_MM } from '../constants'

interface WallInput {
  startX: number; startY: number; endX: number; endY: number
  direction: string; length: number
  thickness: number; wallType: string
  openings: { openingType: string; offset: number; width: number; height: number }[]
}

interface RoomInput {
  number: number; name: string; purpose: string; interiorHeight: number
  walls: WallInput[]
}

interface BuildingInput {
  letter: string; permitNumber: string; permitDate: string
  floorType: string; floorNumber: number
  interiorHeight: number; exteriorHeight: number
  rooms: RoomInput[]
}

/** Generate complete DXF for a building using coordinate-based walls */
export function generateBuildingDXF(building: BuildingInput): string {
  const dxf = new DXFWriter()

  // Collect all room positions for layout calculations
  const roomBounds = computeAllRoomBounds(building.rooms)
  const roomPositions = layoutRooms(roomBounds)

  // Draw each room
  for (let idx = 0; idx < building.rooms.length; idx++) {
    const room = building.rooms[idx]
    const [offsetX, offsetY] = roomPositions[idx]

    // Build polygon from wall coordinates, applying room offset
    const polygonM = buildRoomPolygon(room.walls)
    if (polygonM.length < 2) continue

    // Convert to mm and apply offset
    const polygonMm: Point[] = polygonM.map(p => [
      offsetX + p[0] * M_TO_MM,
      offsetY + p[1] * M_TO_MM,
    ])

    // Draw walls with coordinate-based rendering
    for (const wall of room.walls) {
      const start: Point = [offsetX + wall.startX * M_TO_MM, offsetY + wall.startY * M_TO_MM]
      const end: Point = [offsetX + wall.endX * M_TO_MM, offsetY + wall.endY * M_TO_MM]
      drawWall(dxf, start, end, wall.thickness, wall.wallType)
    }

    // Room outline and label
    drawRoomOutline(dxf, polygonMm, room.walls)
    const area = calculateArea(room.walls)
    drawRoomLabel(dxf, polygonMm, room.number, area)

    // Dimensions for each wall
    for (const wall of room.walls) {
      const start: Point = [offsetX + wall.startX * M_TO_MM, offsetY + wall.startY * M_TO_MM]
      const end: Point = [offsetX + wall.endX * M_TO_MM, offsetY + wall.endY * M_TO_MM]
      const len = Math.sqrt((wall.endX - wall.startX) ** 2 + (wall.endY - wall.startY) ** 2)
      drawDimension(dxf, start, end, len)
    }

    // Openings
    for (const wall of room.walls) {
      if (wall.openings.length === 0) continue
      const wallStart: Point = [offsetX + wall.startX * M_TO_MM, offsetY + wall.startY * M_TO_MM]
      const wallEnd: Point = [offsetX + wall.endX * M_TO_MM, offsetY + wall.endY * M_TO_MM]
      for (const opening of wall.openings) {
        drawOpening(dxf, wallStart, wallEnd, opening, wall.thickness)
      }
    }
  }

  // Building-level annotations
  drawLevelLabels(dxf, building.floorType, building.floorNumber, building.interiorHeight, roomPositions)
  drawBuildingInfo(dxf, building.letter, building.interiorHeight, building.exteriorHeight, building.permitNumber, building.permitDate, roomPositions)

  return dxf.generate()
}

/** Compute bounding box for each room from wall coordinates */
function computeAllRoomBounds(rooms: RoomInput[]): { minX: number; minY: number; maxX: number; maxY: number }[] {
  return rooms.map(room => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const w of room.walls) {
      minX = Math.min(minX, w.startX, w.endX)
      minY = Math.min(minY, w.startY, w.endY)
      maxX = Math.max(maxX, w.startX, w.endX)
      maxY = Math.max(maxY, w.startY, w.endY)
    }
    if (minX === Infinity) { minX = 0; minY = 0; maxX = 3; maxY = 3 }
    return { minX, minY, maxX, maxY }
  })
}

/** Layout rooms side by side with spacing */
function layoutRooms(bounds: { minX: number; minY: number; maxX: number; maxY: number }[]): Point[] {
  const positions: Point[] = []
  let currentX = 0
  const spacing = 500 // mm

  for (const b of bounds) {
    const widthM = b.maxX - b.minX
    const heightM = b.maxY - b.minY
    // Normalize room to start at its minX/minY offset
    const offsetX = currentX - b.minX * M_TO_MM
    const offsetY = -b.minY * M_TO_MM
    positions.push([offsetX, offsetY])

    const extentMm = Math.max(widthM, heightM) * M_TO_MM
    currentX += extentMm + spacing
  }

  return positions
}

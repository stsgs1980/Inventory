// DXF entity drawing functions
// Ported from Python inventory-bot/services/dxf/

import { DXFWriter } from './writer'
import { Point, mToMM, buildRoomPolygon, offsetPolygon, avgWallThickness, polygonCenter, formatDecimal } from './utils'
import {
  LAYER_PORTANT,
  LAYER_DESPARTITOR,
  LAYER_INCAPERI,
  LAYER_GOL,
  LAYER_DIMENSIUNI,
  LAYER_NIVEL,
  LAYER_TEXT,
  M_TO_MM,
  TEXT_HEIGHT,
  DIM_TEXT_HEIGHT,
  DIM_OFFSET,
  ROOM_SPACING_MM,
} from '../constants'

// Draw a wall as two parallel lines with end caps
export function drawWall(
  dxf: DXFWriter,
  start: Point,
  end: Point,
  thicknessMm: number,
  wallType: string
): void {
  const layer = wallType === 'portant' ? LAYER_PORTANT : LAYER_DESPARTITOR

  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  const length = Math.sqrt(dx * dx + dy * dy)

  if (length < 0.01) return

  const nx = -dy / length
  const ny = dx / length
  const half = thicknessMm / 2.0

  const x1s = start[0] + nx * half
  const y1s = start[1] + ny * half
  const x1e = end[0] + nx * half
  const y1e = end[1] + ny * half

  const x2s = start[0] - nx * half
  const y2s = start[1] - ny * half
  const x2e = end[0] - nx * half
  const y2e = end[1] - ny * half

  dxf.addLine(x1s, y1s, x1e, y1e, layer)
  dxf.addLine(x2s, y2s, x2e, y2e, layer)
  dxf.addLine(x1s, y1s, x2s, y2s, layer)
  dxf.addLine(x1e, y1e, x2e, y2e, layer)
}

// Draw room outline as a closed LWPOLYLINE on Incaperi layer
export function drawRoomOutline(
  dxf: DXFWriter,
  polygonMm: Point[],
  walls: { thickness: number }[]
): void {
  if (polygonMm.length < 3) return

  const avgThickness = avgWallThickness(walls) / 2.0
  const innerPoints = offsetPolygon(polygonMm, -avgThickness)

  dxf.addLWPolyline([...innerPoints, innerPoints[0]], LAYER_INCAPERI, false)
}

// Draw room label (room number above center, area below center)
export function drawRoomLabel(
  dxf: DXFWriter,
  polygonMm: Point[],
  roomNumber: number,
  area: number
): void {
  const [cx, cy] = polygonCenter(polygonMm)

  dxf.addText(cx, cy + TEXT_HEIGHT * 1.5, TEXT_HEIGHT, roomNumber.toString(), LAYER_INCAPERI)

  const areaStr = formatDecimal(area, 1)
  dxf.addText(cx, cy - TEXT_HEIGHT * 1.5, TEXT_HEIGHT * 0.8, areaStr, LAYER_INCAPERI)
}

// Draw a dimension text label positioned above the wall
export function drawDimension(
  dxf: DXFWriter,
  start: Point,
  end: Point,
  lengthM: number
): void {
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  const wallLength = Math.sqrt(dx * dx + dy * dy)

  if (wallLength < 1.0) return

  const nx = -dy / wallLength
  const ny = dx / wallLength

  const dimStartX = start[0] + nx * DIM_OFFSET
  const dimStartY = start[1] + ny * DIM_OFFSET
  const dimEndX = end[0] + nx * DIM_OFFSET
  const dimEndY = end[1] + ny * DIM_OFFSET

  const lengthStr = formatDecimal(lengthM, 2)
  const midX = (dimStartX + dimEndX) / 2
  const midY = (dimStartY + dimEndY) / 2

  dxf.addText(midX, midY, DIM_TEXT_HEIGHT, lengthStr, LAYER_DIMENSIUNI)
}

// Draw a door or window opening on the Gol layer
export function drawOpening(
  dxf: DXFWriter,
  wallStart: Point,
  wallEnd: Point,
  opening: { openingType: string; offset: number; width: number },
  wallThickness: number
): void {
  const dx = wallEnd[0] - wallStart[0]
  const dy = wallEnd[1] - wallStart[1]
  const wallLengthMm = Math.sqrt(dx * dx + dy * dy)

  if (wallLengthMm < 1.0) return

  const ux = dx / wallLengthMm
  const uy = dy / wallLengthMm
  const nx = -uy
  const ny = ux

  const halfThickness = wallThickness / 2.0
  const offsetMm = opening.offset * M_TO_MM
  const widthMm = opening.width * M_TO_MM

  const opSx = wallStart[0] + ux * offsetMm
  const opSy = wallStart[1] + uy * offsetMm
  const opEx = wallStart[0] + ux * (offsetMm + widthMm)
  const opEy = wallStart[1] + uy * (offsetMm + widthMm)

  if (opening.openingType === 'door') {
    // Door: arc + base line
    const angle = Math.atan2(wallEnd[1] - wallStart[1], wallEnd[0] - wallStart[0])
    const startAngleDeg = (angle * 180) / Math.PI
    const endAngleDeg = startAngleDeg + 90

    dxf.addArc(opSx, opSy, widthMm, startAngleDeg, endAngleDeg, LAYER_GOL)
    dxf.addLine(opSx, opSy, opEx, opSy, LAYER_GOL)
  } else {
    // Window: two parallel lines across the wall opening
    for (const t of [-halfThickness * 0.3, halfThickness * 0.3]) {
      dxf.addLine(
        opSx + nx * t, opSy + ny * t,
        opEx + nx * t, opEy + ny * t,
        LAYER_GOL
      )
    }
  }
}

// Draw floor level label text
export function drawLevelLabels(
  dxf: DXFWriter,
  floorType: string,
  floorNumber: number,
  interiorHeight: number,
  roomPositions: Point[]
): void {
  if (roomPositions.length === 0) return

  const maxY = Math.max(...roomPositions.map(p => p[1]))
  const labelX = roomPositions[0][0]
  const labelY = maxY + interiorHeight * M_TO_MM + 2000

  const floorLabel = `Nivelul:${floorNumber} ${floorType}`
  dxf.addText(labelX, labelY, TEXT_HEIGHT * 1.2, floorLabel, LAYER_NIVEL)
}

// Draw building identification and metadata text
export function drawBuildingInfo(
  dxf: DXFWriter,
  letter: string,
  interiorHeight: number,
  exteriorHeight: number,
  permitNumber: string,
  permitDate: string,
  roomPositions: Point[]
): void {
  if (roomPositions.length === 0) return

  const maxX = Math.max(...roomPositions.map(p => p[0])) + M_TO_MM
  const maxY = Math.max(...roomPositions.map(p => p[1])) + M_TO_MM * 3

  const infoLines: string[] = []

  if (letter) {
    infoLines.push(`SCHITA CLADIRII LIT. "${letter}"`)
  }

  infoLines.push(`h=${formatDecimal(interiorHeight, 2)}`)
  infoLines.push(`H=${formatDecimal(exteriorHeight, 2)}`)

  if (permitNumber) {
    let permitInfo = `In conformitate cu Autorizatia de construire Nr.${permitNumber}`
    if (permitDate) {
      permitInfo += ` din ${permitDate}`
    }
    infoLines.push(permitInfo)
  }

  for (let i = 0; i < infoLines.length; i++) {
    dxf.addText(maxX, maxY - i * TEXT_HEIGHT * 2, TEXT_HEIGHT, infoLines[i], LAYER_TEXT)
  }

  if (letter) {
    dxf.addText(maxX, maxY + TEXT_HEIGHT * 2, TEXT_HEIGHT * 1.5, `${letter.toUpperCase()}-04`, LAYER_TEXT)
  }
}

// Generate complete DXF for a building
export function generateBuildingDXF(building: {
  letter: string
  permitNumber: string
  permitDate: string
  floorType: string
  floorNumber: number
  interiorHeight: number
  exteriorHeight: number
  rooms: {
    number: number
    name: string
    purpose: string
    interiorHeight: number
    walls: {
      direction: string
      length: number
      thickness: number
      wallType: string
      openings: {
        openingType: string
        wallIndex: number
        offset: number
        width: number
        height: number
      }[]
    }[]
  }[]
}): string {
  const dxf = new DXFWriter()

  // Calculate room positions (left to right with spacing)
  const roomPositions: Point[] = []
  let currentX = 0.0
  const spacing = ROOM_SPACING_MM

  for (const room of building.rooms) {
    const polygonM = buildRoomPolygon(room.walls)
    let width = 3000 // default 3m
    if (polygonM.length > 0) {
      const xs = polygonM.map(p => p[0])
      width = Math.max((Math.max(...xs) - Math.min(...xs)) * M_TO_MM, 1000)
    }
    roomPositions.push([currentX, 0.0])
    currentX += width + spacing
  }

  // Draw each room
  for (let idx = 0; idx < building.rooms.length; idx++) {
    const room = building.rooms[idx]
    const [originX, originY] = roomPositions[idx]

    const polygonM = buildRoomPolygon(room.walls)
    if (polygonM.length === 0) continue

    // Convert to mm and apply origin offset
    const polygonMm: Point[] = polygonM.map(p => [
      originX + p[0] * M_TO_MM,
      originY + p[1] * M_TO_MM,
    ])

    // Draw walls
    for (let i = 0; i < room.walls.length; i++) {
      const start = polygonMm[i]
      const end = polygonMm[i + 1] || polygonMm[0]
      drawWall(dxf, start, end, room.walls[i].thickness, room.walls[i].wallType)
    }

    // Draw room outline
    drawRoomOutline(dxf, polygonMm, room.walls)

    // Draw room label
    const area = calculateAreaFromWalls(room.walls)
    drawRoomLabel(dxf, polygonMm, room.number, area)

    // Draw dimensions
    for (let i = 0; i < room.walls.length; i++) {
      const start = polygonMm[i]
      const end = polygonMm[i + 1] || polygonMm[0]
      drawDimension(dxf, start, end, room.walls[i].length)
    }

    // Draw openings
    for (const wall of room.walls) {
      for (const opening of wall.openings) {
        if (opening.wallIndex < room.walls.length) {
          const start = polygonMm[opening.wallIndex]
          const end = polygonMm[opening.wallIndex + 1] || polygonMm[0]
          drawOpening(dxf, start, end, opening, room.walls[opening.wallIndex].thickness)
        }
      }
    }
  }

  // Draw level labels
  drawLevelLabels(
    dxf,
    building.floorType,
    building.floorNumber,
    building.interiorHeight,
    roomPositions
  )

  // Draw building info
  drawBuildingInfo(
    dxf,
    building.letter,
    building.interiorHeight,
    building.exteriorHeight,
    building.permitNumber,
    building.permitDate,
    roomPositions
  )

  return dxf.generate()
}

// Helper to calculate area from walls
function calculateAreaFromWalls(walls: { direction: string; length: number }[]): number {
  if (!walls || walls.length === 0) return 0.0
  const points = buildRoomPolygon(walls)
  const n = points.length
  let area = 0.0
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += points[i][0] * points[j][1]
    area -= points[j][0] * points[i][1]
  }
  return Math.abs(area) / 2.0
}

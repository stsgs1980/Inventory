// DXF entity drawing functions - coordinate-based walls
// Phase 2: walls use absolute coordinates (startX,startY,endX,endY)

import { DXFWriter } from './writer'
import { Point, mToMM, buildRoomPolygon, offsetPolygon, avgWallThickness, polygonCenter, formatDecimal } from './utils'
import {
  LAYER_PORTANT, LAYER_DESPARTITOR, LAYER_INCAPERI, LAYER_GOL,
  LAYER_DIMENSIUNI, LAYER_NIVEL, LAYER_TEXT, M_TO_MM,
  TEXT_HEIGHT, DIM_TEXT_HEIGHT, DIM_OFFSET,
} from '../constants'

/** Draw a wall as two parallel lines with end caps */
export function drawWall(
  dxf: DXFWriter,
  start: Point, end: Point,
  thicknessMm: number, wallType: string
): void {
  const layer = wallType === 'portant' ? LAYER_PORTANT : LAYER_DESPARTITOR
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  const length = Math.sqrt(dx * dx + dy * dy)
  if (length < 0.01) return

  const nx = -dy / length
  const ny = dx / length
  const half = thicknessMm / 2.0

  // XDATA for CSTINVENTORY
  const xdata = {
    'EntityType': 'Wall',
    'WallType': wallType,
    'Thickness': thicknessMm / M_TO_MM, // store in meters
  }

  // Two parallel lines + end caps with XDATA
  dxf.addLineWithXDATA(
    start[0] + nx * half, start[1] + ny * half,
    end[0] + nx * half, end[1] + ny * half,
    layer, xdata
  )
  dxf.addLine(start[0] - nx * half, start[1] - ny * half,
    end[0] - nx * half, end[1] - ny * half, layer)
  dxf.addLine(start[0] + nx * half, start[1] + ny * half,
    start[0] - nx * half, start[1] - ny * half, layer)
  dxf.addLine(end[0] + nx * half, end[1] + ny * half,
    end[0] - nx * half, end[1] - ny * half, layer)
}

/** Draw room outline as closed LWPOLYLINE on Incaperi layer */
export function drawRoomOutline(
  dxf: DXFWriter,
  polygonMm: Point[],
  walls: { thickness: number }[]
): void {
  if (polygonMm.length < 3) return
  const avgThick = avgWallThickness(walls) / 2.0
  const inner = offsetPolygon(polygonMm, -avgThick)
  dxf.addLWPolylineWithXDATA(
    [...inner, inner[0]], LAYER_INCAPERI, false,
    { 'EntityType': 'Room', 'VertexCount': inner.length }
  )
}

/** Draw room label (number + area) */
export function drawRoomLabel(
  dxf: DXFWriter,
  polygonMm: Point[],
  roomNumber: number,
  area: number
): void {
  const [cx, cy] = polygonCenter(polygonMm)
  dxf.addText(cx, cy + TEXT_HEIGHT * 1.5, TEXT_HEIGHT, roomNumber.toString(), LAYER_INCAPERI)
  dxf.addText(cx, cy - TEXT_HEIGHT * 1.5, TEXT_HEIGHT * 0.8, formatDecimal(area, 1), LAYER_INCAPERI)
}

/** Draw dimension text label above a wall */
export function drawDimension(
  dxf: DXFWriter,
  start: Point, end: Point,
  lengthM: number
): void {
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  const wallLen = Math.sqrt(dx * dx + dy * dy)
  if (wallLen < 1.0) return

  const nx = -dy / wallLen
  const ny = dx / wallLen
  const dsX = start[0] + nx * DIM_OFFSET
  const dsY = start[1] + ny * DIM_OFFSET
  const deX = end[0] + nx * DIM_OFFSET
  const deY = end[1] + ny * DIM_OFFSET

  // Dimension lines
  dxf.addLine(dsX, dsY, deX, deY, LAYER_DIMENSIUNI)
  // Extension lines
  dxf.addLine(start[0], start[1], dsX, dsY, LAYER_DIMENSIUNI)
  dxf.addLine(end[0], end[1], deX, deY, LAYER_DIMENSIUNI)

  const midX = (dsX + deX) / 2
  const midY = (dsY + deY) / 2
  dxf.addText(midX, midY, DIM_TEXT_HEIGHT, formatDecimal(lengthM, 2), LAYER_DIMENSIUNI)
}

/** Draw door or window opening on the Gol layer */
export function drawOpening(
  dxf: DXFWriter,
  wallStart: Point, wallEnd: Point,
  opening: { openingType: string; offset: number; width: number },
  wallThickness: number
): void {
  const dx = wallEnd[0] - wallStart[0]
  const dy = wallEnd[1] - wallStart[1]
  const wallLenMm = Math.sqrt(dx * dx + dy * dy)
  if (wallLenMm < 1.0) return

  const ux = dx / wallLenMm, uy = dy / wallLenMm
  const nx = -uy, ny = ux
  const offsetMm = opening.offset * M_TO_MM
  const widthMm = opening.width * M_TO_MM

  const opSx = wallStart[0] + ux * offsetMm
  const opSy = wallStart[1] + uy * offsetMm
  const opEx = wallStart[0] + ux * (offsetMm + widthMm)
  const opEy = wallStart[1] + uy * (offsetMm + widthMm)

  if (opening.openingType === 'door') {
    const angle = Math.atan2(dy, dx)
    const startDeg = (angle * 180) / Math.PI
    const endDeg = startDeg + 90
    dxf.addArc(opSx, opSy, widthMm, startDeg, endDeg, LAYER_GOL)
    dxf.addLineWithXDATA(opSx, opSy, opEx, opEy, LAYER_GOL,
      { 'EntityType': 'Door', 'Width': opening.width, 'Height': 2.1 })
  } else {
    const halfThick = wallThickness / 2.0
    for (const t of [-halfThick * 0.3, halfThick * 0.3]) {
      dxf.addLineWithXDATA(
        opSx + nx * t, opSy + ny * t,
        opEx + nx * t, opEy + ny * t,
        LAYER_GOL,
        { 'EntityType': 'Window', 'Width': opening.width, 'Height': 1.5 }
      )
    }
  }
}

/** Draw floor level label */
export function drawLevelLabels(
  dxf: DXFWriter,
  floorType: string, floorNumber: number,
  interiorHeight: number,
  roomPositions: Point[]
): void {
  if (roomPositions.length === 0) return
  const maxY = Math.max(...roomPositions.map(p => p[1]))
  const labelX = roomPositions[0][0]
  const labelY = maxY + interiorHeight * M_TO_MM + 2000
  dxf.addText(labelX, labelY, TEXT_HEIGHT * 1.2, `Nivelul:${floorNumber} ${floorType}`, LAYER_NIVEL)
}

/** Draw building identification text */
export function drawBuildingInfo(
  dxf: DXFWriter,
  letter: string, interiorHeight: number, exteriorHeight: number,
  permitNumber: string, permitDate: string,
  roomPositions: Point[]
): void {
  if (roomPositions.length === 0) return
  const maxX = Math.max(...roomPositions.map(p => p[0])) + M_TO_MM
  const maxY = Math.max(...roomPositions.map(p => p[1])) + M_TO_MM * 3
  const lines: string[] = []
  if (letter) lines.push(`SCHITA CLADIRII LIT. "${letter}"`)
  lines.push(`h=${formatDecimal(interiorHeight, 2)}`)
  lines.push(`H=${formatDecimal(exteriorHeight, 2)}`)
  if (permitNumber) {
    let info = `In conformitate cu Autorizatia de construire Nr.${permitNumber}`
    if (permitDate) info += ` din ${permitDate}`
    lines.push(info)
  }
  for (let i = 0; i < lines.length; i++) {
    dxf.addText(maxX, maxY - i * TEXT_HEIGHT * 2, TEXT_HEIGHT, lines[i], LAYER_TEXT)
  }
  if (letter) {
    dxf.addText(maxX, maxY + TEXT_HEIGHT * 2, TEXT_HEIGHT * 1.5, `${letter.toUpperCase()}-04`, LAYER_TEXT)
  }
}

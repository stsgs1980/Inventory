// DXF string builder with CSTINVENTORY XDATA support
// Generates DXF files compatible with CADSoftTools Inventory format
// DXF version AC1021 (AutoCAD 2007)

import { DXF_VERSION } from '../constants'
import { generateTablesSection } from './dxf-tables'

export class DXFWriter {
  private entities: string[] = []
  private handleCounter: number = 0x40

  private nextHandle(): string {
    this.handleCounter++
    return this.handleCounter.toString(16).toUpperCase()
  }

  /** Add a LINE entity */
  addLine(
    startX: number, startY: number,
    endX: number, endY: number,
    layer: string
  ): void {
    const h = this.nextHandle()
    this.entities.push([
      '  0', 'LINE', '  5', h, '330', '17',
      '100', 'AcDbEntity', '  8', layer,
      '100', 'AcDbLine',
      ' 10', startX.toFixed(6), ' 20', startY.toFixed(6), ' 30', '0.0',
      ' 11', endX.toFixed(6), ' 21', endY.toFixed(6), ' 31', '0.0',
    ].join('\n'))
  }

  /** Add a LINE entity with CSTINVENTORY XDATA */
  addLineWithXDATA(
    startX: number, startY: number,
    endX: number, endY: number,
    layer: string,
    xdata: Record<string, string | number>
  ): void {
    const h = this.nextHandle()
    const xdataStr = buildXDATA(xdata)
    this.entities.push([
      '  0', 'LINE', '  5', h, '330', '17',
      '100', 'AcDbEntity', '  8', layer,
      '100', 'AcDbLine',
      ' 10', startX.toFixed(6), ' 20', startY.toFixed(6), ' 30', '0.0',
      ' 11', endX.toFixed(6), ' 21', endY.toFixed(6), ' 31', '0.0',
      xdataStr,
    ].join('\n'))
  }

  /** Add a TEXT entity */
  addText(
    x: number, y: number,
    height: number, text: string,
    layer: string
  ): void {
    const h = this.nextHandle()
    this.entities.push([
      '  0', 'TEXT', '  5', h, '330', '17',
      '100', 'AcDbEntity', '  8', layer,
      '100', 'AcDbText',
      ' 10', x.toFixed(6), ' 20', y.toFixed(6), ' 30', '0.0',
      ' 40', height.toFixed(6), '  1', text,
      '100', 'AcDbText',
    ].join('\n'))
  }

  /** Add a LWPOLYLINE entity */
  addLWPolyline(
    points: [number, number][],
    layer: string,
    closed: boolean = false
  ): void {
    const h = this.nextHandle()
    const flag = closed ? '1' : '0'
    const vertexData: string[] = []
    for (const [x, y] of points) {
      vertexData.push(' 10', x.toFixed(6), ' 20', y.toFixed(6))
    }
    this.entities.push([
      '  0', 'LWPOLYLINE', '  5', h, '330', '17',
      '100', 'AcDbEntity', '  8', layer,
      '100', 'AcDbPolyline',
      ' 90', points.length.toString(), ' 70', flag,
      ...vertexData,
    ].join('\n'))
  }

  /** Add LWPOLYLINE with CSTINVENTORY XDATA */
  addLWPolylineWithXDATA(
    points: [number, number][],
    layer: string,
    closed: boolean,
    xdata: Record<string, string | number>
  ): void {
    const h = this.nextHandle()
    const flag = closed ? '1' : '0'
    const vertexData: string[] = []
    for (const [x, y] of points) {
      vertexData.push(' 10', x.toFixed(6), ' 20', y.toFixed(6))
    }
    const xdataStr = buildXDATA(xdata)
    this.entities.push([
      '  0', 'LWPOLYLINE', '  5', h, '330', '17',
      '100', 'AcDbEntity', '  8', layer,
      '100', 'AcDbPolyline',
      ' 90', points.length.toString(), ' 70', flag,
      ...vertexData,
      xdataStr,
    ].join('\n'))
  }

  /** Add an ARC entity */
  addArc(
    centerX: number, centerY: number,
    radius: number,
    startAngle: number, endAngle: number,
    layer: string
  ): void {
    const h = this.nextHandle()
    this.entities.push([
      '  0', 'ARC', '  5', h, '330', '17',
      '100', 'AcDbEntity', '  8', layer,
      '100', 'AcDbCircle',
      ' 10', centerX.toFixed(6), ' 20', centerY.toFixed(6), ' 30', '0.0',
      ' 40', radius.toFixed(6),
      '100', 'AcDbArc',
      ' 50', startAngle.toFixed(6), ' 51', endAngle.toFixed(6),
    ].join('\n'))
  }

  /** Generate the complete DXF file */
  generate(): string {
    return [
      this.generateHeader(),
      generateTablesSection(),
      this.generateBlocks(),
      this.generateEntities(),
      '  0', 'EOF',
    ].join('\n')
  }

  private generateHeader(): string {
    return [
      '  0', 'SECTION', '  2', 'HEADER',
      '  9', '$ACADVER', '  1', DXF_VERSION,
      '  9', '$INSUNITS', ' 70', '6',
      '  0', 'ENDSEC',
    ].join('\n')
  }

  private generateBlocks(): string {
    return [
      '  0', 'SECTION', '  2', 'BLOCKS',
      '  0', 'BLOCK', '  5', '18', '330', '17',
      '100', 'AcDbEntity', '  8', '0', '100', 'AcDbBlockBegin',
      '  2', '*Model_Space', ' 70', '0',
      ' 10', '0.0', ' 20', '0.0', ' 30', '0.0',
      '  3', '*Model_Space', '  1', '',
      '  0', 'ENDBLK', '  5', '19', '330', '17',
      '100', 'AcDbEntity', '  8', '0', '100', 'AcDbBlockEnd',
      '  0', 'BLOCK', '  5', '1C', '330', '1B',
      '100', 'AcDbEntity', '  8', '0', '100', 'AcDbBlockBegin',
      '  2', '*Paper_Space', ' 70', '0',
      ' 10', '0.0', ' 20', '0.0', ' 30', '0.0',
      '  3', '*Paper_Space', '  1', '',
      '  0', 'ENDBLK', '  5', '1D', '330', '1B',
      '100', 'AcDbEntity', '  8', '0', '100', 'AcDbBlockEnd',
      '  0', 'ENDSEC',
    ].join('\n')
  }

  private generateEntities(): string {
    return [
      '  0', 'SECTION', '  2', 'ENTITIES',
      ...this.entities,
      '  0', 'ENDSEC',
    ].join('\n')
  }
}

/** Build CSTINVENTORY XDATA block (exported for reuse) */
export function buildXDATA(data: Record<string, string | number>): string {
  const lines: string[] = ['1001', 'CSTINVENTORY', '1002', '{']
  for (const [key, value] of Object.entries(data)) {
    lines.push('1000', key)
    if (typeof value === 'number') {
      if (Number.isInteger(value) && Math.abs(value) < 32768) lines.push('1070', value.toString())
      else lines.push('1040', value.toFixed(6))
    } else { lines.push('1000', value.toString()) }
  }
  lines.push('1002', '}')
  return lines.join('\n')
}

// DXF string builder class
// Generates DXF files compatible with CADSoftTools Inventory format
// DXF version AC1021 (AutoCAD 2007)

import { DXF_VERSION, LAYER_DEFS, TEXT_HEIGHT, DIM_TEXT_HEIGHT } from '../constants'

type DXFEntity = string

export class DXFWriter {
  private entities: DXFEntity[] = []
  private handleCounter: number = 0x40 // Start handles after standard ones

  private nextHandle(): string {
    this.handleCounter++
    return this.handleCounter.toString(16).toUpperCase()
  }

  // Add a LINE entity
  addLine(
    startX: number, startY: number,
    endX: number, endY: number,
    layer: string
  ): void {
    const handle = this.nextHandle()
    this.entities.push([
      '  0', 'LINE',
      '  5', handle,
      '330', '17',
      '100', 'AcDbEntity',
      '  8', layer,
      '100', 'AcDbLine',
      ' 10', startX.toFixed(6),
      ' 20', startY.toFixed(6),
      ' 30', '0.0',
      ' 11', endX.toFixed(6),
      ' 21', endY.toFixed(6),
      ' 31', '0.0',
    ].join('\n'))
  }

  // Add a TEXT entity
  addText(
    x: number, y: number,
    height: number,
    text: string,
    layer: string
  ): void {
    const handle = this.nextHandle()
    this.entities.push([
      '  0', 'TEXT',
      '  5', handle,
      '330', '17',
      '100', 'AcDbEntity',
      '  8', layer,
      '100', 'AcDbText',
      ' 10', x.toFixed(6),
      ' 20', y.toFixed(6),
      ' 30', '0.0',
      ' 40', height.toFixed(6),
      '  1', text,
      '100', 'AcDbText',
    ].join('\n'))
  }

  // Add a LWPOLYLINE entity (closed or open)
  addLWPolyline(
    points: [number, number][],
    layer: string,
    closed: boolean = false
  ): void {
    const handle = this.nextHandle()
    const flag = closed ? '1' : '0'
    const vertexCount = points.length

    const vertexData: string[] = []
    for (const [x, y] of points) {
      vertexData.push(' 10', x.toFixed(6))
      vertexData.push(' 20', y.toFixed(6))
    }

    this.entities.push([
      '  0', 'LWPOLYLINE',
      '  5', handle,
      '330', '17',
      '100', 'AcDbEntity',
      '  8', layer,
      '100', 'AcDbPolyline',
      ' 90', vertexCount.toString(),
      ' 70', flag,
      ...vertexData,
    ].join('\n'))
  }

  // Add an ARC entity
  addArc(
    centerX: number, centerY: number,
    radius: number,
    startAngle: number, endAngle: number,
    layer: string
  ): void {
    const handle = this.nextHandle()
    this.entities.push([
      '  0', 'ARC',
      '  5', handle,
      '330', '17',
      '100', 'AcDbEntity',
      '  8', layer,
      '100', 'AcDbCircle',
      ' 10', centerX.toFixed(6),
      ' 20', centerY.toFixed(6),
      ' 30', '0.0',
      ' 40', radius.toFixed(6),
      '100', 'AcDbArc',
      ' 50', startAngle.toFixed(6),
      ' 51', endAngle.toFixed(6),
    ].join('\n'))
  }

  // Generate the HEADER section
  private generateHeader(): string {
    return [
      '  0', 'SECTION',
      '  2', 'HEADER',
      '  9', '$ACADVER',
      '  1', DXF_VERSION,
      '  9', '$INSUNITS',
      ' 70', '6',
      '  0', 'ENDSEC',
    ].join('\n')
  }

  // Generate the TABLES section with layers
  private generateTables(): string {
    // VPORT table
    const vport = [
      '  0', 'TABLE',
      '  2', 'VPORT',
      '  5', '8',
      '330', '0',
      '100', 'AcDbSymbolTable',
      ' 70', '1',
      '  0', 'VPORT',
      '  5', '23',
      '330', '8',
      '100', 'AcDbSymbolTableRecord',
      '100', 'AcDbViewportTableRecord',
      '  2', '*Active',
      ' 70', '0',
      ' 10', '0.0',
      ' 20', '0.0',
      ' 11', '1.0',
      ' 21', '1.0',
      ' 12', '0.0',
      ' 22', '0.0',
      ' 13', '0.0',
      ' 23', '0.0',
      ' 14', '0.5',
      ' 24', '0.5',
      ' 15', '0.5',
      ' 25', '0.5',
      ' 16', '0.0',
      ' 26', '0.0',
      ' 36', '1.0',
      ' 17', '0.0',
      ' 27', '0.0',
      ' 37', '0.0',
      ' 40', '1000.0',
      ' 41', '1.34',
      ' 42', '50.0',
      ' 43', '0.0',
      ' 44', '0.0',
      ' 50', '0.0',
      ' 51', '0.0',
      ' 71', '0',
      ' 72', '1000',
      ' 73', '1',
      ' 74', '3',
      ' 75', '0',
      ' 76', '0',
      ' 77', '0',
      ' 78', '0',
      '281', '0',
      ' 65', '0',
      '146', '0.0',
      '  0', 'ENDTAB',
    ].join('\n')

    // LTYPE table
    const ltype = [
      '  0', 'TABLE',
      '  2', 'LTYPE',
      '  5', '2',
      '330', '0',
      '100', 'AcDbSymbolTable',
      ' 70', '3',
      '  0', 'LTYPE',
      '  5', '24',
      '330', '2',
      '100', 'AcDbSymbolTableRecord',
      '100', 'AcDbLinetypeTableRecord',
      '  2', 'ByBlock',
      ' 70', '0',
      '  3', '',
      ' 72', '65',
      ' 73', '0',
      ' 40', '0.0',
      '  0', 'LTYPE',
      '  5', '25',
      '330', '2',
      '100', 'AcDbSymbolTableRecord',
      '100', 'AcDbLinetypeTableRecord',
      '  2', 'ByLayer',
      ' 70', '0',
      '  3', '',
      ' 72', '65',
      ' 73', '0',
      ' 40', '0.0',
      '  0', 'LTYPE',
      '  5', '26',
      '330', '2',
      '100', 'AcDbSymbolTableRecord',
      '100', 'AcDbLinetypeTableRecord',
      '  2', 'Continuous',
      ' 70', '0',
      '  3', '',
      ' 72', '65',
      ' 73', '0',
      ' 40', '0.0',
      '  0', 'ENDTAB',
    ].join('\n')

    // LAYER table with our custom layers
    let layerHandle = 0x27
    const layerEntries: string[] = [
      '  0', 'TABLE',
      '  2', 'LAYER',
      '  5', '1',
      '330', '0',
      '100', 'AcDbSymbolTable',
      ' 70', (LAYER_DEFS.length + 2).toString(), // include 0 and Defpoints
    ]

    // Layer 0 (default)
    layerEntries.push(
      '  0', 'LAYER',
      '  5', (layerHandle++).toString(16).toUpperCase(),
      '330', '1',
      '100', 'AcDbSymbolTableRecord',
      '100', 'AcDbLayerTableRecord',
      '  2', '0',
      ' 70', '0',
      ' 62', '7',
      '  6', 'Continuous',
      '370', '-3',
      '390', '13',
      '347', '21',
    )

    // Defpoints layer
    layerEntries.push(
      '  0', 'LAYER',
      '  5', (layerHandle++).toString(16).toUpperCase(),
      '330', '1',
      '100', 'AcDbSymbolTableRecord',
      '100', 'AcDbLayerTableRecord',
      '  2', 'Defpoints',
      ' 70', '0',
      ' 62', '7',
      '  6', 'Continuous',
      '290', '0',
      '370', '-3',
      '390', '13',
      '347', '21',
    )

    // Custom layers
    for (const [name, color] of LAYER_DEFS) {
      layerEntries.push(
        '  0', 'LAYER',
        '  5', (layerHandle++).toString(16).toUpperCase(),
        '330', '1',
        '100', 'AcDbSymbolTableRecord',
        '100', 'AcDbLayerTableRecord',
        '  2', name,
        ' 70', '0',
        ' 62', color.toString(),
        '  6', 'Continuous',
        '370', '-3',
        '390', '13',
        '347', '21',
      )
    }

    layerEntries.push('  0', 'ENDTAB')

    // STYLE table
    const style = [
      '  0', 'TABLE',
      '  2', 'STYLE',
      '  5', '5',
      '330', '0',
      '100', 'AcDbSymbolTable',
      ' 70', '1',
      '  0', 'STYLE',
      '  5', '29',
      '330', '5',
      '100', 'AcDbSymbolTableRecord',
      '100', 'AcDbTextStyleTableRecord',
      '  2', 'Standard',
      ' 70', '0',
      ' 40', '0.0',
      ' 41', '1.0',
      ' 50', '0.0',
      ' 71', '0',
      ' 42', '2.5',
      '  3', 'txt',
      '  4', '',
      '  0', 'ENDTAB',
    ].join('\n')

    // VIEW table
    const view = [
      '  0', 'TABLE',
      '  2', 'VIEW',
      '  5', '7',
      '330', '0',
      '100', 'AcDbSymbolTable',
      ' 70', '0',
      '  0', 'ENDTAB',
    ].join('\n')

    // UCS table
    const ucs = [
      '  0', 'TABLE',
      '  2', 'UCS',
      '  5', '6',
      '330', '0',
      '100', 'AcDbSymbolTable',
      ' 70', '0',
      '  0', 'ENDTAB',
    ].join('\n')

    // APPID table
    const appid = [
      '  0', 'TABLE',
      '  2', 'APPID',
      '  5', '3',
      '330', '0',
      '100', 'AcDbSymbolTable',
      ' 70', '1',
      '  0', 'APPID',
      '  5', '2A',
      '330', '3',
      '100', 'AcDbSymbolTableRecord',
      '100', 'AcDbRegAppTableRecord',
      '  2', 'ACAD',
      ' 70', '0',
      '  0', 'ENDTAB',
    ].join('\n')

    // DIMSTYLE table
    const dimstyle = [
      '  0', 'TABLE',
      '  2', 'DIMSTYLE',
      '  5', '4',
      '330', '0',
      '100', 'AcDbSymbolTable',
      ' 70', '2',
      '100', 'AcDbDimStyleTable',
      '  0', 'DIMSTYLE',
      '105', '2B',
      '330', '4',
      '100', 'AcDbSymbolTableRecord',
      '100', 'AcDbDimStyleTableRecord',
      '  2', 'Standard',
      ' 70', '0',
      ' 40', '1.0',
      ' 41', DIM_TEXT_HEIGHT.toString(),
      ' 42', '80.0',
      ' 43', '3.75',
      ' 44', '250.0',
      ' 45', '0.0',
      ' 46', '0.0',
      ' 47', '0.0',
      ' 48', '0.0',
      '140', DIM_TEXT_HEIGHT.toString(),
      '141', '2.5',
      '142', '0.0',
      '143', '0.03937007874',
      '144', '0.001',
      '145', '0.0',
      '146', '1.0',
      '147', '80.0',
      '148', '0.0',
      ' 71', '0',
      ' 72', '0',
      ' 73', '0',
      ' 74', '0',
      ' 75', '0',
      ' 76', '0',
      ' 77', '1',
      ' 78', '8',
      ' 79', '3',
      '170', '0',
      '171', '3',
      '172', '1',
      '173', '0',
      '174', '0',
      '175', '0',
      '176', '0',
      '177', '0',
      '178', '0',
      '179', '2',
      '271', '2',
      '272', '2',
      '273', '2',
      '274', '3',
      '275', '0',
      '276', '0',
      '277', '2',
      '278', '44',
      '279', '0',
      '280', '0',
      '281', '0',
      '282', '0',
      '283', '0',
      '284', '8',
      '285', '0',
      '286', '0',
      '288', '0',
      '289', '3',
      '340', '29',
      '371', '-2',
      '372', '-2',
      '  0', 'ENDTAB',
    ].join('\n')

    // BLOCK_RECORD table
    const blockRecord = [
      '  0', 'TABLE',
      '  2', 'BLOCK_RECORD',
      '  5', '9',
      '330', '0',
      '100', 'AcDbSymbolTable',
      ' 70', '2',
      '  0', 'BLOCK_RECORD',
      '  5', '17',
      '330', '9',
      '100', 'AcDbSymbolTableRecord',
      '100', 'AcDbBlockTableRecord',
      '  2', '*Model_Space',
      '340', '1A',
      ' 70', '0',
      '280', '1',
      '281', '0',
      '  0', 'BLOCK_RECORD',
      '  5', '1B',
      '330', '9',
      '100', 'AcDbSymbolTableRecord',
      '100', 'AcDbBlockTableRecord',
      '  2', '*Paper_Space',
      '340', '1E',
      ' 70', '0',
      '280', '1',
      '281', '0',
      '  0', 'ENDTAB',
    ].join('\n')

    return [
      '  0', 'SECTION',
      '  2', 'TABLES',
      vport,
      ltype,
      layerEntries.join('\n'),
      style,
      view,
      ucs,
      appid,
      dimstyle,
      blockRecord,
      '  0', 'ENDSEC',
    ].join('\n')
  }

  // Generate the BLOCKS section
  private generateBlocks(): string {
    return [
      '  0', 'SECTION',
      '  2', 'BLOCKS',
      // Model_Space block
      '  0', 'BLOCK',
      '  5', '18',
      '330', '17',
      '100', 'AcDbEntity',
      '  8', '0',
      '100', 'AcDbBlockBegin',
      '  2', '*Model_Space',
      ' 70', '0',
      ' 10', '0.0',
      ' 20', '0.0',
      ' 30', '0.0',
      '  3', '*Model_Space',
      '  1', '',
      '  0', 'ENDBLK',
      '  5', '19',
      '330', '17',
      '100', 'AcDbEntity',
      '  8', '0',
      '100', 'AcDbBlockEnd',
      // Paper_Space block
      '  0', 'BLOCK',
      '  5', '1C',
      '330', '1B',
      '100', 'AcDbEntity',
      '  8', '0',
      '100', 'AcDbBlockBegin',
      '  2', '*Paper_Space',
      ' 70', '0',
      ' 10', '0.0',
      ' 20', '0.0',
      ' 30', '0.0',
      '  3', '*Paper_Space',
      '  1', '',
      '  0', 'ENDBLK',
      '  5', '1D',
      '330', '1B',
      '100', 'AcDbEntity',
      '  8', '0',
      '100', 'AcDbBlockEnd',
      '  0', 'ENDSEC',
    ].join('\n')
  }

  // Generate the ENTITIES section
  private generateEntities(): string {
    return [
      '  0', 'SECTION',
      '  2', 'ENTITIES',
      ...this.entities,
      '  0', 'ENDSEC',
    ].join('\n')
  }

  // Generate the complete DXF file content as string
  generate(): string {
    return [
      this.generateHeader(),
      this.generateTables(),
      this.generateBlocks(),
      this.generateEntities(),
      '  0', 'EOF',
    ].join('\n')
  }
}

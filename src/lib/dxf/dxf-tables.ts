// DXF TABLES section generator
// Separated from writer for anti-monolith compliance

import { LAYER_DEFS, DIM_TEXT_HEIGHT } from '../constants'

/** Generate the complete TABLES section */
export function generateTablesSection(): string {
  return [
    '  0', 'SECTION',
    '  2', 'TABLES',
    generateVPort(),
    generateLType(),
    generateLayerTable(),
    generateStyle(),
    generateView(),
    generateUCS(),
    generateAppId(),
    generateDimStyle(),
    generateBlockRecord(),
    '  0', 'ENDSEC',
  ].join('\n')
}

function generateVPort(): string {
  return [
    '  0', 'TABLE', '  2', 'VPORT', '  5', '8', '330', '0',
    '100', 'AcDbSymbolTable', ' 70', '1',
    '  0', 'VPORT', '  5', '23', '330', '8',
    '100', 'AcDbSymbolTableRecord', '100', 'AcDbViewportTableRecord',
    '  2', '*Active', ' 70', '0',
    ' 10', '0.0', ' 20', '0.0', ' 11', '1.0', ' 21', '1.0',
    ' 12', '0.0', ' 22', '0.0', ' 13', '0.0', ' 23', '0.0',
    ' 14', '0.5', ' 24', '0.5', ' 15', '0.5', ' 25', '0.5',
    ' 16', '0.0', ' 26', '0.0', ' 36', '1.0',
    ' 17', '0.0', ' 27', '0.0', ' 37', '0.0',
    ' 40', '1000.0', ' 41', '1.34', ' 42', '50.0',
    ' 43', '0.0', ' 44', '0.0', ' 50', '0.0', ' 51', '0.0',
    ' 71', '0', ' 72', '1000', ' 73', '1', ' 74', '3',
    ' 75', '0', ' 76', '0', ' 77', '0', ' 78', '0',
    '281', '0', ' 65', '0', '146', '0.0',
    '  0', 'ENDTAB',
  ].join('\n')
}

function generateLType(): string {
  return [
    '  0', 'TABLE', '  2', 'LTYPE', '  5', '2', '330', '0',
    '100', 'AcDbSymbolTable', ' 70', '3',
    '  0', 'LTYPE', '  5', '24', '330', '2',
    '100', 'AcDbSymbolTableRecord', '100', 'AcDbLinetypeTableRecord',
    '  2', 'ByBlock', ' 70', '0', '  3', '', ' 72', '65', ' 73', '0', ' 40', '0.0',
    '  0', 'LTYPE', '  5', '25', '330', '2',
    '100', 'AcDbSymbolTableRecord', '100', 'AcDbLinetypeTableRecord',
    '  2', 'ByLayer', ' 70', '0', '  3', '', ' 72', '65', ' 73', '0', ' 40', '0.0',
    '  0', 'LTYPE', '  5', '26', '330', '2',
    '100', 'AcDbSymbolTableRecord', '100', 'AcDbLinetypeTableRecord',
    '  2', 'Continuous', ' 70', '0', '  3', '', ' 72', '65', ' 73', '0', ' 40', '0.0',
    '  0', 'ENDTAB',
  ].join('\n')
}

function generateLayerTable(): string {
  let handle = 0x27
  const entries: string[] = [
    '  0', 'TABLE', '  2', 'LAYER', '  5', '1', '330', '0',
    '100', 'AcDbSymbolTable', ' 70', (LAYER_DEFS.length + 2).toString(),
  ]
  // Layer 0
  entries.push('  0', 'LAYER', '  5', (handle++).toString(16).toUpperCase(),
    '330', '1', '100', 'AcDbSymbolTableRecord', '100', 'AcDbLayerTableRecord',
    '  2', '0', ' 70', '0', ' 62', '7', '  6', 'Continuous',
    '370', '-3', '390', '13', '347', '21')
  // Defpoints
  entries.push('  0', 'LAYER', '  5', (handle++).toString(16).toUpperCase(),
    '330', '1', '100', 'AcDbSymbolTableRecord', '100', 'AcDbLayerTableRecord',
    '  2', 'Defpoints', ' 70', '0', ' 62', '7', '  6', 'Continuous',
    '290', '0', '370', '-3', '390', '13', '347', '21')
  // Custom layers
  for (const [name, color] of LAYER_DEFS) {
    entries.push('  0', 'LAYER', '  5', (handle++).toString(16).toUpperCase(),
      '330', '1', '100', 'AcDbSymbolTableRecord', '100', 'AcDbLayerTableRecord',
      '  2', name, ' 70', '0', ' 62', color.toString(), '  6', 'Continuous',
      '370', '-3', '390', '13', '347', '21')
  }
  entries.push('  0', 'ENDTAB')
  return entries.join('\n')
}

function generateStyle(): string {
  return [
    '  0', 'TABLE', '  2', 'STYLE', '  5', '5', '330', '0',
    '100', 'AcDbSymbolTable', ' 70', '1',
    '  0', 'STYLE', '  5', '29', '330', '5',
    '100', 'AcDbSymbolTableRecord', '100', 'AcDbTextStyleTableRecord',
    '  2', 'Standard', ' 70', '0', ' 40', '0.0', ' 41', '1.0',
    ' 50', '0.0', ' 71', '0', ' 42', '2.5', '  3', 'txt', '  4', '',
    '  0', 'ENDTAB',
  ].join('\n')
}

function generateView(): string {
  return ['  0', 'TABLE', '  2', 'VIEW', '  5', '7', '330', '0',
    '100', 'AcDbSymbolTable', ' 70', '0', '  0', 'ENDTAB'].join('\n')
}

function generateUCS(): string {
  return ['  0', 'TABLE', '  2', 'UCS', '  5', '6', '330', '0',
    '100', 'AcDbSymbolTable', ' 70', '0', '  0', 'ENDTAB'].join('\n')
}

function generateAppId(): string {
  return [
    '  0', 'TABLE', '  2', 'APPID', '  5', '3', '330', '0',
    '100', 'AcDbSymbolTable', ' 70', '2',
    '  0', 'APPID', '  5', '2A', '330', '3',
    '100', 'AcDbSymbolTableRecord', '100', 'AcDbRegAppTableRecord',
    '  2', 'ACAD', ' 70', '0',
    // CSTINVENTORY APPID for CADSoftTools Inventory XDATA
    '  0', 'APPID', '  5', '2C', '330', '3',
    '100', 'AcDbSymbolTableRecord', '100', 'AcDbRegAppTableRecord',
    '  2', 'CSTINVENTORY', ' 70', '0',
    '  0', 'ENDTAB',
  ].join('\n')
}

function generateDimStyle(): string {
  return [
    '  0', 'TABLE', '  2', 'DIMSTYLE', '  5', '4', '330', '0',
    '100', 'AcDbSymbolTable', ' 70', '2', '100', 'AcDbDimStyleTable',
    '  0', 'DIMSTYLE', '105', '2B', '330', '4',
    '100', 'AcDbSymbolTableRecord', '100', 'AcDbDimStyleTableRecord',
    '  2', 'Standard', ' 70', '0', ' 40', '1.0',
    ' 41', DIM_TEXT_HEIGHT.toString(), ' 42', '80.0', ' 43', '3.75',
    ' 44', '250.0', ' 45', '0.0', ' 46', '0.0', ' 47', '0.0', ' 48', '0.0',
    '140', DIM_TEXT_HEIGHT.toString(), '141', '2.5', '142', '0.0',
    '143', '0.03937007874', '144', '0.001', '145', '0.0', '146', '1.0',
    '147', '80.0', '148', '0.0',
    ' 71', '0', ' 72', '0', ' 73', '0', ' 74', '0', ' 75', '0', ' 76', '0',
    ' 77', '1', ' 78', '8', ' 79', '3',
    '170', '0', '171', '3', '172', '1', '173', '0', '174', '0', '175', '0',
    '176', '0', '177', '0', '178', '0', '179', '2',
    '271', '2', '272', '2', '273', '2', '274', '3', '275', '0',
    '276', '0', '277', '2', '278', '44', '279', '0',
    '280', '0', '281', '0', '282', '0', '283', '0', '284', '8', '285', '0',
    '286', '0', '288', '0', '289', '3', '340', '29', '371', '-2', '372', '-2',
    '  0', 'ENDTAB',
  ].join('\n')
}

function generateBlockRecord(): string {
  return [
    '  0', 'TABLE', '  2', 'BLOCK_RECORD', '  5', '9', '330', '0',
    '100', 'AcDbSymbolTable', ' 70', '2',
    '  0', 'BLOCK_RECORD', '  5', '17', '330', '9',
    '100', 'AcDbSymbolTableRecord', '100', 'AcDbBlockTableRecord',
    '  2', '*Model_Space', '340', '1A', ' 70', '0', '280', '1', '281', '0',
    '  0', 'BLOCK_RECORD', '  5', '1B', '330', '9',
    '100', 'AcDbSymbolTableRecord', '100', 'AcDbBlockTableRecord',
    '  2', '*Paper_Space', '340', '1E', ' 70', '0', '280', '1', '281', '0',
    '  0', 'ENDTAB',
  ].join('\n')
}

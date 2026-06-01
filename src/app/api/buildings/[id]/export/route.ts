import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateBuildingDXF } from '@/lib/dxf/generator'

// GET /api/buildings/[id]/export - generate and download DXF file
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const building = await db.building.findUnique({
      where: { id },
      include: {
        rooms: {
          orderBy: { orderIndex: 'asc' },
          include: {
            walls: {
              orderBy: { orderIndex: 'asc' },
              include: { openings: true },
            },
          },
        },
      },
    })

    if (!building) {
      return NextResponse.json({ error: 'Building not found' }, { status: 404 })
    }

    // Transform data for coordinate-based DXF generator
    const buildingData = {
      letter: building.letter,
      permitNumber: building.permitNumber,
      permitDate: building.permitDate,
      floorType: building.floorType,
      floorNumber: building.floorNumber,
      interiorHeight: building.interiorHeight,
      exteriorHeight: building.exteriorHeight,
      rooms: building.rooms.map(room => ({
        number: room.number,
        name: room.name,
        purpose: room.purpose,
        interiorHeight: room.interiorHeight,
        walls: room.walls.map(wall => ({
          // Coordinate fields (meters) - primary
          startX: wall.startX,
          startY: wall.startY,
          endX: wall.endX,
          endY: wall.endY,
          // Computed/legacy
          direction: wall.direction,
          length: wall.length,
          // Properties
          thickness: wall.thickness,
          wallType: wall.wallType,
          openings: wall.openings.map(opening => ({
            openingType: opening.openingType,
            offset: opening.offset,
            width: opening.width,
            height: opening.height,
          })),
        })),
      })),
    }

    const dxfContent = generateBuildingDXF(buildingData)
    const letter = building.letter || 'X'
    const filename = `building_${letter}.dxf`

    return new NextResponse(dxfContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/dxf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error generating DXF:', error)
    return NextResponse.json({ error: 'Failed to generate DXF' }, { status: 500 })
  }
}

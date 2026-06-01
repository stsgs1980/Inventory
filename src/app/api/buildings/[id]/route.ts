import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/buildings/[id] - get a single building
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
    return NextResponse.json(building)
  } catch (error) {
    console.error('Error fetching building:', error)
    return NextResponse.json({ error: 'Failed to fetch building' }, { status: 500 })
  }
}

// PUT /api/buildings/[id] - update a building
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const building = await db.building.update({
      where: { id },
      data: {
        letter: body.letter,
        permitNumber: body.permitNumber,
        permitDate: body.permitDate,
        floorType: body.floorType,
        floorNumber: body.floorNumber,
        interiorHeight: body.interiorHeight,
        exteriorHeight: body.exteriorHeight,
        notes: body.notes,
      },
    })
    return NextResponse.json(building)
  } catch (error) {
    console.error('Error updating building:', error)
    return NextResponse.json({ error: 'Failed to update building' }, { status: 500 })
  }
}

// DELETE /api/buildings/[id] - delete a building
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.building.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting building:', error)
    return NextResponse.json({ error: 'Failed to delete building' }, { status: 500 })
  }
}

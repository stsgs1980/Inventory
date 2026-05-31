import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/buildings - list all buildings
export async function GET() {
  try {
    const buildings = await db.building.findMany({
      orderBy: { createdAt: 'desc' },
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
    return NextResponse.json(buildings)
  } catch (error) {
    console.error('Error fetching buildings:', error)
    return NextResponse.json({ error: 'Failed to fetch buildings' }, { status: 500 })
  }
}

// POST /api/buildings - create a new building
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const building = await db.building.create({
      data: {
        letter: body.letter || '',
        permitNumber: body.permitNumber || '',
        permitDate: body.permitDate || '',
        floorType: body.floorType || 'Parter',
        floorNumber: body.floorNumber ?? 1,
        interiorHeight: body.interiorHeight ?? 2.70,
        exteriorHeight: body.exteriorHeight ?? 3.00,
        notes: body.notes || '',
      },
    })
    return NextResponse.json(building, { status: 201 })
  } catch (error) {
    console.error('Error creating building:', error)
    return NextResponse.json({ error: 'Failed to create building' }, { status: 500 })
  }
}

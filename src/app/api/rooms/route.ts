import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/rooms - create a room for a building
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const room = await db.room.create({
      data: {
        number: body.number ?? 1,
        name: body.name || 'Antreu',
        purpose: body.purpose || 'Auxiliara',
        interiorHeight: body.interiorHeight ?? 2.70,
        buildingId: body.buildingId,
        orderIndex: body.orderIndex ?? 0,
      },
      include: {
        walls: {
          orderBy: { orderIndex: 'asc' },
          include: { openings: true },
        },
      },
    })
    return NextResponse.json(room, { status: 201 })
  } catch (error) {
    console.error('Error creating room:', error)
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 })
  }
}

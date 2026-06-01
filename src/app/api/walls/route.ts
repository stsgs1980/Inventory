import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/walls - create a wall for a room (coordinate-based)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const wall = await db.wall.create({
      data: {
        // Coordinate fields (meters, absolute world position)
        startX: body.startX ?? 0,
        startY: body.startY ?? 0,
        endX: body.endX ?? 0,
        endY: body.endY ?? 0,
        // Computed/legacy fields
        direction: body.direction || 'E',
        length: body.length ?? 0,
        // Wall properties
        thickness: body.thickness ?? 400,
        wallType: body.wallType || 'portant',
        roomId: body.roomId,
        orderIndex: body.orderIndex ?? 0,
      },
      include: { openings: true },
    })
    return NextResponse.json(wall, { status: 201 })
  } catch (error) {
    console.error('Error creating wall:', error)
    return NextResponse.json({ error: 'Failed to create wall' }, { status: 500 })
  }
}

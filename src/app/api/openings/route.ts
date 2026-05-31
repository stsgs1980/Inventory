import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/openings - create an opening for a wall
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const opening = await db.opening.create({
      data: {
        openingType: body.openingType || 'door',
        wallIndex: body.wallIndex ?? 0,
        offset: body.offset ?? 0,
        width: body.width ?? 0.9,
        height: body.height ?? 2.1,
        wallId: body.wallId,
      },
    })
    return NextResponse.json(opening, { status: 201 })
  } catch (error) {
    console.error('Error creating opening:', error)
    return NextResponse.json({ error: 'Failed to create opening' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/rooms/[id] - get a single room
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const room = await db.room.findUnique({
      where: { id },
      include: {
        walls: {
          orderBy: { orderIndex: 'asc' },
          include: { openings: true },
        },
        building: true,
      },
    })
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }
    return NextResponse.json(room)
  } catch (error) {
    console.error('Error fetching room:', error)
    return NextResponse.json({ error: 'Failed to fetch room' }, { status: 500 })
  }
}

// PUT /api/rooms/[id] - update a room
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const room = await db.room.update({
      where: { id },
      data: {
        number: body.number,
        name: body.name,
        purpose: body.purpose,
        interiorHeight: body.interiorHeight,
        orderIndex: body.orderIndex,
      },
      include: {
        walls: {
          orderBy: { orderIndex: 'asc' },
          include: { openings: true },
        },
      },
    })
    return NextResponse.json(room)
  } catch (error) {
    console.error('Error updating room:', error)
    return NextResponse.json({ error: 'Failed to update room' }, { status: 500 })
  }
}

// DELETE /api/rooms/[id] - delete a room
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.room.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting room:', error)
    return NextResponse.json({ error: 'Failed to delete room' }, { status: 500 })
  }
}

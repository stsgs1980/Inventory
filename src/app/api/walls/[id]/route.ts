import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT /api/walls/[id] - update a wall
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const wall = await db.wall.update({
      where: { id },
      data: {
        direction: body.direction,
        length: body.length,
        thickness: body.thickness,
        wallType: body.wallType,
        orderIndex: body.orderIndex,
      },
      include: { openings: true },
    })
    return NextResponse.json(wall)
  } catch (error) {
    console.error('Error updating wall:', error)
    return NextResponse.json({ error: 'Failed to update wall' }, { status: 500 })
  }
}

// DELETE /api/walls/[id] - delete a wall
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.wall.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting wall:', error)
    return NextResponse.json({ error: 'Failed to delete wall' }, { status: 500 })
  }
}

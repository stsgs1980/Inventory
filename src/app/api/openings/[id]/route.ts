import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT /api/openings/[id] - update an opening
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const opening = await db.opening.update({
      where: { id },
      data: {
        openingType: body.openingType,
        wallIndex: body.wallIndex,
        offset: body.offset,
        width: body.width,
        height: body.height,
      },
    })
    return NextResponse.json(opening)
  } catch (error) {
    console.error('Error updating opening:', error)
    return NextResponse.json({ error: 'Failed to update opening' }, { status: 500 })
  }
}

// DELETE /api/openings/[id] - delete an opening
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.opening.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting opening:', error)
    return NextResponse.json({ error: 'Failed to delete opening' }, { status: 500 })
  }
}

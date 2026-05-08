import { NextRequest, NextResponse } from 'next/server'
import { getStudents, createStudent, getStudent, updateStudent, deleteStudent } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const institution = searchParams.get('institution') || undefined
  
  return NextResponse.json(getStudents(institution))
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const id = createStudent(data)
    return NextResponse.json({ id })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create student' }, { status: 500 })
  }
}
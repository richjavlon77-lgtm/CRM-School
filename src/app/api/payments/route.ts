import { NextRequest, NextResponse } from 'next/server'
import { getPayments, createPayment } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const student_id = searchParams.get('student_id')
  
  if (student_id) {
    return NextResponse.json(getPayments(parseInt(student_id)))
  }
  
  return NextResponse.json([])
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const id = createPayment(data)
    return NextResponse.json({ id })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 })
  }
}
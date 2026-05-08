import { NextRequest, NextResponse } from 'next/server'
import { getStats, getMonthlyStats, getTopDebtors } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const institution = searchParams.get('institution') || undefined
  
  if (type === 'stats' || !type) {
    return NextResponse.json(getStats(institution))
  }
  
  if (type === 'monthly') {
    return NextResponse.json(getMonthlyStats(institution))
  }
  
  if (type === 'top-debtors') {
    return NextResponse.json(getTopDebtors(institution))
  }
  
  return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
}
import { NextRequest, NextResponse } from 'next/server'
import { verifyUser } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()
    const user = verifyUser(username, password)
    
    if (user) {
      const token = Buffer.from(JSON.stringify({ id: user.id, role: user.role, username: user.username })).toString('base64')
      return NextResponse.json({ token, role: user.role })
    }
    
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (!password) {
    return NextResponse.json({ error: 'enter a password to continue.' }, { status: 400 })
  }

  if (password !== process.env.LORE_PASSWORD) {
    return NextResponse.json({ error: 'incorrect password.' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('lore_access', '1', {
    path: '/lore',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 30,
  })
  return response
}

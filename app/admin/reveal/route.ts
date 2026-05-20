import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user?.email !== 'evoelemoyne@gmail.com') {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const res = await fetch(new URL('/api/reveal', req.url).toString(), {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + process.env.CRON_SECRET,
      'Content-Type': 'application/json',
    },
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

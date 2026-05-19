import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { mutual_id, clue } = await req.json()

  const { data: mutual } = await supabase
    .from('envelope_mutuals')
    .select('*')
    .eq('id', mutual_id)
    .single()

  if (!mutual) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (mutual.user_a_id !== user.id && mutual.user_b_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const field = mutual.user_a_id === user.id ? 'clue_a' : 'clue_b'
  await supabase.from('envelope_mutuals').update({ [field]: clue }).eq('id', mutual_id)

  return NextResponse.json({ ok: true })
}

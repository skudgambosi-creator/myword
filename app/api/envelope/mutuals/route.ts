import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const group_id = searchParams.get('group_id')

  let query = supabase
    .from('envelope_mutuals')
    .select('*, user_a:users!envelope_mutuals_user_a_id_fkey(member_number), user_b:users!envelope_mutuals_user_b_id_fkey(member_number)')
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)

  if (group_id) query = query.eq('group_id', group_id)

  const { data } = await query

  return NextResponse.json((data || []).map((m: any) => ({
    ...m,
    other_member_number: m.user_a_id === user.id ? m.user_b?.member_number : m.user_a?.member_number,
    my_clue: m.user_a_id === user.id ? m.clue_a : m.clue_b,
    their_clue: m.user_a_id === user.id ? m.clue_b : m.clue_a,
    am_user_a: m.user_a_id === user.id,
  })))
}

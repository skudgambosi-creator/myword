import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { submission_id, author_id, group_id } = await req.json()
  if (!submission_id || !author_id || !group_id) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  if (author_id === user.id) {
    return NextResponse.json({ error: 'Cannot send envelope to yourself' }, { status: 400 })
  }

  await supabase.from('envelopes').upsert(
    { from_user_id: user.id, to_user_id: author_id, submission_id, group_id },
    { onConflict: 'from_user_id,submission_id' }
  )

  // Check if author has also sent an envelope to current user (mutual)
  const { data: mutual } = await supabase
    .from('envelopes')
    .select('id')
    .eq('from_user_id', author_id)
    .eq('to_user_id', user.id)
    .eq('group_id', group_id)
    .limit(1)
    .maybeSingle()

  const isMutual = !!mutual
  if (isMutual) {
    const [a, b] = [user.id, author_id].sort()
    await supabase.from('envelope_mutuals').upsert(
      { user_a_id: a, user_b_id: b, group_id },
      { onConflict: 'user_a_id,user_b_id,group_id' }
    )
  }

  return NextResponse.json({ mutual: isMutual })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Writes a backfilled (late catch-up) submission for a missed week 1–26.
// Routed through a service-role endpoint rather than a direct client write
// because the normal "update own submission before close" RLS policy checks
// the row's OWN week's closes_at — for a catch-up row that's the originally
// missed week, already long past. Here we check week 27's (the collection
// week's) closes_at instead, which is the actually-relevant cutoff.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { weekId, wordTitle, content, wordCount, isSigned, signedName } = await req.json()
  if (!weekId || !wordTitle?.trim() || !content) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const service = createServiceClient()

  const { data: membership } = await service
    .from('group_members').select('*')
    .eq('group_id', params.id).eq('user_id', user.id).maybeSingle()
  if (!membership) return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 })

  const { data: week } = await service
    .from('weeks').select('*')
    .eq('id', weekId).eq('group_id', params.id).maybeSingle()
  if (!week || week.week_num > 26) {
    return NextResponse.json({ error: 'Not a valid catch-up week' }, { status: 400 })
  }

  // Can't "fix" a week you actually submitted on time
  const { data: onTime } = await service
    .from('submissions').select('id')
    .eq('user_id', user.id).eq('week_id', weekId).eq('is_late_catchup', false)
    .maybeSingle()
  if (onTime) return NextResponse.json({ error: 'You already submitted this week on time' }, { status: 400 })

  // The group's wrap week (27) must be currently open
  const { data: wrapWeek } = await service
    .from('weeks').select('closes_at')
    .eq('group_id', params.id).eq('week_num', 27).maybeSingle()
  if (!wrapWeek || new Date(wrapWeek.closes_at) < new Date()) {
    return NextResponse.json({ error: 'The collection week is not open' }, { status: 400 })
  }

  const { data: sub, error } = await service
    .from('submissions')
    .upsert({
      group_id: params.id,
      user_id: user.id,
      week_id: weekId,
      word_title: wordTitle.trim(),
      body_html: content,
      word_count: wordCount || 0,
      is_late_catchup: true,
      is_signed: !!isSigned,
      signed_name: signedName || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,week_id,is_late_catchup' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ submission: sub })
}

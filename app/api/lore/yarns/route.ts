import { NextRequest, NextResponse } from 'next/server'
import { getLoreSession } from '@/lib/supabase/lore-api'
import { createLoreAdminClient } from '@/lib/supabase/lore-admin'

export async function GET(req: NextRequest) {
  const session = await getLoreSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const mode = new URL(req.url).searchParams.get('mode') || 'index'
  const lore = createLoreAdminClient()

  // Dashboard live feed — recent 30, lightweight
  if (mode === 'feed') {
    const { data, error } = await lore
      .from('lore_yarns')
      .select('id, title, place, created_at, author_id, lore_characters(character_name)')
      .order('created_at', { ascending: false })
      .limit(30)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ yarns: data || [] })
  }

  // Random selection — ids only
  if (mode === 'ids') {
    const { data, error } = await lore.from('lore_yarns').select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ yarns: data || [] })
  }

  // Same day — lightweight list for yarn view page
  if (mode === 'sameday') {
    const url = new URL(req.url)
    const day = url.searchParams.get('day')
    const month = url.searchParams.get('month')
    const exclude = url.searchParams.get('exclude')
    let q = lore.from('lore_yarns').select('id, title')
    if (day) q = q.eq('day', parseInt(day))
    if (month) q = q.eq('month', parseInt(month))
    if (exclude) q = q.neq('id', exclude)
    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ yarns: data || [] })
  }

  // Same event — lightweight list for yarn view page
  if (mode === 'sameevent') {
    const url = new URL(req.url)
    const event_id = url.searchParams.get('event_id')
    const exclude = url.searchParams.get('exclude')
    if (!event_id) return NextResponse.json({ yarns: [] })
    let q = lore.from('lore_yarns').select('id, title').eq('event_id', event_id)
    if (exclude) q = q.neq('id', exclude)
    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ yarns: data || [] })
  }

  // Full index — all yarns with joins, ordered chronologically
  const { data, error } = await lore
    .from('lore_yarns')
    .select('*, lore_characters(id, character_name), lore_events(id, title), lore_yarn_tags(lore_tags(id, name, is_taboo)), lore_yarn_characters(lore_characters(id, character_name))')
    .order('year', { ascending: true })
    .order('month', { ascending: true, nullsFirst: false })
    .order('day', { ascending: true, nullsFirst: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ yarns: data || [] })
}

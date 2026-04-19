import { NextRequest, NextResponse } from 'next/server'
import { getLoreSession } from '@/lib/supabase/lore-api'
import { createLoreAdminClient } from '@/lib/supabase/lore-admin'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getLoreSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const full = new URL(req.url).searchParams.get('full') === '1'
  const lore = createLoreAdminClient()

  if (full) {
    // Full yarn with all joins — for the yarn view page
    const { data, error } = await lore
      .from('lore_yarns')
      .select('*, lore_characters(id, character_name, user_id), lore_events(id, title), lore_yarn_tags(lore_tags(id, name, is_taboo)), lore_yarn_characters(lore_characters(id, character_name, user_id))')
      .eq('id', params.id)
      .single()
    if (error || !data) return NextResponse.json({ error: error?.message || 'Not found' }, { status: 404 })

    // Fetch interactions for this user
    const [{ data: heartData }, { data: concurs }, { data: validates }, { data: myValidate }, { data: myConcur }] = await Promise.all([
      lore.from('lore_hearts').select('user_id').eq('user_id', session.user.id).eq('yarn_id', params.id).maybeSingle(),
      lore.from('lore_concurs').select('user_id').eq('yarn_id', params.id),
      lore.from('lore_validates').select('user_id').eq('yarn_id', params.id),
      lore.from('lore_validates').select('user_id').eq('yarn_id', params.id).eq('user_id', session.user.id).maybeSingle(),
      lore.from('lore_concurs').select('user_id').eq('yarn_id', params.id).eq('user_id', session.user.id).maybeSingle(),
    ])

    // Fetch character — needed for user's character id
    const { data: charData } = await lore
      .from('lore_characters')
      .select('id')
      .eq('user_id', session.user.id)
      .maybeSingle()

    return NextResponse.json({
      yarn: data,
      interactions: {
        isHearted: !!heartData,
        concurCount: (concurs || []).length,
        hasConcurred: !!myConcur,
        validateCount: (validates || []).length,
        hasValidated: !!myValidate,
      },
      userCharId: charData?.id || null,
    })
  }

  // Lightweight — for Realtime handler
  const { data, error } = await lore
    .from('lore_yarns')
    .select('id, title, created_at, author_id, lore_characters(character_name)')
    .eq('id', params.id)
    .single()

  if (error || !data) return NextResponse.json({ error: error?.message || 'Not found' }, { status: 404 })
  return NextResponse.json({ yarn: data })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getLoreSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json()
  const lore = createLoreAdminClient()
  const updates: Record<string, any> = {}

  // Place update
  if ('place' in body) {
    updates.place = body.place?.trim() || null
  }

  // Event: create new by name
  if (body.eventName?.trim()) {
    const { data: newEvent, error: evErr } = await lore
      .from('lore_events')
      .insert({ title: body.eventName.trim() })
      .select('id, title')
      .single()

    if (evErr || !newEvent) {
      return NextResponse.json({ error: evErr?.message || 'Failed to create event' }, { status: 500 })
    }

    updates.event_id = newEvent.id
    updates.event_timing = body.eventTiming || 'happened_at'

    await lore.from('lore_yarns').update(updates).eq('id', params.id)
    return NextResponse.json({ ok: true, eventId: newEvent.id, eventTitle: newEvent.title })
  }

  // Event: select existing or clear
  if ('eventId' in body) {
    updates.event_id = body.eventId || null
    updates.event_timing = body.eventId ? (body.eventTiming || 'happened_at') : null
  }

  // Timing-only update (event already set)
  if ('eventTiming' in body && !('eventId' in body) && !body.eventName) {
    updates.event_timing = body.eventTiming
  }

  if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true })

  const { error } = await lore.from('lore_yarns').update(updates).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// Called when user goes back to step 1 — removes the uncommitted draft yarn
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getLoreSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const lore = createLoreAdminClient()

  await Promise.all([
    lore.from('lore_yarn_characters').delete().eq('yarn_id', params.id),
    lore.from('lore_yarn_tags').delete().eq('yarn_id', params.id),
    lore.from('lore_hearts').delete().eq('yarn_id', params.id),
    lore.from('lore_notifications').delete().eq('yarn_id', params.id),
  ])

  const { error } = await lore.from('lore_yarns').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { getLoreSession } from '@/lib/supabase/lore-api'
import { createLoreAdminClient } from '@/lib/supabase/lore-admin'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getLoreSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const lore = createLoreAdminClient()
  const { data, error } = await lore
    .from('lore_yarns')
    .select('id, title, created_at, author_id, place, lore_characters(character_name)')
    .eq('id', params.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ yarn: data })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getLoreSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json()
  const lore = createLoreAdminClient()

  // Verify author
  const { data: authorChar } = await lore.from('lore_characters').select('id').eq('user_id', session.user.id).maybeSingle()
  if (authorChar) {
    const { data: existingYarn } = await lore.from('lore_yarns').select('author_id').eq('id', params.id).single()
    if (!existingYarn || existingYarn.author_id !== authorChar.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }
  }

  const updates: Record<string, any> = {}

  // Core content update (edit mode)
  if (body.title !== undefined) updates.title = body.title
  if (body.bodyHtml !== undefined) updates.body_html = body.bodyHtml
  if ('day' in body) updates.day = body.day ? parseInt(body.day) : null
  if ('month' in body) updates.month = body.month ? parseInt(body.month) : null
  if ('year' in body) updates.year = parseInt(body.year)
  if ('wordCount' in body) updates.word_count = body.wordCount

  // Place + coordinates update
  if ('place' in body) {
    updates.place = body.place?.trim() || null
  }
  if ('latitude' in body) updates.latitude = body.latitude != null ? parseFloat(body.latitude) : null
  if ('longitude' in body) updates.longitude = body.longitude != null ? parseFloat(body.longitude) : null

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

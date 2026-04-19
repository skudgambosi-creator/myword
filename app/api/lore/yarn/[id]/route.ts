import { NextRequest, NextResponse } from 'next/server'
import { getLoreSession } from '@/lib/supabase/lore-api'
import { createLoreAdminClient } from '@/lib/supabase/lore-admin'

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

import { NextRequest, NextResponse } from 'next/server'
import { getLoreSession } from '@/lib/supabase/lore-api'
import { createLoreAdminClient } from '@/lib/supabase/lore-admin'

// GET /api/lore/notifications — user's recent notifications
export async function GET() {
  const session = await getLoreSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const lore = createLoreAdminClient()
  const { data, error } = await lore
    .from('lore_notifications')
    .select('*, lore_yarns(title)')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ notifications: data || [] })
}

// PATCH /api/lore/notifications — mark a notification as read
export async function PATCH(req: NextRequest) {
  const session = await getLoreSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const lore = createLoreAdminClient()
  await lore
    .from('lore_notifications')
    .update({ read: true })
    .eq('id', id)
    .eq('user_id', session.user.id) // safety: only mark own notifications

  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { getLoreSession } from '@/lib/supabase/lore-api'
import { createLoreAdminClient } from '@/lib/supabase/lore-admin'

// GET /api/lore/follows — returns current user's follows
export async function GET() {
  const session = await getLoreSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const lore = createLoreAdminClient()
  const { data, error } = await lore
    .from('lore_follows')
    .select('*')
    .eq('user_id', session.user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ follows: data || [] })
}

// POST /api/lore/follows — add a follow
export async function POST(req: NextRequest) {
  const session = await getLoreSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { followType, followValue } = await req.json()
  if (!followType || !followValue?.trim()) {
    return NextResponse.json({ error: 'followType and followValue required' }, { status: 400 })
  }

  const lore = createLoreAdminClient()
  const { error } = await lore.from('lore_follows').insert({
    user_id: session.user.id,
    follow_type: followType,
    follow_value: followValue.trim(),
  })

  // Ignore duplicate
  if (error && !error.message.includes('duplicate')) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// DELETE /api/lore/follows — remove a follow
export async function DELETE(req: NextRequest) {
  const session = await getLoreSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { followType, followValue } = await req.json()
  const lore = createLoreAdminClient()

  await lore
    .from('lore_follows')
    .delete()
    .eq('user_id', session.user.id)
    .eq('follow_type', followType)
    .eq('follow_value', followValue)

  return NextResponse.json({ ok: true })
}

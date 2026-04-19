import { NextRequest, NextResponse } from 'next/server'
import { getLoreSession } from '@/lib/supabase/lore-api'
import { createLoreAdminClient } from '@/lib/supabase/lore-admin'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getLoreSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const lore = createLoreAdminClient()
  const { error } = await lore
    .from('lore_concurs')
    .insert({ user_id: session.user.id, yarn_id: params.id })

  if (error && !error.message.includes('duplicate')) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getLoreSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const lore = createLoreAdminClient()
  await lore
    .from('lore_concurs')
    .delete()
    .eq('user_id', session.user.id)
    .eq('yarn_id', params.id)

  return NextResponse.json({ ok: true })
}

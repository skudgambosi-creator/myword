import { NextRequest, NextResponse } from 'next/server'
import { getLoreSession } from '@/lib/supabase/lore-api'
import { createLoreAdminClient } from '@/lib/supabase/lore-admin'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getLoreSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { characterId } = await req.json()
  const lore = createLoreAdminClient()

  const { error } = await lore
    .from('lore_yarn_characters')
    .insert({ yarn_id: params.id, character_id: characterId })

  if (error && !error.message.includes('duplicate')) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Send mention notification (skip if self-mention)
  const { data: charData } = await lore
    .from('lore_characters')
    .select('user_id')
    .eq('id', characterId)
    .maybeSingle()

  if (charData?.user_id && charData.user_id !== session.user.id) {
    await lore.from('lore_notifications').insert({
      user_id: charData.user_id,
      notif_type: 'mention',
      yarn_id: params.id,
    })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getLoreSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { characterId } = await req.json()
  const lore = createLoreAdminClient()

  await lore
    .from('lore_yarn_characters')
    .delete()
    .eq('yarn_id', params.id)
    .eq('character_id', characterId)

  return NextResponse.json({ ok: true })
}

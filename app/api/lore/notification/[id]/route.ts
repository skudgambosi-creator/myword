import { NextRequest, NextResponse } from 'next/server'
import { getLoreSession } from '@/lib/supabase/lore-api'
import { createLoreAdminClient } from '@/lib/supabase/lore-admin'

export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getLoreSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const lore = createLoreAdminClient()
  await lore
    .from('lore_notifications')
    .update({ read: true })
    .eq('id', params.id)
    .eq('user_id', session.user.id)

  return NextResponse.json({ ok: true })
}

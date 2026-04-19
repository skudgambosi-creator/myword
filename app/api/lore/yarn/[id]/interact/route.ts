import { NextRequest, NextResponse } from 'next/server'
import { getLoreSession } from '@/lib/supabase/lore-api'
import { createLoreAdminClient } from '@/lib/supabase/lore-admin'

// POST /api/lore/yarn/[id]/interact
// body: { type: 'heart' | 'concur' | 'validate', action: 'add' | 'remove' }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getLoreSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { type, action } = await req.json()
  const lore = createLoreAdminClient()
  const table = type === 'heart' ? 'lore_hearts' : type === 'concur' ? 'lore_concurs' : 'lore_validates'

  if (action === 'remove') {
    await lore.from(table).delete().eq('user_id', session.user.id).eq('yarn_id', params.id)
  } else {
    const { error } = await lore.from(table).insert({ user_id: session.user.id, yarn_id: params.id })
    if (error && !error.message.includes('duplicate')) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}

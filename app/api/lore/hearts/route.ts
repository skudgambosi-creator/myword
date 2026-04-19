import { NextRequest, NextResponse } from 'next/server'
import { getLoreSession } from '@/lib/supabase/lore-api'
import { createLoreAdminClient } from '@/lib/supabase/lore-admin'

// GET /api/lore/hearts — returns user's hearts and all heart counts
export async function GET() {
  const session = await getLoreSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const lore = createLoreAdminClient()

  const [{ data: myHearts }, { data: allHearts }] = await Promise.all([
    lore.from('lore_hearts').select('yarn_id').eq('user_id', session.user.id).not('yarn_id', 'is', null),
    lore.from('lore_hearts').select('yarn_id').not('yarn_id', 'is', null),
  ])

  const counts: Record<string, number> = {}
  for (const h of (allHearts || [])) {
    if (h.yarn_id) counts[h.yarn_id] = (counts[h.yarn_id] || 0) + 1
  }

  return NextResponse.json({
    myHearts: (myHearts || []).map((h: any) => h.yarn_id),
    counts,
  })
}

// POST /api/lore/hearts — toggle heart for a yarn
export async function POST(req: NextRequest) {
  const session = await getLoreSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { yarnId, action } = await req.json() // action: 'add' | 'remove'
  if (!yarnId) return NextResponse.json({ error: 'yarnId required' }, { status: 400 })

  const lore = createLoreAdminClient()

  if (action === 'remove') {
    await lore.from('lore_hearts').delete().eq('user_id', session.user.id).eq('yarn_id', yarnId)
  } else {
    const { error } = await lore.from('lore_hearts').insert({ user_id: session.user.id, yarn_id: yarnId })
    if (error && !error.message.includes('duplicate')) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}

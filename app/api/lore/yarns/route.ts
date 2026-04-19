import { NextResponse } from 'next/server'
import { getLoreSession } from '@/lib/supabase/lore-api'
import { createLoreAdminClient } from '@/lib/supabase/lore-admin'

export async function GET() {
  const session = await getLoreSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const lore = createLoreAdminClient()

  const [
    { data: yarns },
    { data: chars },
    { data: tags },
    { data: follows },
    { data: myHearts },
    { data: allHearts },
  ] = await Promise.all([
    lore
      .from('lore_yarns')
      .select('*, lore_characters(id, character_name), lore_events(id, title), lore_yarn_tags(lore_tags(id, name, is_taboo)), lore_yarn_characters(lore_characters(id, character_name))')
      .order('year')
      .order('month', { nullsFirst: false })
      .order('day', { nullsFirst: false }),
    lore.from('lore_characters').select('id, character_name'),
    lore.from('lore_tags').select('id, name, is_taboo').eq('is_taboo', false),
    lore.from('lore_follows').select('follow_type, follow_value').eq('user_id', session.user.id),
    lore.from('lore_hearts').select('yarn_id').eq('user_id', session.user.id).not('yarn_id', 'is', null),
    lore.from('lore_hearts').select('yarn_id').not('yarn_id', 'is', null),
  ])

  const heartCounts: Record<string, number> = {}
  for (const h of (allHearts || [])) {
    if (h.yarn_id) heartCounts[h.yarn_id] = (heartCounts[h.yarn_id] || 0) + 1
  }

  return NextResponse.json({
    yarns: yarns || [],
    chars: chars || [],
    tags: tags || [],
    follows: follows || [],
    myHeartIds: (myHearts || []).map((h: any) => h.yarn_id),
    heartCounts,
  })
}

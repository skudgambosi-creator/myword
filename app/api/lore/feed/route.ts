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
    { data: notifs },
    { data: places },
    { data: allYarns },
    { data: golden },
    { data: mapYarns },
    { data: allHearts },
  ] = await Promise.all([
    lore
      .from('lore_yarns')
      .select('id, title, created_at, author_id, place, lore_characters(character_name)')
      .order('created_at', { ascending: false })
      .limit(30),
    lore.from('lore_characters').select('id, character_name'),
    lore.from('lore_tags').select('id, name, is_taboo').eq('is_taboo', false),
    lore.from('lore_follows').select('follow_type, follow_value').eq('user_id', session.user.id),
    lore
      .from('lore_notifications')
      .select('id, notif_type, yarn_id, read, created_at, lore_yarns(title)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    lore.from('lore_yarns').select('place').not('place', 'is', null),
    lore.from('lore_yarns').select('id'),
    lore.from('golden_yarn_holder').select('character_name').maybeSingle(),
    lore.from('lore_yarns').select('id, latitude, longitude').not('latitude', 'is', null),
    lore.from('lore_hearts').select('yarn_id').not('yarn_id', 'is', null),
  ])

  const uniquePlaces = Array.from(new Set((places || []).map((p: any) => p.place).filter(Boolean))) as string[]

  const heartCounts: Record<string, number> = {}
  for (const h of (allHearts || [])) {
    if (h.yarn_id) heartCounts[h.yarn_id] = (heartCounts[h.yarn_id] || 0) + 1
  }

  return NextResponse.json({
    yarns: yarns || [],
    chars: chars || [],
    tags: tags || [],
    follows: follows || [],
    notifications: notifs || [],
    places: uniquePlaces,
    allYarnIds: (allYarns || []).map((y: any) => y.id),
    goldenHolder: (golden as any)?.character_name ?? null,
    mapYarns: mapYarns || [],
    heartCounts,
  })
}

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
  ])

  const uniquePlaces = Array.from(new Set((places || []).map((p: any) => p.place).filter(Boolean))) as string[]

  return NextResponse.json({
    yarns: yarns || [],
    chars: chars || [],
    tags: tags || [],
    follows: follows || [],
    notifications: notifs || [],
    places: uniquePlaces,
    allYarnIds: (allYarns || []).map((y: any) => y.id),
    goldenHolder: (golden as any)?.character_name ?? null,
  })
}

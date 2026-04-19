import { NextResponse } from 'next/server'
import { getLoreSession } from '@/lib/supabase/lore-api'
import { createLoreAdminClient } from '@/lib/supabase/lore-admin'

// Lightweight reference data used by add/contribute/characters pages
export async function GET() {
  const session = await getLoreSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const lore = createLoreAdminClient()

  const [{ data: chars }, { data: tags }, { data: events }, { data: places }, { data: follows }] = await Promise.all([
    lore.from('lore_characters').select('id, character_name'),
    lore.from('lore_tags').select('id, name, is_taboo'),
    lore.from('lore_events').select('id, title').order('title'),
    lore.from('lore_yarns').select('place').not('place', 'is', null),
    lore.from('lore_follows').select('follow_type, follow_value').eq('user_id', session.user.id),
  ])

  const uniquePlaces = Array.from(new Set((places || []).map((p: any) => p.place).filter(Boolean))) as string[]

  return NextResponse.json({
    chars: chars || [],
    tags: tags || [],
    events: events || [],
    places: uniquePlaces,
    follows: follows || [],
  })
}

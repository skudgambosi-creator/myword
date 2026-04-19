import { NextRequest, NextResponse } from 'next/server'
import { getLoreSession } from '@/lib/supabase/lore-api'
import { createLoreAdminClient } from '@/lib/supabase/lore-admin'

// GET /api/lore/character/[id]/yarns — all yarns mentioning this character, ordered chronologically
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getLoreSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const lore = createLoreAdminClient()

  const { data, error } = await lore
    .from('lore_yarn_characters')
    .select('yarn_id, lore_yarns(id, year, month, day)')
    .eq('character_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const yarns = (data || [])
    .map((yc: any) => yc.lore_yarns)
    .filter(Boolean)
    .sort((a: any, b: any) => {
      if (a.year !== b.year) return a.year - b.year
      if ((a.month || 0) !== (b.month || 0)) return (a.month || 0) - (b.month || 0)
      return (a.day || 0) - (b.day || 0)
    })

  return NextResponse.json({ yarns })
}

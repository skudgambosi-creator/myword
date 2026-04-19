import { NextRequest, NextResponse } from 'next/server'
import { getLoreSession } from '@/lib/supabase/lore-api'
import { createLoreAdminClient } from '@/lib/supabase/lore-admin'

// GET /api/lore/tags — returns tags ordered by name
// ?all=1 returns all tags including taboo; otherwise only non-taboo
export async function GET(req: NextRequest) {
  const session = await getLoreSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const includeTaboo = new URL(req.url).searchParams.get('all') === '1'
  const lore = createLoreAdminClient()

  let q = lore.from('lore_tags').select('id, name, is_taboo').order('name')
  if (!includeTaboo) q = q.eq('is_taboo', false)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tags: data || [] })
}

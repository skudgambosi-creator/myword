import { NextResponse } from 'next/server'
import { getLoreSession } from '@/lib/supabase/lore-api'
import { createLoreAdminClient } from '@/lib/supabase/lore-admin'

// GET /api/lore/places — returns all unique yarn places
export async function GET() {
  const session = await getLoreSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const lore = createLoreAdminClient()
  const { data, error } = await lore
    .from('lore_yarns')
    .select('place')
    .not('place', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const places = Array.from(new Set((data || []).map((p: any) => p.place).filter(Boolean))).sort() as string[]
  return NextResponse.json({ places })
}

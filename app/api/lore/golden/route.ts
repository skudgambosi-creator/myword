import { NextResponse } from 'next/server'
import { getLoreSession } from '@/lib/supabase/lore-api'
import { createLoreAdminClient } from '@/lib/supabase/lore-admin'

// GET /api/lore/golden — returns the current golden yarn holder's character name
export async function GET() {
  const session = await getLoreSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const lore = createLoreAdminClient()
  const { data } = await lore.from('golden_yarn_holder').select('character_name').single()
  return NextResponse.json({ characterName: (data as any)?.character_name || null })
}

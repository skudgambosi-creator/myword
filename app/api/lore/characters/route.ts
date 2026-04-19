import { NextResponse } from 'next/server'
import { getLoreSession } from '@/lib/supabase/lore-api'
import { createLoreAdminClient } from '@/lib/supabase/lore-admin'

export async function GET() {
  const session = await getLoreSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const lore = createLoreAdminClient()
  const { data, error } = await lore
    .from('lore_characters')
    .select('id, character_name')
    .order('character_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ characters: data || [] })
}

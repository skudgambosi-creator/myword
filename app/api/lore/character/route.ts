import { NextRequest, NextResponse } from 'next/server'
import { createLoreAdminClient } from '@/lib/supabase/lore-admin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  // Verify the user is logged in via the main Supabase
  const cookieStore = cookies()
  const mainSupa = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value },
        set() {},
        remove() {},
      },
    }
  )

  const { data: { session } } = await mainSupa.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { characterName } = await req.json()
  const trimmed = characterName?.trim()
  if (!trimmed) {
    return NextResponse.json({ error: 'Character name is required' }, { status: 400 })
  }

  // Use service role key to bypass RLS
  const lore = createLoreAdminClient()
  const userId = session.user.id

  const { error } = await lore
    .from('lore_characters')
    .upsert(
      { user_id: userId, character_name: trimmed, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )

  if (error) {
    console.error('lore character save error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, character_name: trimmed })
}

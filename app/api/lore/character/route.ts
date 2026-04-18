import { NextRequest, NextResponse } from 'next/server'
import { createLoreAdminClient } from '@/lib/supabase/lore-admin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function getMainSupa() {
  const cookieStore = cookies()
  return createServerClient(
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
}

export async function GET() {
  const { data: { session } } = await getMainSupa().auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const lore = createLoreAdminClient()
  const { data, error } = await lore
    .from('lore_characters')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (error) {
    console.error('lore character fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ character: data || null })
}

export async function POST(req: NextRequest) {
  const { data: { session } } = await getMainSupa().auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { characterName } = await req.json()
  const trimmed = characterName?.trim()
  if (!trimmed) {
    return NextResponse.json({ error: 'Character name is required' }, { status: 400 })
  }

  const lore = createLoreAdminClient()

  // Check name is not already taken by another user
  const { data: existing } = await lore
    .from('lore_characters')
    .select('user_id')
    .ilike('character_name', trimmed)
    .maybeSingle()

  if (existing && existing.user_id !== session.user.id) {
    return NextResponse.json({ error: 'That name is already taken.' }, { status: 409 })
  }

  const { error } = await lore
    .from('lore_characters')
    .upsert(
      { user_id: session.user.id, character_name: trimmed, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )

  if (error) {
    console.error('lore character save error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, character_name: trimmed })
}

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getLoreSession } from '@/lib/supabase/lore-api'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const session = await getLoreSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { languageId, password } = await req.json()
  if (!languageId || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supa = createServiceClient()

  // Look up password hash from tongues_languages table
  const { data: lang, error: langError } = await supa
    .from('tongues_languages')
    .select('password_hash')
    .eq('id', languageId)
    .maybeSingle()

  if (langError || !lang) {
    return NextResponse.json({ error: 'Language not found' }, { status: 404 })
  }

  const match = await bcrypt.compare(password, lang.password_hash)
  if (!match) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }

  await supa.from('tongues_unlocks').upsert(
    { user_id: session.user.id, language_id: languageId },
    { ignoreDuplicates: true }
  )

  return NextResponse.json({ ok: true })
}

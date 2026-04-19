import { NextRequest, NextResponse } from 'next/server'
import { getLoreSession } from '@/lib/supabase/lore-api'
import { createLoreAdminClient } from '@/lib/supabase/lore-admin'

export async function POST(req: NextRequest) {
  const session = await getLoreSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { title, bodyHtml, day, month, year, wordCount, parentYarnId } = await req.json()

  const lore = createLoreAdminClient()

  // Look up the author's character
  const { data: authorChar } = await lore
    .from('lore_characters')
    .select('id')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (!authorChar) {
    return NextResponse.json(
      { error: 'No character found. Set your character name before writing a yarn.' },
      { status: 400 }
    )
  }

  const { data: yarn, error } = await lore
    .from('lore_yarns')
    .insert({
      author_id: authorChar.id,
      title,
      body_html: bodyHtml,
      day: day ? parseInt(day) : null,
      month: month ? parseInt(month) : null,
      year: parseInt(year),
      word_count: wordCount || 0,
      parent_yarn_id: parentYarnId || null,
    })
    .select('id')
    .single()

  if (error || !yarn) {
    console.error('yarn create error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to create yarn' }, { status: 500 })
  }

  return NextResponse.json({ yarnId: yarn.id })
}

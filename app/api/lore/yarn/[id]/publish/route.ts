import { NextRequest, NextResponse } from 'next/server'
import { getLoreSession } from '@/lib/supabase/lore-api'
import { createLoreAdminClient } from '@/lib/supabase/lore-admin'

// POST /api/lore/yarn/[id]/publish
// Creates lore_taboo_unlocks entries for the author + mentioned characters for all taboo tags on this yarn.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getLoreSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const lore = createLoreAdminClient()

  const { data: yarn } = await lore
    .from('lore_yarns')
    .select('author_id, lore_yarn_tags(lore_tags(id, is_taboo)), lore_yarn_characters(lore_characters(user_id))')
    .eq('id', params.id)
    .single()

  if (!yarn) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const tabooTagIds: string[] = ((yarn as any).lore_yarn_tags || [])
    .map((yt: any) => yt.lore_tags)
    .filter((t: any) => t?.is_taboo)
    .map((t: any) => t.id)

  if (tabooTagIds.length === 0) return NextResponse.json({ ok: true })

  // Collect user IDs: author + mentioned characters
  const mentionedUserIds: string[] = ((yarn as any).lore_yarn_characters || [])
    .map((yc: any) => yc.lore_characters?.user_id)
    .filter(Boolean)

  const { data: authorChar } = await lore
    .from('lore_characters')
    .select('user_id')
    .eq('id', (yarn as any).author_id)
    .single()

  const userIds = Array.from(new Set([
    ...(authorChar ? [authorChar.user_id] : []),
    ...mentionedUserIds,
  ]))

  const unlocks = userIds.flatMap(userId =>
    tabooTagIds.map(tagId => ({ user_id: userId, tag_id: tagId }))
  )

  if (unlocks.length > 0) {
    await lore.from('lore_taboo_unlocks').upsert(unlocks, { ignoreDuplicates: true })
  }

  return NextResponse.json({ ok: true })
}

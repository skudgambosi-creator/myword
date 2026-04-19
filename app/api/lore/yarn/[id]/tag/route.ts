import { NextRequest, NextResponse } from 'next/server'
import { getLoreSession } from '@/lib/supabase/lore-api'
import { createLoreAdminClient } from '@/lib/supabase/lore-admin'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getLoreSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { tagId, tagName, isTaboo } = await req.json()
  const lore = createLoreAdminClient()

  let resolvedTagId = tagId as string | undefined
  let resolvedTagName = tagName as string | undefined

  // If no tagId given, find or create the tag by name
  if (!resolvedTagId && tagName?.trim()) {
    const { data: existing } = await lore
      .from('lore_tags')
      .select('id, name')
      .ilike('name', tagName.trim())
      .maybeSingle()

    if (existing) {
      resolvedTagId = existing.id
      resolvedTagName = existing.name
    } else {
      const { data: newTag, error } = await lore
        .from('lore_tags')
        .insert({ name: tagName.trim(), is_taboo: !!isTaboo })
        .select('id, name')
        .single()

      if (!newTag || error) {
        return NextResponse.json({ error: error?.message || 'Failed to create tag' }, { status: 500 })
      }
      resolvedTagId = newTag.id
      resolvedTagName = newTag.name
    }
  }

  if (!resolvedTagId) {
    return NextResponse.json({ error: 'Tag name or ID required' }, { status: 400 })
  }

  const { error: linkError } = await lore
    .from('lore_yarn_tags')
    .insert({ yarn_id: params.id, tag_id: resolvedTagId })

  // Ignore duplicate — tag already linked
  if (linkError && !linkError.message.includes('duplicate')) {
    return NextResponse.json({ error: linkError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, tagId: resolvedTagId, tagName: resolvedTagName })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getLoreSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { tagId } = await req.json()
  const lore = createLoreAdminClient()

  await lore
    .from('lore_yarn_tags')
    .delete()
    .eq('yarn_id', params.id)
    .eq('tag_id', tagId)

  return NextResponse.json({ ok: true })
}

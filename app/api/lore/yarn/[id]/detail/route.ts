import { NextRequest, NextResponse } from 'next/server'
import { getLoreSession } from '@/lib/supabase/lore-api'
import { createLoreAdminClient } from '@/lib/supabase/lore-admin'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getLoreSession()
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const lore = createLoreAdminClient()

  // Main yarn + user's own character
  const [{ data: yarn }, { data: myChar }] = await Promise.all([
    lore
      .from('lore_yarns')
      .select('*, lore_characters(id, character_name, user_id), lore_events(id, title), lore_yarn_tags(lore_tags(id, name, is_taboo)), lore_yarn_characters(lore_characters(id, character_name, user_id))')
      .eq('id', params.id)
      .single(),
    lore.from('lore_characters').select('id').eq('user_id', session.user.id).maybeSingle(),
  ])

  if (!yarn) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Social counts + user state
  const [{ data: heartRow }, { data: concurs }, { data: validates }, { data: myValidate }, { data: myConcur }] = await Promise.all([
    lore.from('lore_hearts').select('user_id').eq('user_id', session.user.id).eq('yarn_id', params.id).maybeSingle(),
    lore.from('lore_concurs').select('user_id').eq('yarn_id', params.id),
    lore.from('lore_validates').select('user_id').eq('yarn_id', params.id),
    lore.from('lore_validates').select('user_id').eq('yarn_id', params.id).eq('user_id', session.user.id).maybeSingle(),
    lore.from('lore_concurs').select('user_id').eq('yarn_id', params.id).eq('user_id', session.user.id).maybeSingle(),
  ])

  // Related yarns
  const [sameDayResult, sameEventResult] = await Promise.all([
    yarn.day && yarn.month
      ? lore.from('lore_yarns').select('id, title').eq('day', yarn.day).eq('month', yarn.month).neq('id', params.id)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    yarn.event_id
      ? lore.from('lore_yarns').select('id, title').eq('event_id', yarn.event_id).neq('id', params.id)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
  ])
  const sameDayYarns = sameDayResult.data || []
  const sameEventYarns = sameEventResult.data || []

  // Character navigation — per mentioned character, fetch all their yarns sorted by date
  const mentionedCharIds: string[] = ((yarn.lore_yarn_characters as any[]) || [])
    .map((yc: any) => yc.lore_characters?.id)
    .filter(Boolean)

  const charNavMap: Record<string, { id: string; year: number; month: number | null; day: number | null }[]> = {}
  if (mentionedCharIds.length > 0) {
    const { data: charYarns } = await lore
      .from('lore_yarn_characters')
      .select('character_id, lore_yarns(id, year, month, day)')
      .in('character_id', mentionedCharIds)

    for (const row of (charYarns || [])) {
      const cid = (row as any).character_id
      const y = (row as any).lore_yarns
      if (!y) continue
      if (!charNavMap[cid]) charNavMap[cid] = []
      charNavMap[cid].push(y)
    }
    for (const cid of Object.keys(charNavMap)) {
      charNavMap[cid].sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year
        if ((a.month || 0) !== (b.month || 0)) return (a.month || 0) - (b.month || 0)
        return (a.day || 0) - (b.day || 0)
      })
    }
  }

  return NextResponse.json({
    yarn,
    myCharId: (myChar as any)?.id ?? null,
    isHearted: !!heartRow,
    concurCount: (concurs || []).length,
    hasConcurred: !!myConcur,
    validateCount: (validates || []).length,
    hasValidated: !!myValidate,
    sameDayYarns: sameDayYarns || [],
    sameEventYarns: sameEventYarns || [],
    charNavMap,
  })
}

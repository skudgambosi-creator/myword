import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { buildAlphabetDocument, type ExportPiece } from '@/lib/export/buildPdf'

export const maxDuration = 60

type ExportType = 'mine' | 'favourites' | 'all'

// Every query in this route deliberately never selects is_signed or
// signed_name — a downloaded file never carries a real name, regardless of
// whether the piece was originally signed on-site. "Mine" includes the
// requester's own catch-up pieces (their own work, no reason to hide it from
// themselves); "favourites" and "all" never include anyone's catch-up
// pieces — those stay author-only, on-site or off.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const type = (req.nextUrl.searchParams.get('type') || 'mine') as ExportType
  if (!['mine', 'favourites', 'all'].includes(type)) {
    return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
  }
  // 'all' is disabled for now — benchmarked at real production scale
  // (~258 pieces) at 121s+ for render alone, before network image-fetch
  // time, well past any viable synchronous serverless request. Needs an
  // async generate-and-email approach before it can ship; not built yet.
  // See the Patch 05 handover for the decision this is waiting on.
  if (type === 'all') {
    return NextResponse.json({ error: 'This export is not available yet' }, { status: 501 })
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const service = createServiceClient()

  const { data: group } = await service.from('groups').select('*').eq('id', params.id).maybeSingle()
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  if (!group.completed_at) return NextResponse.json({ error: 'This season has not closed yet' }, { status: 403 })

  const { data: membership } = await service
    .from('group_members').select('*')
    .eq('group_id', params.id).eq('user_id', user.id).maybeSingle()
  if (!membership) return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 })

  let pieces: ExportPiece[] = []
  let coverSubtitle = ''

  if (type === 'mine') {
    coverSubtitle = 'Your Collection'
    const { data: subs } = await service
      .from('submissions')
      .select('word_title, body_html, week_id, weeks(week_num, letter)')
      .eq('group_id', params.id)
      .eq('user_id', user.id)

    pieces = (subs || [])
      .slice()
      .sort((a: any, b: any) => (a.weeks?.week_num ?? 0) - (b.weeks?.week_num ?? 0))
      .map((s: any) => ({
        weekLabel: s.weeks?.letter || 'Epilogue',
        title: s.word_title,
        bodyHtml: s.body_html || '',
      }))
  }

  if (type === 'favourites') {
    coverSubtitle = 'Season Favourites'
    const { data: favs } = await service
      .from('favourites').select('submission_id, week_id').eq('group_id', params.id)

    // Exact same tally + tie-break as the on-site "community favourites"
    // logic (app/groups/[id]/page.tsx) — reused deliberately, not reinvented.
    const weekCounts: Record<string, Record<string, number>> = {}
    for (const f of favs || []) {
      if (!weekCounts[f.week_id]) weekCounts[f.week_id] = {}
      weekCounts[f.week_id][f.submission_id] = (weekCounts[f.week_id][f.submission_id] || 0) + 1
    }
    const topSubmissionIds: string[] = []
    for (const counts of Object.values(weekCounts)) {
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
      if (top) topSubmissionIds.push(top[0])
    }

    if (topSubmissionIds.length > 0) {
      const { data: subs } = await service
        .from('submissions')
        .select('word_title, body_html, week_id, weeks(week_num, letter), users(member_number)')
        .in('id', topSubmissionIds)
        .eq('is_late_catchup', false)

      pieces = (subs || [])
        .slice()
        .sort((a: any, b: any) => (a.weeks?.week_num ?? 0) - (b.weeks?.week_num ?? 0))
        .map((s: any) => ({
          weekLabel: s.weeks?.letter || 'Epilogue',
          title: s.word_title,
          bodyHtml: s.body_html || '',
          attribution: `Member #${s.users?.member_number ?? '?'}`,
        }))
    }
  }

  const doc = buildAlphabetDocument({
    docTitle: `${group.name} — ${coverSubtitle}`,
    coverTitle: group.name,
    coverSubtitle,
    pieces,
  })

  const buffer = await renderToBuffer(doc)
  const filename = `${group.name.replace(/[^a-zA-Z0-9]+/g, '-')}-${type}.pdf`

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

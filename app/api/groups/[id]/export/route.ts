import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { buildFlatDocument, type ExportPiece, type CompletionGrid } from '@/lib/export/buildPdf'

export const maxDuration = 60

type ExportType = 'mine' | 'favourites'

// Direct synchronous downloads — both benchmark at ~11s for a season's
// worth of pieces, comfortably inside Vercel's limits. The much bigger
// "all" export is a POST to ./all instead: it returns immediately and
// emails a download link once a chunked background job finishes, since a
// single request can't render the whole archive in time (see that route).
//
// Every query in this route deliberately never selects is_signed or
// signed_name — a downloaded file never carries a real name, regardless of
// whether the piece was originally signed on-site. "Mine" includes the
// requester's own catch-up pieces (their own work, no reason to hide it from
// themselves); "favourites" never includes anyone's catch-up pieces — those
// stay author-only, on-site or off.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const type = (req.nextUrl.searchParams.get('type') || 'mine') as ExportType
  if (!['mine', 'favourites'].includes(type)) {
    return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
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
  let completionGrid: CompletionGrid | undefined

  if (type === 'mine') {
    coverSubtitle = 'Your Collection'
    const { data: subs } = await service
      .from('submissions')
      .select('word_title, body_html, week_id, is_late_catchup, weeks(week_num, letter)')
      .eq('group_id', params.id)
      .eq('user_id', user.id)

    const sorted = (subs || [])
      .slice()
      .sort((a: any, b: any) => (a.weeks?.week_num ?? 0) - (b.weeks?.week_num ?? 0))

    pieces = sorted.map((s: any) => ({
      weekLabel: s.weeks?.letter || 'Epilogue',
      title: s.word_title,
      bodyHtml: s.body_html || '',
    }))

    // The site's own A–Z progress grid — submitted ON TIME vs. missed
    // (catch-up pieces don't count as "submitted" here either, matching
    // app/groups/[id]/page.tsx's own submittedWeekNums logic exactly),
    // weeks 1–26 only, reproduced as the export's opening page.
    const submittedLetters = new Set(
      sorted.filter((s: any) => !s.is_late_catchup && s.weeks?.letter).map((s: any) => s.weeks.letter as string)
    )
    completionGrid = { submittedLetters }
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

  const buffer = await buildFlatDocument({
    docTitle: `${group.name} · ${coverSubtitle}`,
    coverTitle: group.name,
    coverSubtitle,
    pieces,
    completionGrid,
  })

  const filename = `${group.name.replace(/[^a-zA-Z0-9]+/g, '-')}-${type}.pdf`

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

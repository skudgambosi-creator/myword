import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Starts a chunked background export of the group's entire archive.
// Returns immediately — the actual PDF gets built by /api/jobs/export/process
// across as many batched invocations as it takes (see EXPORT_BATCH_SIZE),
// and the requester gets a download link by email when it's done. A direct
// synchronous download isn't viable here: benchmarked at 121s+ to render a
// season's full ~258 pieces, well past Vercel's 60s Hobby ceiling.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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

  // A user already has an export in flight for this group — don't start a
  // second one, just tell them it's coming.
  const { data: existing } = await service
    .from('export_jobs').select('id, status')
    .eq('group_id', params.id).eq('user_id', user.id).eq('export_type', 'all')
    .in('status', ['pending', 'processing'])
    .maybeSingle()
  if (existing) return NextResponse.json({ ok: true, jobId: existing.id, alreadyRunning: true })

  // Same ordering as the shared-archive READ view: week number, then title.
  const { data: subs } = await service
    .from('submissions')
    .select('id, word_title, week_id, weeks(week_num)')
    .eq('group_id', params.id)
    .eq('is_late_catchup', false)

  const orderedIds = (subs || [])
    .slice()
    .sort((a: any, b: any) => {
      const d = (a.weeks?.week_num ?? 0) - (b.weeks?.week_num ?? 0)
      return d !== 0 ? d : (a.word_title || '').localeCompare(b.word_title || '')
    })
    .map((s: any) => s.id)

  const { data: job, error } = await service
    .from('export_jobs')
    .insert({
      group_id: params.id,
      user_id: user.id,
      export_type: 'all',
      status: 'pending',
      piece_ids: orderedIds,
      next_index: 0,
    })
    .select('id')
    .single()

  if (error || !job) return NextResponse.json({ error: error?.message || 'Failed to start export' }, { status: 500 })

  const workerUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/export/process`
  waitUntil(
    fetch(workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.CRON_SECRET}` },
      body: JSON.stringify({ jobId: job.id }),
    }).catch(() => {})
  )

  return NextResponse.json({ ok: true, jobId: job.id })
}

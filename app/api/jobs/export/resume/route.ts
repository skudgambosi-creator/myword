import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { createServiceClient } from '@/lib/supabase/server'

export const maxDuration = 60

// Safety-net cron, once daily (Hobby plan's minimum cron interval — see
// vercel.json). The normal path is self-chaining waitUntil calls between
// batches, which should finish an export within minutes; this exists purely
// to catch a job whose chain broke somewhere (a deploy mid-job, a dropped
// outbound fetch, etc.) and nudge it forward again. Stuck = still
// pending/processing and untouched for 15+ minutes.
export async function GET(req: NextRequest) {
  return POST(req)
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString()

  const { data: stuck } = await service
    .from('export_jobs')
    .select('id')
    .in('status', ['pending', 'processing'])
    .lt('updated_at', cutoff)
    .limit(5)

  const workerUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/export/process`
  for (const job of stuck || []) {
    waitUntil(
      fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.CRON_SECRET}` },
        body: JSON.stringify({ jobId: job.id }),
      }).catch(() => {})
    )
  }

  return NextResponse.json({ resumed: stuck?.length || 0 })
}

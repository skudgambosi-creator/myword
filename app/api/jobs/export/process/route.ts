import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { buildAllBatchDocument, type ExportPiece } from '@/lib/export/buildPdf'
import { mergePdfBuffers } from '@/lib/export/mergePdf'
import { EXPORT_BATCH_SIZE, EXPORT_BUCKET } from '@/lib/export/constants'

export const maxDuration = 60

// Internal worker, not user-facing — processes exactly one batch of an
// "all" export job, then either chains itself for the next batch (via
// waitUntil, same as the route that starts the job) or finalises and emails
// a signed download link once every piece has been rendered and merged in.
// Never selects is_signed/signed_name, same discipline as every other
// export query — nothing that leaves the site carries a real name.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { jobId } = await req.json()
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

  const service = createServiceClient()

  const { data: job } = await service.from('export_jobs').select('*').eq('id', jobId).maybeSingle()
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  if (job.status === 'done' || job.status === 'failed') return NextResponse.json({ ok: true, skipped: job.status })

  try {
    await service.from('export_jobs').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', jobId)

    const batchIds: string[] = job.piece_ids.slice(job.next_index, job.next_index + EXPORT_BATCH_SIZE)

    const { data: subs } = await service
      .from('submissions')
      .select('id, word_title, body_html, weeks(week_num, letter), users(member_number)')
      .in('id', batchIds)

    // .in() doesn't preserve input order — rebuild it from the job's
    // deterministic piece_ids ordering.
    const byId = new Map((subs || []).map((s: any) => [s.id, s]))
    const pieces: ExportPiece[] = batchIds
      .map(id => byId.get(id))
      .filter(Boolean)
      .map((s: any) => ({
        weekLabel: s.weeks?.letter || 'Epilogue',
        title: s.word_title,
        bodyHtml: s.body_html || '',
        attribution: `Member #${s.users?.member_number ?? '?'}`,
      }))

    const { data: group } = await service.from('groups').select('name').eq('id', job.group_id).maybeSingle()
    const groupName = group?.name || 'The Alphabet Project'

    const { buffer: batchBuffer, lastLetter } = await buildAllBatchDocument({
      docTitle: `${groupName} · The Full Archive`,
      coverTitle: groupName,
      coverSubtitle: 'The Full Archive',
      pieces,
      withCover: job.next_index === 0,
      leadingLetterCarry: job.last_letter,
    })

    const storagePath = `${jobId}.pdf`
    let mergedBuffer: Buffer
    if (job.next_index === 0) {
      mergedBuffer = batchBuffer
    } else {
      const { data: existingFile } = await service.storage.from(EXPORT_BUCKET).download(storagePath)
      const existingBuffer = existingFile ? Buffer.from(await existingFile.arrayBuffer()) : null
      mergedBuffer = await mergePdfBuffers(existingBuffer, batchBuffer)
    }

    await service.storage.from(EXPORT_BUCKET).upload(storagePath, mergedBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

    const nextIndex = job.next_index + batchIds.length
    const isDone = nextIndex >= job.piece_ids.length

    await service.from('export_jobs').update({
      next_index: nextIndex,
      status: isDone ? 'done' : 'processing',
      storage_path: isDone ? storagePath : null,
      last_letter: lastLetter,
      updated_at: new Date().toISOString(),
    }).eq('id', jobId)

    if (isDone) {
      const { data: requester } = await service.from('users').select('email').eq('id', job.user_id).maybeSingle()
      if (requester?.email) {
        const { data: signed } = await service.storage.from(EXPORT_BUCKET).createSignedUrl(storagePath, 60 * 60 * 24 * 7)
        await sendEmail({
          to: requester.email,
          subject: `Your ${groupName} archive is ready`,
          html: `
            <div style="font-family: 'Inconsolata', 'Courier New', Courier, monospace; max-width: 600px; margin: 0 auto; padding: 24px;">
              <p style="font-size: 15px; line-height: 1.8;">The full archive is ready to download.</p>
              ${signed?.signedUrl
                ? `<a href="${signed.signedUrl}" style="display: inline-block; background: #C85A5A; color: #fff; padding: 12px 24px; text-decoration: none; text-transform: uppercase; letter-spacing: 0.05em; font-size: 12px; font-weight: bold;">DOWNLOAD →</a>
                   <p style="font-size: 11px; color: #999; margin-top: 24px;">This link expires in 7 days.</p>`
                : `<p style="font-size: 13px; color: #999;">Something went wrong generating the download link. Reply to this email and we'll sort it out.</p>`
              }
            </div>
          `,
        })
      }
    } else {
      const workerUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/export/process`
      waitUntil(
        fetch(workerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.CRON_SECRET}` },
          body: JSON.stringify({ jobId }),
        }).catch(() => {})
      )
    }

    return NextResponse.json({ ok: true, nextIndex, done: isDone })
  } catch (e: any) {
    await service.from('export_jobs').update({
      status: 'failed',
      error: e?.message || 'Unknown error',
      updated_at: new Date().toISOString(),
    }).eq('id', jobId)
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}

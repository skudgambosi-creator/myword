import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// POST body: { weekNum: 1, emails: ["a@b.com", "c@d.com"] }
// Resends the reveal email for a given week to specific addresses only.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { weekNum, emails, customBody } = await req.json()
  if (!weekNum || !emails?.length) {
    return NextResponse.json({ error: 'weekNum and emails required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: week } = await supabase
    .from('weeks')
    .select('*, groups(*)')
    .eq('week_num', weekNum)
    .eq('group_id', '00000000-0000-0000-0000-000000000001')
    .single()

  if (!week) return NextResponse.json({ error: 'Week not found' }, { status: 404 })

  const group = week.groups as any

  const { data: members } = await supabase
    .from('group_members')
    .select('user_id, users(*)')
    .eq('group_id', group.id)

  const { data: submissions } = await supabase
    .from('submissions')
    .select('*, users(*)')
    .eq('week_id', week.id)
    .eq('is_late_catchup', false)

  const onTimeSubmissions = (submissions || []).sort(() => Math.random() - 0.5)
  const notSubmitted = (members || []).filter((m: any) => !onTimeSubmissions.find((s: any) => s.user_id === m.user_id))
  const archiveUrl = `${process.env.NEXT_PUBLIC_APP_URL}/groups/${group.id}/submissions`

  const REVEAL_BODIES: Record<number, string> = {
    1: 'Easy right? Enjoy yourselves:',
    2: 'Scrumptious. Give us another one:',
  }
  const body = customBody || REVEAL_BODIES[week.week_num] || 'Here are this week\'s submissions:'

  const submissionsHtml = onTimeSubmissions.map((s: any) => {
    const name = s.is_signed ? (s.signed_name || `Member #${s.users?.member_number}`) : `Member #${s.users?.member_number}`
    const grafs = (s.body_html.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [])
      .map((p: string) => p
        .replace(/<\/?p[^>]*>/gi, '')
        .replace(/<img[^>]*>/gi, '')
        .replace(/<audio[^>]*>[\s\S]*?<\/audio>/gi, '')
        .trim()
      )
      .filter((p: string) => p.replace(/<[^>]+>/g, '').trim())
    const truncated = grafs.length > 6
    const preview = grafs.slice(0, 6).join('<br>') + (truncated ? '...' : '')
    return `
      <div style="border-top: 2px solid #000; padding: 24px 0;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #999; margin-bottom: 4px;">
          ${name} · ${s.word_count} words
        </div>
        <div style="font-size: 20px; font-weight: bold; margin-bottom: 12px;">${s.word_title}</div>
        <div style="font-size: 13px; color: #444; line-height: 1.8;">${preview}${truncated ? '...' : ''}</div>
        <a href="${archiveUrl}" style="font-size: 12px; color: #CC0000; margin-top: 8px; display: inline-block;">Read full piece →</a>
      </div>
    `
  }).join('')

  const missedHtml = notSubmitted.length > 0 ? `
    <p style="font-size: 12px; color: #999; margin-top: 24px;">
      Didn't submit this week: ${notSubmitted.map((m: any) => `Member #${(m.users as any)?.member_number}`).join(', ')}
    </p>
  ` : ''

  const html = `
    <div style="font-family: 'Courier New', monospace; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #000;">
      <h1 style="font-size: 32px; font-weight: bold; margin-bottom: 4px;">[ MY WORD ]</h1>
      <p style="font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 32px;">
        Week ${week.week_num} of 26 · Letter ${week.letter}
      </p>
      <p style="font-size: 15px; line-height: 1.8; margin-bottom: 32px;">${body}</p>
      ${submissionsHtml}
      ${missedHtml}
      <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 24px;">
        <a href="${archiveUrl}" style="display: inline-block; background: #CC0000; color: #fff; padding: 12px 24px; font-family: 'Courier New', monospace; font-size: 12px; font-weight: bold; text-decoration: none; text-transform: uppercase; letter-spacing: 0.05em;">
          READ IN FULL →
        </a>
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 40px 0 24px;" />
      <p style="font-size: 11px; color: #999;">— My Word · <a href="https://www.my-word.co.uk" style="color: #999;">my-word.co.uk</a></p>
    </div>
  `

  const sent: string[] = []
  const failed: string[] = []

  for (const email of emails) {
    await sleep(600)
    try {
      await sendEmail({ to: email, subject: `The Alphabet Project — ${week.letter}`, html })
      sent.push(email)
    } catch (e) {
      failed.push(email)
    }
  }

  return NextResponse.json({ sent, failed })
}

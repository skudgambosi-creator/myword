import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date()

  const { data: weeksToReveal } = await supabase
    .from('weeks')
    .select('*, groups(*)')
    .lt('closes_at', now.toISOString())
    .is('revealed_at', null)

  if (!weeksToReveal?.length) {
    return NextResponse.json({ message: 'No weeks to reveal' })
  }

  for (const week of weeksToReveal) {
    const group = week.groups as any
    await revealWeek(supabase, week, group, resend)
  }

  return NextResponse.json({ revealed: weeksToReveal.length })
}

async function revealWeek(supabase: any, week: any, group: any, resend: any) {
  await supabase
    .from('weeks')
    .update({ revealed_at: new Date().toISOString() })
    .eq('id', week.id)

  const { data: members } = await supabase
    .from('group_members')
    .select('user_id, users(*)')
    .eq('group_id', group.id)

  const memberIds = members?.map((m: any) => m.user_id) || []

  const { data: submissions } = await supabase
    .from('submissions')
    .select('*, users(*)')
    .eq('week_id', week.id)

  // Write scores
  for (const memberId of memberIds) {
    const sub = submissions?.find((s: any) => s.user_id === memberId && !s.is_late_catchup)
    await supabase.from('scores').upsert({
      group_id: group.id,
      user_id: memberId,
      week_id: week.id,
      score: sub ? 1 : 0,
      is_late: false,
    })
  }

  if (week.week_num === 26) {
    await supabase
      .from('groups')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', group.id)
    await sendFinalEmail(supabase, week, group, members, resend)
    return
  }

  await sendRevealEmail(week, group, submissions || [], members || [], resend)
}

async function sendRevealEmail(week: any, group: any, submissions: any[], members: any[], resend: any) {
  const onTimeSubmissions = submissions.filter(s => !s.is_late_catchup)
  const notSubmitted = members.filter(m => !onTimeSubmissions.find(s => s.user_id === m.user_id))

  const archiveUrl = `${process.env.NEXT_PUBLIC_APP_URL}/groups/${group.id}/submissions`

  const submissionsHtml = onTimeSubmissions.map(s => {
    const name = s.users?.identity_mode === 'anonymous'
      ? `No-name ${s.users?.noname_number}` : s.users?.display_name
    const preview = s.body_html.replace(/<[^>]+>/g, '').slice(0, 300)
    return `
      <div style="border-top: 2px solid #000; padding: 24px 0;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #999; margin-bottom: 4px;">
          ${name} · ${s.word_count} words
        </div>
        <div style="font-size: 20px; font-weight: bold; margin-bottom: 12px;">${s.word_title}</div>
        <div style="font-size: 13px; color: #444; line-height: 1.8;">${preview}${s.body_html.replace(/<[^>]+>/g, '').length > 300 ? '...' : ''}</div>
        <a href="${archiveUrl}" style="font-size: 12px; color: #CC0000; margin-top: 8px; display: inline-block;">Read full piece →</a>
      </div>
    `
  }).join('')

  const missedHtml = notSubmitted.length > 0 ? `
    <p style="font-size: 12px; color: #999; margin-top: 24px;">
      Didn't submit this week: ${notSubmitted.map((m: any) => {
        const u = m.users as any
        return u?.identity_mode === 'anonymous' ? `No-name ${u?.noname_number}` : u?.display_name
      }).join(', ')}
    </p>
  ` : ''

  const memberEmails = members.map(m => (m.users as any)?.email).filter(Boolean)

  for (const email of memberEmails) {
    await resend.emails.send({
      from: 'My Word <hello@my-word.co.uk>',
      to: email,
      subject: `MY WORD — Week ${week.letter}`,
      html: `
        <div style="font-family: 'Courier New', monospace; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #000;">
          <h1 style="font-size: 32px; font-weight: bold; margin-bottom: 4px;">[ MY WORD ]</h1>
          <p style="font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 32px;">
            Week ${week.week_num} of 26 · Letter ${week.letter}
          </p>

          <p style="font-size: 15px; line-height: 1.8; margin-bottom: 8px;">Wagwan and Yoza,</p>
          <p style="font-size: 15px; line-height: 1.8; margin-bottom: 32px;">
            Well done. Here are your words for Letter ${week.letter}:
          </p>

          ${submissionsHtml}

          ${missedHtml}

          <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 24px;">
            <a href="${archiveUrl}" style="display: inline-block; background: #CC0000; color: #fff; padding: 12px 24px; font-family: 'Courier New', monospace; font-size: 12px; font-weight: bold; text-decoration: none; text-transform: uppercase; letter-spacing: 0.05em;">
              READ IN FULL →
            </a>
          </div>

          <p style="font-size: 13px; color: #555; margin-top: 32px;">See you next week x</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="font-size: 11px; color: #999;">— My Word</p>
        </div>
      `
    })
  }
}

async function sendFinalEmail(supabase: any, week: any, group: any, members: any[], resend: any) {
  const { data: allScores } = await supabase
    .from('scores').select('*, users(*)').eq('group_id', group.id)

  const memberStats = members.map((m: any) => {
    const user = m.users as any
    const total = (allScores || []).filter((s: any) => s.user_id === m.user_id)
      .reduce((sum: number, s: any) => sum + s.score, 0)
    const name = user?.identity_mode === 'anonymous' ? `No-name ${user?.noname_number}` : user?.display_name
    return { name, total, email: user?.email }
  }).sort((a: any, b: any) => b.total - a.total)

  const archiveUrl = `${process.env.NEXT_PUBLIC_APP_URL}/groups/${group.id}/submissions`
  const memberEmails = memberStats.map((m: any) => m.email).filter(Boolean)

  const scoreRows = memberStats.map((m: any, i: number) =>
    `<tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${i + 1}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-weight: bold;">${m.name}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${m.total} / 26</td>
    </tr>`
  ).join('')

  for (const email of memberEmails) {
    await resend.emails.send({
      from: 'My Word <hello@my-word.co.uk>',
      to: email,
      subject: `MY WORD — A to Z. We made it.`,
      html: `
        <div style="font-family: 'Courier New', monospace; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #000;">
          <h1 style="font-size: 48px; font-weight: bold; margin-bottom: 4px;">A — Z</h1>
          <p style="font-size: 14px; color: #666; margin-bottom: 32px;">The Alphabet Project is complete.</p>

          <p style="font-size: 15px; line-height: 1.8; margin-bottom: 32px;">
            26 weeks. 26 letters. You did it. Every single one of you.<br/>Here's how it ended up:
          </p>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px; border: 2px solid #000;">
            <thead>
              <tr style="background: #000; color: #fff;">
                <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase;">#</th>
                <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase;">Member</th>
                <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase;">Score</th>
              </tr>
            </thead>
            <tbody>${scoreRows}</tbody>
          </table>

          <a href="${archiveUrl}" style="display: inline-block; background: #CC0000; color: #fff; padding: 14px 28px; font-family: 'Courier New', monospace; font-size: 13px; font-weight: bold; text-decoration: none; text-transform: uppercase; letter-spacing: 0.05em;">
            BROWSE THE FULL ARCHIVE →
          </a>

          <p style="font-size: 13px; color: #555; margin-top: 32px;">See you next season x</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="font-size: 11px; color: #999;">— My Word</p>
        </div>
      `
    })
  }
}

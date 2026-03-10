import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// This endpoint is called by a Supabase pg_cron job every Wednesday at 00:00 UTC
// Protect it with a secret header
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date()

  // Find all weeks that should be revealed (closes_at has passed, not yet revealed)
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
  // Mark week as revealed
  await supabase
    .from('weeks')
    .update({ revealed_at: new Date().toISOString() })
    .eq('id', week.id)

  // Get all group members
  const { data: members } = await supabase
    .from('group_members')
    .select('user_id, users(*)')
    .eq('group_id', group.id)

  const memberIds = members?.map((m: any) => m.user_id) || []

  // Get submissions for this week
  const { data: submissions } = await supabase
    .from('submissions')
    .select('*, users(*)')
    .eq('week_id', week.id)

  // Write scores — 1 for submitted, 0 for not
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

  // Also score any late catch-up submissions as 0
  const lateSubs = submissions?.filter((s: any) => s.is_late_catchup) || []
  for (const sub of lateSubs) {
    await supabase.from('scores').upsert({
      group_id: group.id,
      user_id: sub.user_id,
      week_id: week.id,
      score: 0,
      is_late: true,
    })
  }

  // Check if this was Week 26 — if so, complete the group
  if (week.week_num === 26) {
    await supabase
      .from('groups')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', group.id)

    await sendFinalEmail(supabase, group, members, resend)
    return
  }

  // Send reveal email
  await sendRevealEmail(supabase, week, group, submissions || [], members || [], resend)
}

async function sendRevealEmail(supabase: any, week: any, group: any, submissions: any[], members: any[], resend: any) {
  const submissionList = submissions
    .filter(s => !s.is_late_catchup)
    .map(s => {
      const name = s.users?.identity_mode === 'anonymous'
        ? `No-name ${s.users?.noname_number}` : s.users?.display_name
      return `<tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-weight: bold;">${name}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${s.word_title}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; color: #999;">${s.word_count}w</td>
      </tr>`
    }).join('')

  const notSubmitted = members
    .filter(m => !submissions.find(s => s.user_id === m.user_id && !s.is_late_catchup))
    .map(m => {
      const u = m.users as any
      return u?.identity_mode === 'anonymous' ? `No-name ${u?.noname_number}` : u?.display_name
    })

  const archiveUrl = `${process.env.NEXT_PUBLIC_APP_URL}/groups/${group.id}/submissions`

  const memberEmails = members
    .map(m => (m.users as any)?.email)
    .filter(Boolean)

  for (const email of memberEmails) {
    await resend.emails.send({
      from: 'My Word <noreply@myword.vercel.app>',
      to: email,
      subject: `My Word — Letter ${week.letter} revealed (Week ${week.week_num} of 26)`,
      html: `
        <div style="font-family: 'Courier New', monospace; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #000;">
          <h1 style="font-size: 28px; font-weight: bold; border-bottom: 3px solid #000; padding-bottom: 12px;">
            [ MY WORD ] — Letter ${week.letter} Revealed
          </h1>
          <p style="font-size: 13px; color: #666; margin-bottom: 24px;">
            ${group.name} · Week ${week.week_num} of 26
          </p>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; border: 2px solid #000;">
            <thead>
              <tr style="background: #000; color: #fff;">
                <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;">Member</th>
                <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;">Word</th>
                <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;">Words</th>
              </tr>
            </thead>
            <tbody>${submissionList}</tbody>
          </table>

          ${notSubmitted.length > 0 ? `
            <p style="font-size: 12px; color: #999; margin-bottom: 24px;">
              Did not submit: ${notSubmitted.join(', ')}
            </p>
          ` : ''}

          <a href="${archiveUrl}" style="display: inline-block; background: #CC0000; color: #fff; padding: 12px 24px; font-family: 'Courier New', monospace; font-size: 13px; font-weight: bold; text-decoration: none; text-transform: uppercase; letter-spacing: 0.05em;">
            READ ALL SUBMISSIONS →
          </a>

          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
          <p style="font-size: 11px; color: #999;">— My Word · ${group.name}</p>
        </div>
      `
    })
  }
}

async function sendFinalEmail(supabase: any, group: any, members: any[], resend: any) {
  const { data: allScores } = await supabase
    .from('scores')
    .select('*, users(*)')
    .eq('group_id', group.id)

  const memberStats = members.map((m: any) => {
    const user = m.users as any
    const userScores = allScores?.filter((s: any) => s.user_id === m.user_id) || []
    const total = userScores.reduce((sum: number, s: any) => sum + s.score, 0)
    const name = user?.identity_mode === 'anonymous' ? `No-name ${user?.noname_number}` : user?.display_name
    return { name, total, email: user?.email }
  }).sort((a: any, b: any) => b.total - a.total)

  const scoreTable = memberStats.map((m: any, i: number) =>
    `<tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${i + 1}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-weight: bold;">${m.name}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${m.total} / 26</td>
    </tr>`
  ).join('')

  const archiveUrl = `${process.env.NEXT_PUBLIC_APP_URL}/groups/${group.id}/submissions`
  const memberEmails = memberStats.map((m: any) => m.email).filter(Boolean)

  for (const email of memberEmails) {
    await resend.emails.send({
      from: 'My Word <noreply@myword.vercel.app>',
      to: email,
      subject: `My Word — The Alphabet Project is complete`,
      html: `
        <div style="font-family: 'Courier New', monospace; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #000;">
          <h1 style="font-size: 32px; font-weight: bold; border-bottom: 3px solid #000; padding-bottom: 12px;">
            A — Z
          </h1>
          <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 8px;">
            The Alphabet Project is complete.
          </h2>
          <p style="font-size: 14px; color: #555; margin-bottom: 32px;">
            ${group.name} · 26 weeks · ${memberStats.length} members
          </p>

          <p style="font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px;">
            Final Scores
          </p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px; border: 2px solid #000;">
            <thead>
              <tr style="background: #000; color: #fff;">
                <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;">#</th>
                <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;">Member</th>
                <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;">Score</th>
              </tr>
            </thead>
            <tbody>${scoreTable}</tbody>
          </table>

          <a href="${archiveUrl}" style="display: inline-block; background: #CC0000; color: #fff; padding: 14px 28px; font-family: 'Courier New', monospace; font-size: 14px; font-weight: bold; text-decoration: none; text-transform: uppercase; letter-spacing: 0.05em;">
            BROWSE THE FULL ARCHIVE →
          </a>

          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
          <p style="font-size: 11px; color: #999;">— My Word</p>
        </div>
      `
    })
  }
}

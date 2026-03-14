import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

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
    await revealWeek(supabase, week, group)
  }

  return NextResponse.json({ revealed: weeksToReveal.length })
}

async function revealWeek(supabase: any, week: any, group: any) {
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
    await sendFinalEmail(supabase, week, group, members)
    return
  }

  await sendRevealEmail(week, group, submissions || [], members || [])
}

const REVEAL_BODIES: Record<number, string> = {
  1:  'Easy right? Enjoy yourselves:',
  2:  'Scrumptious. Give us another one:',
  3:  'Little time and little commitments innit:',
  4:  'Some of yous need to settle down writing outrageous oi:',
  5:  'Lovely. Just good ae. Mm:',
  6:  'Quarters, fractions, bits. You\'ve cut up a fourth of 2026 and my FUCK does it read well:',
  7:  'Well done. Have a zonk to your odd shapes for a minute:',
  8:  'WELL. WELL. WELL. Mischief, trouble, and misc.',
  9:  'Whoever wrote about the royal fuck chair deserves more points. Risky positions and that. Barely fucking English.',
  10: 'SILLY!!!!!!',
  11: 'Steely Dan, do it again.',
  12: 'Oh. My. Word.',
  13: 'I had a drug dealer once called Roibos. He sold me bags of "permanent marker." Now I sell bags, and you can\'t unsay shit. Good fun becomes memorable in good terms, you don\'t need to fuss with the linguistics. Love.',
  14: 'BINTERESTAX.',
  15: 'Seriously pungent this week, all sorts of deep and real good lingo.',
  16: 'Fuuuuuuuuuuuck mate say less. Absolute victory streak.',
  17: 'Some of this shit sticky and wet like a couple dudes.',
  18: 'Memories don\'t need rumination, you gave them good gloss. And got saucy with the gossip. Naughty.',
  19: 'What\'s the riskiest thing coming out of your mouth these days? Yes.',
  20: '2 + 0 + 2 + 6 = 10/10. Good year blimps.',
  21: 'You can\'t say you never made a mark, it\'s all smeared.',
  22: 'Mins awae bo. Neale dea like bradda ben.',
  23: 'I didn\'t expect you to make it honest fun. You\'re nearly done even.',
  24: 'Would you have done it differently?',
  25: 'Leave the queen in the wallet. No wolliez.',
  26: 'Take part in your becoming. You shine through each other. You can write another one down and get down with another run of the funnies. Until next time. Well done. x',
}

async function sendRevealEmail(week: any, group: any, submissions: any[], members: any[]) {
  const onTimeSubmissions = submissions.filter(s => !s.is_late_catchup)
  const notSubmitted = members.filter(m => !onTimeSubmissions.find(s => s.user_id === m.user_id))

  const archiveUrl = `${process.env.NEXT_PUBLIC_APP_URL}/groups/${group.id}/submissions`
  const body = REVEAL_BODIES[week.week_num] || 'Here are this week\'s submissions:'

  const submissionsHtml = onTimeSubmissions.map(s => {
    const name = s.is_signed ? (s.signed_name || `Member #${s.users?.member_number}`) : `Member #${s.users?.member_number}`
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
        return `Member #${u?.member_number}`
      }).join(', ')}
    </p>
  ` : ''

  const memberEmails = members.map(m => (m.users as any)?.email).filter(Boolean)

  for (const email of memberEmails) {
    await sendEmail({
      to: email,
      subject: `The Alphabet Project — ${week.letter}`,
      html: `
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
    })
  }
}

async function sendFinalEmail(supabase: any, week: any, group: any, members: any[]) {
  const { data: allScores } = await supabase
    .from('scores').select('*, users(*)').eq('group_id', group.id)

  const memberStats = members.map((m: any) => {
    const user = m.users as any
    const total = (allScores || []).filter((s: any) => s.user_id === m.user_id)
      .reduce((sum: number, s: any) => sum + s.score, 0)
    const name = `Member #${user?.member_number}`
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
    await sendEmail({
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

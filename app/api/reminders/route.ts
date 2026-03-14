import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

export async function GET(req: NextRequest) {
  return POST(req)
}

// Called daily by cron — sends reminders on Thu, Sun, Tue
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=Sun, 1=Mon, 2=Tue, 4=Thu

  // Only send on Thursday (4), Sunday (0), Tuesday (2)
  if (![0, 2, 4].includes(dayOfWeek)) {
    return NextResponse.json({ message: 'Not a reminder day' })
  }

  const reminderType = dayOfWeek === 4 ? 'first' : dayOfWeek === 0 ? 'second' : 'last'

  // Find all currently open weeks
  const { data: openWeeks } = await supabase
    .from('weeks')
    .select('*, groups(*)')
    .lte('opens_at', now.toISOString())
    .gt('closes_at', now.toISOString())
    .is('revealed_at', null)

  if (!openWeeks?.length) return NextResponse.json({ message: 'No open weeks' })

  for (const week of openWeeks) {
    const group = week.groups as any

    // Get members who haven't submitted
    const { data: members } = await supabase
      .from('group_members')
      .select('user_id, users(*)')
      .eq('group_id', group.id)

    const { data: submissions } = await supabase
      .from('submissions')
      .select('user_id')
      .eq('week_id', week.id)
      .eq('is_late_catchup', false)

    const submittedIds = new Set(submissions?.map(s => s.user_id))

    const nonSubmitters = members?.filter(m => !submittedIds.has(m.user_id)) || []

    for (const member of nonSubmitters) {
      const user = member.users as any
      if (!user?.email) continue

      const submitUrl = `${process.env.NEXT_PUBLIC_APP_URL}/groups/${group.id}/submit`

      const subjects: Record<string, string> = {
        first: `My Word — Letter ${week.letter} is open. Submit by Tuesday.`,
        second: `My Word — Letter ${week.letter} — 2 days remaining`,
        last: `My Word — Last chance: Letter ${week.letter} closes tonight`,
      }

      const bodies: Record<string, string> = {
        first: `Week ${week.week_num} of 26 is open. This week's letter is <strong>${week.letter}</strong>.<br><br>You have until Tuesday 23:59 to submit.`,
        second: `Just a reminder — Letter <strong>${week.letter}</strong> is still open. You have 2 days left.`,
        last: `Letter <strong>${week.letter}</strong> closes tonight at 23:59. This is your last chance to submit.`,
      }

      await sendEmail({
        to: user.email,
        subject: subjects[reminderType],
        html: `
          <div style="font-family: 'Courier New', monospace; max-width: 520px; margin: 0 auto; padding: 40px 20px; color: #000;">
            <h1 style="font-size: 24px; font-weight: bold; border-bottom: 3px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
              [ MY WORD ]
            </h1>
            <p style="font-size: 14px; margin-bottom: 24px;">${bodies[reminderType]}</p>
            <a href="${submitUrl}" style="display: inline-block; background: #CC0000; color: #fff; padding: 12px 24px; font-family: 'Courier New', monospace; font-size: 13px; font-weight: bold; text-decoration: none; text-transform: uppercase; letter-spacing: 0.05em;">
              SUBMIT LETTER ${week.letter} →
            </a>
            <hr style="border: none; border-top: 1px solid #eee; margin: 28px 0;" />
            <p style="font-size: 11px; color: #999;">— My Word · ${group.name}</p>
          </div>
        `
      })
    }
  }

  return NextResponse.json({ success: true })
}

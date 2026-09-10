import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

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

    // The epilogue (letter-less week) is "the collection week", not a
    // lettered submission window — it needs its own copy and its own
    // destination (the collection page, not the single-piece submit flow),
    // rather than falling through to "Letter ${week.letter}" and rendering
    // the literal string "null".
    const isEpilogue = !week.letter
    const destUrl = isEpilogue
      ? `${process.env.NEXT_PUBLIC_APP_URL}/groups/${group.id}/collection`
      : `${process.env.NEXT_PUBLIC_APP_URL}/groups/${group.id}/submit`

    const subjects: Record<string, string> = isEpilogue ? {
      first: `My Word · The Collection Week is open`,
      second: `My Word · The Collection Week · a few days left`,
      last: `My Word · Last chance: the Collection Week closes tomorrow`,
    } : {
      first: `My Word · Letter ${week.letter} is open. Submit by Wednesday.`,
      second: `My Word · Letter ${week.letter} · 3 days remaining`,
      last: `My Word · Last chance: Letter ${week.letter} closes tomorrow`,
    }

    const bodies: Record<string, string> = isEpilogue ? {
      first: `The Collection Week is open. No letter this time, just your alphabet — add anything you missed, no cap, and write your epilogue whenever you're ready.`,
      second: `Just a reminder: the Collection Week is still open, if you'd like to fill out your set or write your epilogue.`,
      last: `The Collection Week closes tomorrow at 23:59. Last chance to add anything you missed or write your epilogue.`,
    } : {
      first: `Week ${week.week_num} of 26 is open. This week's letter is <strong>${week.letter}</strong>.<br><br>You have until Wednesday 23:59 to submit.`,
      second: `Just a reminder: Letter <strong>${week.letter}</strong> is still open. You have 3 days left.`,
      last: `Letter <strong>${week.letter}</strong> closes tomorrow at 23:59. This is your last chance to submit.`,
    }

    const ctaLabel = isEpilogue ? 'OPEN THE COLLECTION →' : `SUBMIT LETTER ${week.letter} →`

    for (const member of nonSubmitters) {
      const user = member.users as any
      if (!user?.email) continue

      await sleep(600)
      await sendEmail({
        to: user.email,
        subject: subjects[reminderType],
        html: `
          <style>@import url('https://fonts.googleapis.com/css2?family=Inconsolata:wght@400;700&display=swap');</style>
          <div style="font-family: 'Inconsolata', 'Courier New', Courier, monospace; max-width: 520px; margin: 0 auto; padding: 40px 20px; color: #000;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="https://www.my-word.co.uk/saturn.svg" alt="My Word" width="80" height="auto" style="display: inline-block;" />
            </div>
            <p style="font-size: 14px; margin-bottom: 24px;">${bodies[reminderType]}</p>
            <a href="${destUrl}" style="display: inline-block; background: #C85A5A; color: #fff; padding: 12px 24px; font-family: 'Inconsolata', 'Courier New', Courier, monospace; font-size: 13px; font-weight: bold; text-decoration: none; text-transform: uppercase; letter-spacing: 0.05em;">
              ${ctaLabel}
            </a>
            <hr style="border: none; border-top: 1px solid #eee; margin: 28px 0;" />
            <p style="font-size: 11px; color: #999;">My Word · ${group.name}</p>
          </div>
        `
      })
    }
  }

  return NextResponse.json({ success: true })
}

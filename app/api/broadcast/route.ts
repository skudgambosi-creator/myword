import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

const ALPHABET_PROJECT_ID = '00000000-0000-0000-0000-000000000001'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const { data: members } = await supabase
    .from('group_members')
    .select('user_id, users(*)')
    .eq('group_id', ALPHABET_PROJECT_ID)

  if (!members?.length) return NextResponse.json({ error: 'No members' }, { status: 400 })

  const groupUrl = `${process.env.NEXT_PUBLIC_APP_URL}/groups/${ALPHABET_PROJECT_ID}`
  let sent = 0

  for (const member of members) {
    const user = member.users as any
    if (!user?.email) continue

    const { error } = await sendEmail({
      to: user.email,
      subject: 'A belated welcome.',
      html: `
        <style>@import url('https://fonts.googleapis.com/css2?family=Inconsolata:wght@400;700&display=swap');</style>
        <div style="font-family: 'Inconsolata', 'Courier New', Courier, monospace; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #000;">
          <h1 style="font-size: 28px; font-weight: bold; border-bottom: 3px solid #000; padding-bottom: 12px; margin-bottom: 32px;">
            [ MY WORD ]
          </h1>

          <p style="font-size: 15px; line-height: 1.9; margin-bottom: 16px;">A belated welcome.</p>

          <p style="font-size: 15px; line-height: 1.9; margin-bottom: 16px;">A few tweaks to keep things cheeky. You have now all become anonymous instead of that one time only bs. Instead, you can choose whether or not to sign your piece each week.</p>

          <p style="font-size: 15px; line-height: 1.9; margin-bottom: 16px;">You can also add pictures. Once a week, you'll get an email from us with the week's submissions in no particular order.</p>

          <p style="font-size: 15px; line-height: 1.9; margin-bottom: 32px;">We look forward to reading your words, and you keeping them.</p>

          <p style="font-size: 15px; line-height: 1.9; margin-bottom: 32px;">Love.</p>

          <a href="${groupUrl}" style="display: inline-block; background: #C85A5A; color: #fff; padding: 12px 24px; font-family: 'Inconsolata', 'Courier New', Courier, monospace; font-size: 12px; font-weight: bold; text-decoration: none; text-transform: uppercase; letter-spacing: 0.05em;">
            OPEN MY WORD →
          </a>

          <hr style="border: none; border-top: 1px solid #eee; margin: 40px 0 24px;" />
          <p style="font-size: 11px; color: #999;">— My Word · <a href="https://www.my-word.co.uk" style="color: #999;">my-word.co.uk</a></p>
        </div>
      `,
    })

    if (!error) sent++
  }

  return NextResponse.json({ sent, total: members.length })
}

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { groupId, email, groupName } = await req.json()
  const supabase = createServiceClient()

  // Create invitation record
  const { data: invitation, error } = await supabase
    .from('invitations')
    .insert({ group_id: groupId, email })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const joinUrl = `${process.env.NEXT_PUBLIC_APP_URL}/join/${invitation.token}`

  // Send invitation email
  await sendEmail({
    to: email,
    subject: `You've been invited to My Word — ${groupName}`,
    html: `
      <div style="font-family: 'Courier New', monospace; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #000;">
        <h1 style="font-size: 28px; font-weight: bold; border-bottom: 3px solid #000; padding-bottom: 12px; margin-bottom: 24px;">
          [ MY WORD ]
        </h1>
        <p style="font-size: 15px; margin-bottom: 20px;">
          You've been invited to join <strong>${groupName}</strong> on My Word.
        </p>

        <div style="border: 2px solid #000; padding: 20px; margin-bottom: 24px;">
          <p style="font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px;">
            HOW IT WORKS
          </p>
          <p style="font-size: 13px; margin-bottom: 8px;">→ Once a week, everyone writes something inspired by the letter of the week — A through Z over 26 weeks.</p>
          <p style="font-size: 13px; margin-bottom: 8px;">→ No rules on style or subject. Pick a word that starts with the letter. Write whatever it brings up.</p>
          <p style="font-size: 13px; margin-bottom: 8px;">→ Submissions are hidden until Wednesday, when everyone's pieces are revealed at once.</p>
          <p style="font-size: 13px; margin-bottom: 8px;">→ You have from Wednesday to Tuesday to submit. Miss the deadline: 0 points. Hit it: 1 point.</p>
          <p style="font-size: 13px;">→ At the end of 26 weeks, you'll have a complete collection — yours and everyone else's.</p>
        </div>

        <p style="font-size: 14px; margin-bottom: 24px;">
          Accept your invitation to create your account and join the group.
        </p>

        <a href="${joinUrl}" style="display: inline-block; background: #CC0000; color: #fff; padding: 12px 28px; font-family: 'Courier New', monospace; font-size: 14px; font-weight: bold; text-decoration: none; text-transform: uppercase; letter-spacing: 0.05em; border: 2px solid #CC0000;">
          ACCEPT INVITATION →
        </a>

        <p style="font-size: 11px; color: #999; margin-top: 20px;">
          This link expires in 7 days. If you weren't expecting this, you can ignore it.
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
        <p style="font-size: 11px; color: #999;">— My Word</p>
      </div>
    `
  })

  return NextResponse.json({ success: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const { message } = await req.json()
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('username, display_name')
    .eq('id', user.id)
    .single()

  const senderLabel = profile?.display_name || profile?.username || user.email

  await resend.emails.send({
    from: 'My Word <noreply@my-word.co.uk>',
    to: 'evoelemoyne@gmail.com',
    subject: `Feedback from ${senderLabel}`,
    html: `
      <p><strong>From:</strong> ${senderLabel} (${user.email})</p>
      <p><strong>Message:</strong></p>
      <p>${message.replace(/\n/g, '<br>')}</p>
    `,
  })

  return NextResponse.json({ ok: true })
}

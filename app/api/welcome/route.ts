import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'No email' }, { status: 400 })

    await sendEmail({
      to: email,
      subject: 'Oh My Word.',
      html: `<pre style="font-family: 'Courier New', monospace; font-size: 14px; line-height: 1.8;">Say less x</pre>`,
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

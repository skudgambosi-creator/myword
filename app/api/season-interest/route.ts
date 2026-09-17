import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

// Season 2 doesn't exist as a group yet, so there's nowhere to "join."
// This just records interest by emailing the admin, the same way the
// feedback widget does, rather than writing to a table that would need
// its own migration and admin tooling to ever be read.
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('display_name')
    .eq('id', user.id)
    .single()

  const label = profile?.display_name || user.email

  await resend.emails.send({
    from: 'My Word <noreply@my-word.co.uk>',
    to: 'evoelemoyne@gmail.com',
    subject: `Season 2 interest: ${label}`,
    html: `<p><strong>${label}</strong> (${user.email}) wants in on The Alphabet Project, Season 2.</p>`,
  })

  return NextResponse.json({ ok: true })
}

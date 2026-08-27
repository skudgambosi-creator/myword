import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

// Routed through an API endpoint rather than a direct client insert so
// membership can be checked server-side — the insert-only RLS policy alone
// only confirms auth.uid() = user_id, not that the sender actually belongs
// to this group. Belt and braces: the Collection view that hosts this is
// itself only reachable by group members anyway.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { message } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 })

  const service = createServiceClient()

  const { data: membership } = await service
    .from('group_members').select('*')
    .eq('group_id', params.id).eq('user_id', user.id).maybeSingle()
  if (!membership) return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 })

  const { error } = await service.from('season_feedback').insert({
    group_id: params.id,
    user_id: user.id,
    message: message.trim(),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: prof } = await service.from('users').select('member_number').eq('id', user.id).maybeSingle()

  await sendEmail({
    to: 'evoelemoyne@gmail.com',
    subject: `Season feedback — Member #${prof?.member_number ?? '?'}`,
    html: `
      <div style="font-family: 'Inconsolata', 'Courier New', Courier, monospace; max-width: 600px; margin: 0 auto; padding: 24px;">
        <p style="font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 16px;">
          Member #${prof?.member_number ?? '?'}
        </p>
        <p style="font-size: 14px; line-height: 1.8; white-space: pre-wrap;">${message.trim().replace(/</g, '&lt;')}</p>
      </div>
    `,
  })

  return NextResponse.json({ ok: true })
}

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function JoinPage({ params }: { params: { token: string } }) {
  const supabase = createClient()
  const serviceClient = createServiceClient()

  const { data: invitation } = await serviceClient
    .from('invitations')
    .select('*, groups(*)')
    .eq('token', params.token)
    .single()

  if (!invitation) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <nav className="nav"><Link href="/" className="nav-brand">[ MY WORD ]</Link></nav>
        <div className="page-container" style={{ paddingTop: 48, maxWidth: 480 }}>
          <div className="box">
            <div className="box-header" style={{ background: '#CC0000' }}>INVALID INVITATION</div>
            <div style={{ padding: '20px 0 0', fontSize: 14, color: '#555' }}>
              This invitation link is invalid or has expired.
              Please ask the group admin to send a new invitation.
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (invitation.accepted) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <nav className="nav"><Link href="/" className="nav-brand">[ MY WORD ]</Link></nav>
        <div className="page-container" style={{ paddingTop: 48, maxWidth: 480 }}>
          <div className="box">
            <div className="box-header">ALREADY ACCEPTED</div>
            <div style={{ padding: '20px 0 0', fontSize: 14 }}>
              This invitation has already been used.{' '}
              <Link href="/login">Log in to My Word →</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <nav className="nav"><Link href="/" className="nav-brand">[ MY WORD ]</Link></nav>
        <div className="page-container" style={{ paddingTop: 48, maxWidth: 480 }}>
          <div className="box">
            <div className="box-header" style={{ background: '#CC0000' }}>INVITATION EXPIRED</div>
            <div style={{ padding: '20px 0 0', fontSize: 14, color: '#555' }}>
              This invitation expired on {new Date(invitation.expires_at).toLocaleDateString('en-GB')}.
              Please ask the group admin to resend it.
            </div>
          </div>
        </div>
      </div>
    )
  }

  const { data: { user } } = await supabase.auth.getUser()
  const group = invitation.groups as any

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav className="nav"><Link href="/" className="nav-brand">[ MY WORD ]</Link></nav>
      <div className="page-container" style={{ paddingTop: 48, maxWidth: 520 }}>
        <h1 className="page-title">You're Invited</h1>

        <div className="box" style={{ marginBottom: 20 }}>
          <div className="box-header">INVITATION DETAILS</div>
          <div style={{ padding: '16px 0 0', fontSize: 14 }}>
            <table className="grid-table">
              <tbody>
                <tr><td style={{ fontWeight: 'bold' }}>Group</td><td>{group?.name}</td></tr>
                <tr><td style={{ fontWeight: 'bold' }}>Project</td><td>Alphabet Project</td></tr>
                <tr><td style={{ fontWeight: 'bold' }}>Starts</td><td>{new Date(group?.start_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
                <tr><td style={{ fontWeight: 'bold' }}>Invited email</td><td>{invitation.email}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {user ? (
          <AcceptButton token={params.token} groupId={invitation.group_id} userId={user.id} />
        ) : (
          <div className="box-shaded" style={{ fontSize: 14 }}>
            <p style={{ marginBottom: 16 }}>
              You need an account to join. Create one or log in — your invitation will be waiting.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <Link href={`/register?invite=${params.token}`} className="btn btn-accent">
                Create Account →
              </Link>
              <Link href={`/login?invite=${params.token}`} className="btn">
                Log In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AcceptButton({ token, groupId, userId }: { token: string; groupId: string; userId: string }) {
  return (
    <form action={async () => {
      'use server'
      const serviceClient = createServiceClient()
      await serviceClient.from('group_members').insert({ group_id: groupId, user_id: userId })
      await serviceClient.from('invitations').update({ accepted: true }).eq('token', token)
      redirect(`/groups/${groupId}`)
    }}>
      <button type="submit" className="btn btn-accent" style={{ width: '100%', padding: '12px' }}>
        Accept & Join Group →
      </button>
    </form>
  )
}

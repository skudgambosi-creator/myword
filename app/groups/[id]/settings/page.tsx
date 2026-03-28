import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/layout/Nav'

export default async function GroupSettingsPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
  const displayName = profile?.identity_mode === 'anonymous'
    ? `No-name ${profile.noname_number}` : profile?.display_name

  const { data: group } = await supabase.from('groups').select('*').eq('id', params.id).single()
  if (!group) redirect('/dashboard')

  // Only admins can access settings
  if (!group.admin_ids.includes(user.id)) redirect(`/groups/${params.id}`)

  const { data: members } = await supabase
    .from('group_members')
    .select('user_id, joined_at, users(*)')
    .eq('group_id', params.id)

  const { data: invitations } = await supabase
    .from('invitations')
    .select('*')
    .eq('group_id', params.id)
    .eq('accepted', false)
    .gt('expires_at', new Date().toISOString())

  return (
    <div style={{ minHeight: '100vh' }}>
      <Nav />

      <div className="page-container" style={{ paddingTop: 40, paddingBottom: 60, maxWidth: 720 }}>
        <div style={{ marginBottom: 8, fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          <Link href={`/groups/${params.id}`} style={{ color: '#999', textDecoration: 'none' }}>← {group.name}</Link>
          {' / Settings'}
        </div>
        <h1 className="page-title">Group Settings</h1>

        {group.locked && (
          <div style={{ border: '2px solid #CC0000', padding: '10px 16px', marginBottom: 24, fontSize: 13, color: '#CC0000' }}>
            This group's cycle has started. Membership is now locked — no members can be added or removed.
          </div>
        )}

        {/* Members */}
        <div className="box" style={{ marginBottom: 20 }}>
          <div className="box-header">MEMBERS ({members?.length})</div>
          <table className="grid-table" style={{ marginTop: 0 }}>
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Joined</th>
                {!group.locked && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {members?.map(m => {
                const u = m.users as any
                const name = u?.identity_mode === 'anonymous' ? `No-name ${u?.noname_number}` : u?.display_name
                const isAdmin = group.admin_ids.includes(m.user_id)
                const isCurrentUser = m.user_id === user.id
                return (
                  <tr key={m.user_id}>
                    <td style={{ fontWeight: isCurrentUser ? 'bold' : 'normal' }}>
                      {name} {isCurrentUser && <span style={{ color: '#CC0000' }}>(you)</span>}
                    </td>
                    <td>{isAdmin ? <span className="tag tag-complete">Admin</span> : 'Member'}</td>
                    <td style={{ fontSize: 12, color: '#666' }}>
                      {new Date(m.joined_at).toLocaleDateString('en-GB')}
                    </td>
                    {!group.locked && (
                      <td>
                        {!isCurrentUser && !isAdmin && (
                          <RemoveMemberButton groupId={params.id} userId={m.user_id} />
                        )}
                        {!isCurrentUser && !isAdmin && group.admin_ids.length < 2 && (
                          <MakeAdminButton groupId={params.id} userId={m.user_id} currentAdminIds={group.admin_ids} />
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pending invitations */}
        {invitations && invitations.length > 0 && (
          <div className="box" style={{ marginBottom: 20 }}>
            <div className="box-header">PENDING INVITATIONS</div>
            <table className="grid-table">
              <thead><tr><th>Email</th><th>Expires</th></tr></thead>
              <tbody>
                {invitations.map(inv => (
                  <tr key={inv.id}>
                    <td>{inv.email}</td>
                    <td style={{ fontSize: 12, color: '#666' }}>{new Date(inv.expires_at).toLocaleDateString('en-GB')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Invite new members */}
        {!group.locked && (
          <div className="box">
            <div className="box-header">INVITE MEMBERS</div>
            <InviteForm groupId={params.id} groupName={group.name} />
          </div>
        )}
      </div>
    </div>
  )
}

function RemoveMemberButton({ groupId, userId }: { groupId: string; userId: string }) {
  return (
    <form action={async () => {
      'use server'
      const supabase = createServiceClient()
      await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId)
      redirect(`/groups/${groupId}/settings`)
    }} style={{ display: 'inline' }}>
      <button type="submit" className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px', marginRight: 6 }}>
        Remove
      </button>
    </form>
  )
}

function MakeAdminButton({ groupId, userId, currentAdminIds }: { groupId: string; userId: string; currentAdminIds: string[] }) {
  return (
    <form action={async () => {
      'use server'
      const supabase = createServiceClient()
      await supabase.from('groups').update({ admin_ids: [...currentAdminIds, userId] }).eq('id', groupId)
      redirect(`/groups/${groupId}/settings`)
    }} style={{ display: 'inline' }}>
      <button type="submit" className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }}>
        Make Admin
      </button>
    </form>
  )
}

function InviteForm({ groupId, groupName }: { groupId: string; groupName: string }) {
  return (
    <form action={async (formData: FormData) => {
      'use server'
      const email = formData.get('email') as string
      if (!email) return
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, email, groupName }),
      })
      redirect(`/groups/${groupId}/settings`)
    }}>
      <div style={{ padding: '16px 0 0', display: 'flex', gap: 10 }}>
        <input name="email" type="email" className="field-input" placeholder="email@example.com" style={{ flex: 1 }} />
        <button type="submit" className="btn btn-accent">Send Invite</button>
      </div>
    </form>
  )
}

import { createServiceClient } from '@/lib/supabase/server'

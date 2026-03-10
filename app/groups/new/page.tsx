'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function NewGroupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [timezone] = useState('Europe/London')
  const [inviteEmails, setInviteEmails] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Get next Wednesday
  const getNextWednesday = () => {
    const d = new Date()
    const day = d.getDay()
    const daysUntilWed = (3 - day + 7) % 7 || 7
    d.setDate(d.getDate() + Math.max(daysUntilWed, 3))
    return d.toISOString().split('T')[0]
  }

  const handleCreate = async () => {
    setError('')
    if (!name.trim()) return setError('Please enter a group name.')
    if (!startDate) return setError('Please choose a start date.')

    const chosen = new Date(startDate)
    if (chosen.getDay() !== 3) return setError('Start date must be a Wednesday.')

    const minDate = new Date()
    minDate.setDate(minDate.getDate() + 3)
    if (chosen < minDate) return setError('Start date must be at least 3 days from today.')

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: name.trim(),
        admin_ids: [user.id],
        start_date: startDate,
        timezone,
      })
      .select().single()

    if (groupError || !group) {
      setError(groupError?.message || 'Failed to create group.')
      setLoading(false)
      return
    }

    // Add creator as member
    await supabase.from('group_members').insert({ group_id: group.id, user_id: user.id })

    // Send invitations
    const emails = inviteEmails.split('\n').map(e => e.trim()).filter(e => e.includes('@'))
    for (const email of emails) {
      await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: group.id, email, groupName: name.trim() }),
      })
    }

    router.push(`/groups/${group.id}`)
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav className="nav">
        <Link href="/dashboard" className="nav-brand">[ MY WORD ]</Link>
        <span className="nav-link" style={{ color: '#666' }}>New Group</span>
      </nav>

      <div className="page-container" style={{ paddingTop: 48, maxWidth: 600 }}>
        <h1 className="page-title">Create a Group</h1>

        {error && (
          <div style={{ border: '2px solid #CC0000', padding: '8px 12px', marginBottom: 16, fontSize: 13, color: '#CC0000' }}>
            {error}
          </div>
        )}

        <div className="box">
          <div className="box-header">GROUP DETAILS</div>
          <div style={{ padding: '20px 0 0' }}>
            <div style={{ marginBottom: 20 }}>
              <label className="field-label">Group Name</label>
              <input className="field-input" type="text" value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Alphabet Project 2025" />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="field-label">
                Cycle Start Date
                <span style={{ color: '#999', marginLeft: 8, fontWeight: 'normal', textTransform: 'none', letterSpacing: 0 }}>
                  must be a Wednesday, at least 3 days from today
                </span>
              </label>
              <input className="field-input" type="date" value={startDate}
                onChange={e => setStartDate(e.target.value)}
                min={new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]} />
              <button style={{ marginTop: 6, fontSize: 12, color: '#CC0000', border: 'none', background: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'Courier New' }}
                onClick={() => setStartDate(getNextWednesday())}>
                Use next Wednesday
              </button>
            </div>

            <div className="box-shaded" style={{ marginBottom: 20, fontSize: 12 }}>
              <strong>Timezone:</strong> Europe/London (GMT/BST) — all deadlines use this clock.
            </div>
          </div>
        </div>

        <div className="box" style={{ marginTop: 20 }}>
          <div className="box-header">INVITE MEMBERS</div>
          <div style={{ padding: '20px 0 0' }}>
            <label className="field-label">
              Email Addresses
              <span style={{ color: '#999', marginLeft: 8, fontWeight: 'normal', textTransform: 'none', letterSpacing: 0 }}>
                one per line
              </span>
            </label>
            <textarea
              className="field-input"
              value={inviteEmails}
              onChange={e => setInviteEmails(e.target.value)}
              placeholder={'friend@email.com\nanother@email.com'}
              rows={6}
              style={{ resize: 'vertical' }}
            />
            <p style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
              Invitation emails will be sent immediately. Links expire after 7 days.
              You can also invite people later from group settings.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <Link href="/dashboard" className="btn btn-ghost">Cancel</Link>
          <button className="btn btn-accent" style={{ flex: 1 }}
            onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating...' : 'Create Group & Send Invites →'}
          </button>
        </div>
      </div>
    </div>
  )
}

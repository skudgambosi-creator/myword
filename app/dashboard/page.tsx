'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const ALPHABET_PROJECT_ID = '00000000-0000-0000-0000-000000000001'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [inGroup, setInGroup] = useState(false)
  const [group, setGroup] = useState<any>(null)
  const [registrationClosed, setRegistrationClosed] = useState(false)

  useEffect(() => {
    const init = async (session: any) => {
      if (!session) { router.push('/login'); return }

      const { data: prof } = await supabase
        .from('users').select('*').eq('id', session.user.id).single()
      setProfile(prof)

      const { data: grp } = await supabase
        .from('groups').select('*').eq('id', ALPHABET_PROJECT_ID).single()
      setGroup(grp)

      const { data: membership, error: membershipError } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', ALPHABET_PROJECT_ID)
        .eq('user_id', session.user.id)
        .maybeSingle()
      setInGroup(!!membership && !membershipError)

      // Registration closes after Week C's window
      const { data: weekC } = await supabase
        .from('weeks').select('closes_at')
        .eq('group_id', ALPHABET_PROJECT_ID).eq('letter', 'C').single()
      if (weekC && new Date(weekC.closes_at) < new Date()) {
        setRegistrationClosed(true)
      }

      setLoading(false)
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      init(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleJoin = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    // Re-check cutoff at time of click
    const { data: weekC } = await supabase
      .from('weeks').select('closes_at')
      .eq('group_id', ALPHABET_PROJECT_ID).eq('letter', 'C').single()
    if (weekC && new Date(weekC.closes_at) < new Date()) {
      setRegistrationClosed(true)
      return
    }

    const { error: joinError } = await supabase.from('group_members').insert({
      group_id: ALPHABET_PROJECT_ID,
      user_id: session.user.id,
    })
    // 23505 = duplicate key (already a member) — treat as success
    if (!joinError || joinError.code === '23505') {
      setInGroup(true)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh' }}>
      <nav className="nav"><span className="nav-brand">[ MY WORD ]</span></nav>
      <div className="page-container" style={{ paddingTop: 40 }}>Loading...</div>
    </div>
  )

  const displayName = profile?.identity_mode === 'anonymous'
    ? `No-name ${profile.noname_number}` : profile?.display_name

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav className="nav">
        <Link href="/dashboard" className="nav-brand">[ MY WORD ]</Link>
        <Link href="/dashboard" className="nav-link active">Dashboard</Link>
        <Link href="/profile" className="nav-link">Profile</Link>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          <span style={{ padding: '10px 16px', fontSize: 12, color: '#666', borderLeft: '1px solid #aaa' }}>
            {displayName}
          </span>
          <button onClick={async () => {
            await supabase.auth.signOut()
            window.location.href = '/'
          }} className="nav-link" style={{ border: 'none', cursor: 'pointer', background: 'none' }}>
            Sign Out
          </button>
        </div>
      </nav>

      <div className="page-container" style={{ paddingTop: 48, paddingBottom: 60 }}>

        {inGroup ? (
          /* Already a member — show the project card */
          <div>
            <h1 className="page-title">Dashboard</h1>
            <div className="box" style={{ borderLeft: '4px solid #CC0000' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#CC0000', marginBottom: 6 }}>
                    Season 1 — Now Playing
                  </div>
                  <h2 style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 4 }}>The Alphabet Project</h2>
                  <p style={{ fontSize: 13, color: '#666' }}>26 letters · 26 weeks · one piece each</p>
                </div>
                <Link href={`/groups/${ALPHABET_PROJECT_ID}`} className="btn btn-accent" style={{ fontSize: 15, padding: '10px 28px' }}>
                  Open →
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* Not yet a member — present the project */
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <div style={{ fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#CC0000', marginBottom: 12 }}>
                Season 1
              </div>
              <h1 style={{ fontSize: 48, fontWeight: 'bold', marginBottom: 8 }}>The Alphabet Project</h1>
              <p style={{ fontSize: 14, color: '#666' }}>A — Z · 26 weeks · one piece each</p>
            </div>

            <hr className="rule" />

            <div style={{ marginBottom: 40 }}>
              {[
                ['A letter, every week', 'Each Wednesday a new letter drops — A through Z over 26 weeks. You have until Tuesday night to submit.'],
                ['Pick a word', 'Choose any word or phrase that starts with that letter. That\'s your title. No other rules.'],
                ['Write whatever it brings up', 'A memory. A rant. A story. A list. A poem. Style, subject, length — entirely up to you. Min 5 words, max 1,000.'],
                ['Hidden until Wednesday', 'No one sees anyone else\'s submission until the week closes. Then everything unlocks at once.'],
                ['26 weeks later', 'You\'ll have written 26 pieces — and so will everyone else. A complete collection, A to Z.'],
              ].map(([title, desc], i) => (
                <div key={i} style={{ display: 'flex', gap: 20, padding: '20px 0', borderBottom: '1px solid #eee' }}>
                  <div style={{ fontSize: 28, fontWeight: 'bold', color: '#CC0000', minWidth: 40, lineHeight: 1 }}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 4 }}>{title}</div>
                    <div style={{ fontSize: 13, color: '#555', lineHeight: 1.7 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center' }}>
              {registrationClosed ? (
                <div style={{ border: '2px solid #eee', padding: '20px 32px', display: 'inline-block' }}>
                  <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 6 }}>Registration closed</div>
                  <p style={{ fontSize: 13, color: '#666', margin: 0 }}>
                    The Alphabet Project is now underway and no longer accepting new members.
                  </p>
                </div>
              ) : (
                <>
                  <button className="btn btn-accent" style={{ fontSize: 16, padding: '14px 48px' }}
                    onClick={handleJoin}>
                    Get Amongst
                  </button>
                  <p style={{ fontSize: 12, color: '#999', marginTop: 12 }}>
                    Joining is free. You'll start with the current letter.
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

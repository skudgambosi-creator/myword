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
  const [isMember, setIsMember] = useState(false)
  const [currentWeek, setCurrentWeek] = useState<any>(null)
  const [memberCount, setMemberCount] = useState(0)
  const [submissionCount, setSubmissionCount] = useState(0)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [registrationOpen, setRegistrationOpen] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const userId = session.user.id

      const { data: prof } = await supabase.from('users').select('*').eq('id', userId).single()
      setProfile(prof)

      const { data: membership } = await supabase
        .from('group_members').select('*')
        .eq('group_id', ALPHABET_PROJECT_ID).eq('user_id', userId).maybeSingle()
      setIsMember(!!membership)

      const now = new Date().toISOString()
      const { data: week } = await supabase
        .from('weeks').select('*').eq('group_id', ALPHABET_PROJECT_ID)
        .lte('opens_at', now).order('week_num', { ascending: false }).limit(1).maybeSingle()
      setCurrentWeek(week)

      if (week) {
        const { data: sub } = await supabase
          .from('submissions').select('id')
          .eq('user_id', userId).eq('week_id', week.id).eq('is_late_catchup', false).maybeSingle()
        setHasSubmitted(!!sub)

        const { count: subCount } = await supabase
          .from('submissions').select('*', { count: 'exact', head: true })
          .eq('week_id', week.id).eq('is_late_catchup', false)
        setSubmissionCount(subCount || 0)
      }

      const { count: mc } = await supabase
        .from('group_members').select('*', { count: 'exact', head: true })
        .eq('group_id', ALPHABET_PROJECT_ID)
      setMemberCount(mc || 0)

      const { data: weekThree } = await supabase
        .from('weeks').select('closes_at').eq('group_id', ALPHABET_PROJECT_ID)
        .eq('week_num', 3).maybeSingle()
      if (weekThree) {
        setRegistrationOpen(new Date(weekThree.closes_at) > new Date())
      }

      setLoading(false)
    }

    loadDashboard()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { router.push('/login') }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleJoin = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('group_members').insert({
      group_id: ALPHABET_PROJECT_ID,
      user_id: session.user.id,
    })
    setIsMember(true)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh' }}>
      <nav className="nav"><span className="nav-brand">[ MY WORD ]</span></nav>
      <div className="page-container" style={{ paddingTop: 40 }}>Loading...</div>
    </div>
  )

  const weekClosed = currentWeek ? new Date(currentWeek.closes_at) < new Date() : false

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav className="nav">
        <Link href="/dashboard" className="nav-brand">[ MY WORD ]</Link>
        <Link href="/dashboard" className="nav-link active">Dashboard</Link>
        <Link href="/profile" className="nav-link">Profile</Link>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          <span style={{ padding: '10px 16px', fontSize: 12, color: '#666', borderLeft: '1px solid #aaa' }}>
            #{profile?.member_number}
          </span>
          <button onClick={async () => {
            await supabase.auth.signOut()
            window.location.href = '/'
          }} className="nav-link" style={{ border: 'none', cursor: 'pointer', background: 'none' }}>
            Sign Out
          </button>
        </div>
      </nav>

      <div className="page-container" style={{ paddingTop: 40, paddingBottom: 60 }}>
        <h1 className="page-title">Dashboard</h1>

        {!isMember ? (
          <div className="box" style={{ maxWidth: 600 }}>
            <div className="box-header">THE ALPHABET PROJECT — SEASON 1</div>
            <div style={{ padding: '20px 0 0' }}>
              <p style={{ fontSize: 14, color: '#555', lineHeight: 1.8, marginBottom: 20 }}>
                26 weeks. 26 letters. One submission per week, starting with A. 
                Write anything — the only rule is your title starts with that week's letter.
              </p>
              {registrationOpen ? (
                <button className="btn btn-accent" onClick={handleJoin}>
                  Get Amongst →
                </button>
              ) : (
                <div className="box-shaded" style={{ fontSize: 13 }}>
                  Registration is now closed.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 'bold' }}>The Alphabet Project</h2>
                  <span className="tag" style={{ color: '#CC0000', borderColor: '#CC0000' }}>ACTIVE</span>
                </div>

                {currentWeek && (
                  <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div>
                      <span className="section-header" style={{ display: 'block', marginBottom: 2 }}>This Week</span>
                      <span style={{ fontSize: 32, fontWeight: 'bold' }}>{currentWeek.letter}</span>
                      <span style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>Week {currentWeek.week_num} of 26</span>
                    </div>
                    <div>
                      <span className="section-header" style={{ display: 'block', marginBottom: 2 }}>Submissions</span>
                      <span className="submission-counter">
                        <strong>{submissionCount}</strong> / {memberCount}
                      </span>
                    </div>
                    <div>
                      <span className="section-header" style={{ display: 'block', marginBottom: 2 }}>Your Status</span>
                      {hasSubmitted
                        ? <span className="tag tag-complete">✓ Submitted</span>
                        : weekClosed
                        ? <span className="tag tag-late">Window Closed</span>
                        : <span className="tag" style={{ color: '#CC0000', borderColor: '#CC0000' }}>Not submitted</span>
                      }
                    </div>
                  </div>
                )}
              </div>

              <Link href={`/groups/${ALPHABET_PROJECT_ID}`} className="btn">
                Open →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

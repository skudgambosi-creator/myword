'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const ALPHABET_PROJECT_ID = '00000000-0000-0000-0000-000000000001'

function Countdown({ closesAt }: { closesAt: string }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const tick = () => {
      const diff = new Date(closesAt).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('CLOSED'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${String(d).padStart(2,'0')}:${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [closesAt])

  return (
    <div>
      <div className="timer">{timeLeft}</div>
      <div className="timer-label">DD : HH : MM : SS</div>
    </div>
  )
}

export default function GroupPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [group, setGroup] = useState<any>(null)
  const [currentWeek, setCurrentWeek] = useState<any>(null)
  const [mySubmission, setMySubmission] = useState<any>(null)
  const [memberCount, setMemberCount] = useState(0)
  const [submissionCount, setSubmissionCount] = useState(0)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const userId = session.user.id

      // Verify membership
      const { data: membership } = await supabase
        .from('group_members').select('*')
        .eq('group_id', params.id).eq('user_id', userId).single()
      if (!membership) { router.push('/dashboard'); return }

      const { data: prof } = await supabase.from('users').select('*').eq('id', userId).single()
      setProfile(prof)

      const { data: grp } = await supabase.from('groups').select('*').eq('id', params.id).single()
      setGroup(grp)

      // Current open week
      const now = new Date().toISOString()
      const { data: week } = await supabase
        .from('weeks').select('*').eq('group_id', params.id)
        .lte('opens_at', now).order('week_num', { ascending: false }).limit(1).single()
      setCurrentWeek(week)

      if (week) {
        // My submission
        const { data: sub } = await supabase
          .from('submissions').select('*')
          .eq('user_id', userId).eq('week_id', week.id).eq('is_late_catchup', false).single()
        setMySubmission(sub)

        // Submission count
        const { count } = await supabase
          .from('submissions').select('*', { count: 'exact', head: true })
          .eq('week_id', week.id).eq('is_late_catchup', false)
        setSubmissionCount(count || 0)
      }

      // Member count
      const { count: mc } = await supabase
        .from('group_members').select('*', { count: 'exact', head: true })
        .eq('group_id', params.id)
      setMemberCount(mc || 0)

      setLoading(false)
    }
    init()
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh' }}>
      <nav className="nav"><Link href="/dashboard" className="nav-brand">[ MY WORD ]</Link></nav>
      <div className="page-container" style={{ paddingTop: 40 }}>Loading...</div>
    </div>
  )

  const displayName = profile?.identity_mode === 'anonymous'
    ? `No-name ${profile.noname_number}` : profile?.display_name

  const windowClosed = currentWeek ? new Date(currentWeek.closes_at) < new Date() : false
  const isCompleted = !!group?.completed_at

  return (
    <div style={{ minHeight: '100vh' }}>
      {isCompleted && (
        <div className="completed-banner">★ THE ALPHABET PROJECT IS COMPLETE — A TO Z ★</div>
      )}

      <nav className="nav">
        <Link href="/dashboard" className="nav-brand">[ MY WORD ]</Link>
        <Link href="/dashboard" className="nav-link">Dashboard</Link>
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

      <div className="page-container" style={{ paddingTop: 40, paddingBottom: 60 }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
            Season 1
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 'bold' }}>The Alphabet Project</h1>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32, alignItems: 'start' }}>

          {/* LEFT COLUMN */}
          <div>

            {/* Letter + Timer + Submit */}
            {currentWeek && !isCompleted && (
              <div className="box" style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  {/* Big letter */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#999', marginBottom: 4 }}>
                      Week {currentWeek.week_num} of 26
                    </div>
                    <span style={{ fontSize: 140, fontWeight: 'bold', lineHeight: 1, color: '#CC0000', display: 'block' }}>
                      {currentWeek.letter}
                    </span>
                  </div>

                  {/* Timer + status + CTA */}
                  <div style={{ flex: 1, paddingTop: 8 }}>
                    {!windowClosed ? (
                      <>
                        <div style={{ marginBottom: 16 }}>
                          <div className="section-header">Submission closes in</div>
                          <Countdown closesAt={currentWeek.closes_at} />
                        </div>
                        <div style={{ marginBottom: 20 }}>
                          <span className="submission-counter">
                            <strong>{submissionCount}</strong> / {memberCount} submitted
                          </span>
                        </div>
                        {mySubmission ? (
                          <div>
                            <div style={{ marginBottom: 8 }}>
                              <span className="tag tag-complete">✓ Submitted</span>
                              <span style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>
                                {mySubmission.word_title} · {mySubmission.word_count} words
                              </span>
                            </div>
                            <Link href={`/groups/${params.id}/submit?edit=1`} className="btn">
                              Edit Submission
                            </Link>
                          </div>
                        ) : (
                          <Link href={`/groups/${params.id}/submit`} className="btn btn-accent" style={{ fontSize: 15, padding: '10px 28px' }}>
                            Submit Letter {currentWeek.letter}
                          </Link>
                        )}
                      </>
                    ) : (
                      <div className="box-shaded" style={{ fontSize: 13 }}>
                        Window closed. Reveal pending on Wednesday.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!currentWeek && !isCompleted && (
              <div className="box" style={{ marginBottom: 24 }}>
                <div className="box-header">AWAITING START</div>
                <div style={{ padding: '16px 0 0', fontSize: 14, color: '#555' }}>
                  The project starts on {new Date(group.start_date).toLocaleDateString('en-GB', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                  })}. Week 1 will be Letter A.
                </div>
              </div>
            )}

            {isCompleted && (
              <div className="box" style={{ marginBottom: 24, textAlign: 'center', padding: 48 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>A — Z</div>
                <h2 style={{ fontSize: 20, marginBottom: 20 }}>The Alphabet Project is complete.</h2>
                <Link href={`/groups/${params.id}/submissions`} className="btn btn-accent">
                  Browse the Archive →
                </Link>
              </div>
            )}

            {/* Rules */}
            <div className="box" style={{ marginBottom: 24 }}>
              <div className="box-header">RULES</div>
              <div style={{ padding: '16px 0 0' }}>
                {[
                  ['One submission per letter', 'You get one entry per week. Once submitted you can edit it, but you cannot delete it.'],
                  ['Your word must start with the letter', 'Your title can be any word or phrase — it just has to begin with that week\'s letter.'],
                  ['Edit until Tuesday 23:59', 'You can change your submission at any time before the window closes. After that, it\'s locked.'],
                  ['Hidden until Wednesday', 'Nobody can see anyone else\'s submission until the reveal. Not the title, not the content.'],
                  ['Scoring', 'Submit on time: 1 point. Miss the deadline: 0 points. Points are tallied on the leaderboard.'],
                ].map(([title, desc], i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #eee' }}>
                    <div style={{ fontWeight: 'bold', fontSize: 11, color: '#CC0000', minWidth: 20 }}>{i + 1}</div>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 2 }}>{title}</div>
                      <div style={{ fontSize: 12, color: '#555', lineHeight: 1.6 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN — Nav to Leaderboard + Submissions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <Link href={`/groups/${params.id}/leaderboard`} style={{ textDecoration: 'none' }}>
              <div className="box" style={{ cursor: 'pointer', borderLeft: '4px solid #CC0000' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')}
                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                <div style={{ fontWeight: 'bold', fontSize: 15, marginBottom: 4 }}>Leaderboard →</div>
                <div style={{ fontSize: 12, color: '#666' }}>See how everyone is doing</div>
              </div>
            </Link>

            <Link href={`/groups/${params.id}/submissions`} style={{ textDecoration: 'none' }}>
              <div className="box" style={{ cursor: 'pointer', borderLeft: '4px solid #000' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')}
                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                <div style={{ fontWeight: 'bold', fontSize: 15, marginBottom: 4 }}>Submissions →</div>
                <div style={{ fontSize: 12, color: '#666' }}>Browse the archive — A to Z</div>
              </div>
            </Link>

            {/* Progress */}
            {currentWeek && (
              <div className="box">
                <div className="section-header">Progress</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                  {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter, i) => {
                    const weekNum = i + 1
                    const isPast = weekNum < currentWeek.week_num
                    const isCurrent = weekNum === currentWeek.week_num
                    return (
                      <div key={letter} style={{
                        width: 28, height: 28,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 'bold',
                        border: isCurrent ? '2px solid #CC0000' : '1px solid #eee',
                        background: isPast ? '#000' : isCurrent ? '#fff' : '#fafafa',
                        color: isPast ? '#fff' : isCurrent ? '#CC0000' : '#ccc',
                      }}>
                        {letter}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Nav from '@/components/layout/Nav'

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
  return <div style={{ fontSize: 22, fontWeight: 400, letterSpacing: '0.1em' }}>{timeLeft}</div>
}

function Footer() {
  return (
    <footer style={{ textAlign: 'center', padding: '48px 0 28px' }}>
      <span style={{ fontSize: 12, color: '#ccc', letterSpacing: '0.18em' }}>MOUNTFORD-GAMBOSI</span>
    </footer>
  )
}

const RULES = [
  ['One submission per letter', 'You get one entry per week. Everyone is anonymous by default, but you can choose to sign a submission if you like. You can add pictures and music as well.'],
  ['Your word must start with the letter', 'Your title can be any word or phrase — it just has to begin with that week\'s letter. You can write whatever you like, however you like.'],
  ['Edit until Wednesday 23:59', 'You can change your submission at any time before the window closes. After that, it\'s locked.'],
  ['Hidden until midnight Wednesday', 'Nobody can see anyone else\'s submission until the reveal. Not the title, not the content. You will get an email every Wednesday with the week\'s submissions, as well as having them unlocked on here.'],
  ['Scoring', 'You score points by keeping your word. Miss a week, miss a point.'],
]

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
  const [myScore, setMyScore] = useState(0)
  const [nextWeek, setNextWeek] = useState<any>(null)
  const [isCompleted, setIsCompleted] = useState(false)
  const [rulesExpanded, setRulesExpanded] = useState(false)
  const [submittedWeekNums, setSubmittedWeekNums] = useState<Set<number>>(new Set())

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const userId = session.user.id

      const { data: membership } = await supabase
        .from('group_members').select('*')
        .eq('group_id', params.id).eq('user_id', userId).single()
      if (!membership) { router.push('/dashboard'); return }

      const { data: prof } = await supabase.from('users').select('*').eq('id', userId).single()
      setProfile(prof)

      const { data: grp } = await supabase.from('groups').select('*').eq('id', params.id).single()
      setGroup(grp)
      setIsCompleted(!!grp?.completed_at)

      const now = new Date().toISOString()
      const { data: week } = await supabase
        .from('weeks').select('*').eq('group_id', params.id)
        .lte('opens_at', now).gte('closes_at', now)
        .order('week_num', { ascending: false }).limit(1).single()
      setCurrentWeek(week)

      if (!week) {
        const { data: upcoming } = await supabase
          .from('weeks').select('*').eq('group_id', params.id)
          .gt('opens_at', now).order('week_num', { ascending: true }).limit(1).single()
        setNextWeek(upcoming)
      }

      if (week) {
        const { data: sub } = await supabase
          .from('submissions').select('*')
          .eq('user_id', userId).eq('week_id', week.id).eq('is_late_catchup', false).single()
        setMySubmission(sub)
        const { count } = await supabase
          .from('submissions').select('*', { count: 'exact', head: true })
          .eq('week_id', week.id).eq('is_late_catchup', false)
        setSubmissionCount(count || 0)
      }

      const { count: mc } = await supabase
        .from('group_members').select('*', { count: 'exact', head: true })
        .eq('group_id', params.id)
      setMemberCount(mc || 0)

      const { data: scores } = await supabase
        .from('scores').select('score').eq('group_id', params.id).eq('user_id', userId)
      setMyScore((scores || []).reduce((s: number, r: any) => s + r.score, 0))

      const { data: allWeeks } = await supabase
        .from('weeks').select('id, week_num').eq('group_id', params.id)
      const { data: userSubs } = await supabase
        .from('submissions').select('week_id').eq('user_id', userId).eq('is_late_catchup', false)
      const submittedIds = new Set((userSubs || []).map((s: any) => s.week_id))
      const weekNumSet = new Set(
        (allWeeks || []).filter((w: any) => submittedIds.has(w.id)).map((w: any) => w.week_num as number)
      )
      setSubmittedWeekNums(weekNumSet)

      setLoading(false)
    }
    init()
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh' }}>
      <Nav />
      <div style={{ padding: '40px', fontSize: 13, color: '#999' }}>Loading...</div>
    </div>
  )

  const activeWeek = currentWeek || nextWeek
  const windowClosed = currentWeek ? new Date(currentWeek.closes_at) < new Date() : false

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {isCompleted && (
        <div style={{ background: '#000', color: '#fff', textAlign: 'center', padding: 8, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          ★ THE ALPHABET PROJECT IS COMPLETE — A TO Z ★
        </div>
      )}

      <Nav />

      <main className="page-main">

        {/* Season label */}
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.15em', color: '#C85A5A', textTransform: 'uppercase', marginBottom: 16 }}>
          SEASON 1
        </div>

        {/* Project title box */}
        <div style={{ border: '1px solid #000', padding: '24px 32px', marginBottom: 24, textAlign: 'center' }}>
          <span style={{ fontSize: 22, letterSpacing: '0.2em', textTransform: 'uppercase' }}>THE ALPHABET PROJECT</span>
        </div>

        {/* Main action card */}
        <div className="action-card">

          {/* Letter + countdown + submit — grid aligned with score row below */}
          {(currentWeek || nextWeek) && !isCompleted && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #eee' }}>

              {/* Row 1 Col 1: Letter circle */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', paddingBottom: 20 }}>
                <div style={{
                  width: 'clamp(90px, 22vw, 130px)', height: 'clamp(90px, 22vw, 130px)',
                  borderRadius: '50%', background: '#C85A5A',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 'clamp(56px, 14vw, 80px)', fontWeight: 900, letterSpacing: 0, lineHeight: 1,
                }}>
                  {(currentWeek || nextWeek).letter}
                </div>
              </div>

              {/* Row 1 Col 2: spacer matching score circle width */}
              <div style={{ width: 88 }} />

              {/* Row 1 Col 3: Timer + CTA + count */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, paddingBottom: 20 }}>
                {currentWeek && !windowClosed ? (
                  <>
                    <Countdown closesAt={currentWeek.closes_at} />
                    <Link href={`/groups/${params.id}/submit${mySubmission ? '?edit=1' : ''}`} className="btn-accent">
                      SUBMIT / EDIT
                    </Link>
                    <div style={{ fontSize: 12, letterSpacing: '0.05em', color: '#666' }}>
                      {submissionCount}/{memberCount}
                    </div>
                  </>
                ) : currentWeek && windowClosed ? (
                  <div style={{ fontSize: 13, color: '#666', textAlign: 'center' }}>Window closed. Reveal pending at midnight Wednesday.</div>
                ) : nextWeek ? (
                  <>
                    <Countdown closesAt={nextWeek.opens_at} />
                    <div style={{ fontSize: 11, color: '#999', letterSpacing: '0.1em', textAlign: 'center' }}>until next letter opens</div>
                  </>
                ) : null}
              </div>

              {/* Row 2 Col 1: LEADERBOARD */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div className="score-row-line" />
                <Link href={`/groups/${params.id}/leaderboard`} className="score-row-btn">
                  LEADERBOARD
                </Link>
                <div className="score-row-line" />
              </div>

              {/* Row 2 Col 2: Score circle — label floats above row via absolute */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <div style={{ fontSize: 10, color: '#999', letterSpacing: '0.08em', textTransform: 'uppercase', position: 'absolute', top: -18, whiteSpace: 'nowrap' }}>YOUR SCORE</div>
                <div className="score-row-circle">{myScore}</div>
              </div>

              {/* Row 2 Col 3: SUBMISSIONS */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div className="score-row-line" />
                <Link href={`/groups/${params.id}/submissions`} className="score-row-btn">
                  SUBMISSIONS
                </Link>
                <div className="score-row-line" />
              </div>
            </div>
          )}

          {isCompleted && (
            <div style={{ textAlign: 'center', padding: '20px 0 24px', borderBottom: '1px solid #eee', marginBottom: 24 }}>
              <div style={{ fontSize: 32, marginBottom: 12, letterSpacing: '0.2em' }}>A — Z</div>
              <Link href={`/groups/${params.id}/submissions`} className="btn-accent">
                BROWSE THE ARCHIVE
              </Link>
            </div>
          )}

          {/* LEADERBOARD — score — SUBMISSIONS (standalone, when no active/upcoming week or completed) */}
          {(!(currentWeek || nextWeek) || isCompleted) && (
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #eee' }}>
              <div className="score-row-line" />
              <Link href={`/groups/${params.id}/leaderboard`} className="score-row-btn">LEADERBOARD</Link>
              <div className="score-row-line" />
              <div className="score-row-circle">{myScore}</div>
              <div className="score-row-line" />
              <Link href={`/groups/${params.id}/submissions`} className="score-row-btn">SUBMISSIONS</Link>
              <div className="score-row-line" />
            </div>
          )}

          {/* Alphabet grid — 13 per row */}
          {activeWeek && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(13, 1fr)', gap: 4 }}>
              {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter, i) => {
                const weekNum = i + 1
                const isPast = weekNum < activeWeek.week_num
                const isCurrent = weekNum === activeWeek.week_num

                let bg: string, border: string, color: string
                if (isPast) {
                  bg = '#000'; border = '#000'; color = '#fff'
                } else if (isCurrent) {
                  bg = '#C85A5A'; border = '#C85A5A'; color = '#fff'
                } else {
                  bg = 'transparent'; border = '#000'; color = '#000'
                }

                return (
                  <div key={letter} style={{
                    aspectRatio: '1', borderRadius: '50%',
                    border: `1px solid ${border}`,
                    background: bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 'clamp(11px, 2.2vw, 20px)', fontWeight: 700,
                    color,
                  }}>
                    {letter}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Rules box */}
        <div style={{ border: '1px solid #000', padding: '28px 32px', marginBottom: 0 }}>
          <button
            onClick={() => setRulesExpanded(!rulesExpanded)}
            style={{
              display: 'block', width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 18, letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'center',
              fontFamily: 'inherit', fontWeight: 'normal', padding: 0,
              marginBottom: rulesExpanded ? 24 : 0,
            }}
          >
            RULES
          </button>
          {rulesExpanded && RULES.map(([title, desc], i) => (
            <div key={i} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, marginBottom: 4 }}>
                <strong>{i + 1}. {title}</strong>
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.7 }}>{desc}</div>
            </div>
          ))}
        </div>

      </main>

      <Footer />
    </div>
  )
}

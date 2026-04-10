'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Nav from '@/components/layout/Nav'

function PlanetWidget({ letter, closesAt, hasSubmitted }: { letter: string, closesAt: string, hasSubmitted: boolean }) {
  const [timeLeft, setTimeLeft] = useState('')
  useEffect(() => {
    const tick = () => {
      const diff = new Date(closesAt).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('CLOSED'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${String(d).padStart(2, '0')}:${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [closesAt])

  // Planet geometry
  const cx = 150, cy = 90, r = 74
  // Inner ring sits tight to the planet
  const irx = 120, iry = 14
  // Outer ring with a gap — timer lives in the band between them
  const orx = 144, ory = 28

  return (
    <svg width="300" height="180" viewBox="0 0 300 180" style={{ display: 'block', margin: '0 auto', overflow: 'visible' }}>
      <defs>
        {/* Top half = behind the planet */}
        <clipPath id="satBackClip">
          <rect x="-10" y="-10" width="320" height={cy + 10} />
        </clipPath>
        {/* Bottom half = in front of the planet */}
        <clipPath id="satFrontClip">
          <rect x="-10" y={cy} width="320" height="210" />
        </clipPath>
      </defs>

      {/* Back arcs of both rings (top half, behind planet) */}
      <ellipse cx={cx} cy={cy} rx={irx} ry={iry}
        fill="none" stroke="#000" strokeWidth="1.5"
        clipPath="url(#satBackClip)" />
      <ellipse cx={cx} cy={cy} rx={orx} ry={ory}
        fill="none" stroke="#000" strokeWidth="1.5"
        clipPath="url(#satBackClip)" />

      {/* Planet body */}
      <circle cx={cx} cy={cy} r={r} fill="white" stroke="#000" strokeWidth="1.5" />

      {/* Front arcs of both rings (bottom half, in front of planet) */}
      <ellipse cx={cx} cy={cy} rx={irx} ry={iry}
        fill="none" stroke="#000" strokeWidth="1.5"
        clipPath="url(#satFrontClip)" />
      <ellipse cx={cx} cy={cy} rx={orx} ry={ory}
        fill="none" stroke="#000" strokeWidth="1.5"
        clipPath="url(#satFrontClip)" />

      {/* Letter — centred in the planet */}
      <text x={cx} y={cy}
        textAnchor="middle" dominantBaseline="middle"
        fontFamily="'Inconsolata', 'Courier New', monospace"
        fontSize="66" fontWeight="900"
        fill={hasSubmitted ? '#C85A5A' : '#ccc'}>
        {letter}
      </text>

      {/* Timer — sits in the gap between the two front ring arcs */}
      <text x={cx} y={cy + iry + Math.round((ory - iry) / 2) + 1}
        textAnchor="middle" dominantBaseline="middle"
        fontFamily="'Inconsolata', 'Courier New', monospace"
        fontSize="12"
        fill="#000">
        {timeLeft}
      </text>
    </svg>
  )
}

function SimpleCountdown({ targetAt }: { targetAt: string }) {
  const [timeLeft, setTimeLeft] = useState('')
  useEffect(() => {
    const tick = () => {
      const diff = new Date(targetAt).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('00:00:00'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetAt])
  return <span>{timeLeft}</span>
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
  const [group, setGroup] = useState<any>(null)
  const [currentWeek, setCurrentWeek] = useState<any>(null)
  const [mySubmission, setMySubmission] = useState<any>(null)
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
      }

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

        {/* Header box — title + season inside the rectangle */}
        <div style={{ border: '1px solid #000', padding: '20px 32px', marginBottom: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 22, letterSpacing: '0.2em', textTransform: 'uppercase' }}>THE ALPHABET PROJECT</div>
          <div style={{ fontSize: 11, color: '#C85A5A', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 6 }}>SEASON 1</div>
        </div>

        {/* Planet widget + ENTER/EDIT button */}
        {!isCompleted && (
          <div style={{ marginBottom: 32, textAlign: 'center' }}>
            {currentWeek && !windowClosed ? (
              <>
                <PlanetWidget
                  letter={currentWeek.letter}
                  closesAt={currentWeek.closes_at}
                  hasSubmitted={!!mySubmission}
                />
                <div style={{ marginTop: 24 }}>
                  <Link
                    href={`/groups/${params.id}/submit${mySubmission ? '?edit=1' : ''}`}
                    style={{
                      display: 'inline-block',
                      border: '1px solid #000',
                      padding: '14px 64px',
                      fontSize: 13,
                      fontWeight: 700,
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      textDecoration: 'none',
                      color: '#000',
                      fontFamily: 'inherit',
                    }}
                  >
                    {mySubmission ? 'EDIT' : 'ENTER'}
                  </Link>
                </div>
              </>
            ) : currentWeek && windowClosed ? (
              <div style={{ fontSize: 13, color: '#666', padding: '40px 0' }}>
                Window closed. Reveal pending at midnight Wednesday.
              </div>
            ) : nextWeek ? (
              <div style={{ padding: '40px 0' }}>
                <div style={{ fontSize: 11, color: '#999', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Next letter opens in</div>
                <div style={{ fontSize: 22, fontWeight: 400, letterSpacing: '0.1em' }}>
                  <SimpleCountdown targetAt={nextWeek.opens_at} />
                </div>
              </div>
            ) : null}
          </div>
        )}

        {isCompleted && (
          <div style={{ textAlign: 'center', padding: '20px 0 32px' }}>
            <div style={{ fontSize: 32, marginBottom: 12, letterSpacing: '0.2em' }}>A — Z</div>
          </div>
        )}

        {/* Score + Grid box */}
        {activeWeek && (
          <div style={{ border: '1px solid #000', padding: '24px', marginBottom: 24 }}>

            {/* YOUR SCORE label */}
            <div style={{ textAlign: 'center', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999', marginBottom: 16 }}>
              YOUR SCORE
            </div>

            {/* LEADERBOARD — score circle — SUBMISSIONS row */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ flex: 1, height: 1, background: '#000' }} />
              <Link href={`/groups/${params.id}/leaderboard`} style={{
                border: '1px solid #000', padding: '6px 16px', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none',
                color: '#000', margin: '0 8px', fontFamily: 'inherit',
              }}>
                LEADERBOARD
              </Link>
              <div style={{ flex: 1, height: 1, background: '#000' }} />
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                border: '2px solid #C85A5A',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 700, color: '#C85A5A',
                margin: '0 8px', flexShrink: 0,
              }}>
                {myScore}
              </div>
              <div style={{ flex: 1, height: 1, background: '#000' }} />
              <Link href={`/groups/${params.id}/submissions`} style={{
                border: '1px solid #000', padding: '6px 16px', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none',
                color: '#000', margin: '0 8px', fontFamily: 'inherit',
              }}>
                SUBMISSIONS
              </Link>
              <div style={{ flex: 1, height: 1, background: '#000' }} />
            </div>

            {/* Divider */}
            <div style={{ borderTop: '1px solid #eee', marginBottom: 20 }} />

            {/* Alphabet grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(13, 1fr)', gap: 4 }}>
              {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter, i) => {
                const weekNum = i + 1
                const isPast = weekNum < activeWeek.week_num
                const isCurrent = weekNum === activeWeek.week_num

                let bg: string, border: string, color: string
                if (isPast) {
                  bg = '#000'; border = '#000'; color = '#fff'
                } else if (isCurrent && !!mySubmission) {
                  bg = '#C85A5A'; border = '#C85A5A'; color = '#fff'
                } else {
                  bg = 'transparent'; border = '#ccc'; color = '#ccc'
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
          </div>
        )}

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

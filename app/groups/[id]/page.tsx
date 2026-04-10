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

  // Planet: ~280px diameter
  const cx = 300, cy = 150, r = 140

  // Ring centred at planet equator (cy).
  // irx/orx > r so ring extends outside the planet on both sides, flanking the timer.
  const irx = 220, iry = 10   // inner ring  (cx±220 = 80..520)
  const orx = 248, ory = 18   // outer ring  (cx±248 = 52..548)

  // Timer sits inline with the ring equator, inside the planet
  const timerY = cy             // = 150
  const timerMaskW = 152        // white rect width behind timer (DD:HH:MM:SS + padding)

  // Letter in upper portion of planet, clear of the ring
  const letterY = cy - 55       // = 95

  return (
    <svg width="100%" viewBox="0 0 600 310" style={{ display: 'block', margin: '0 auto', maxWidth: 600 }}>
      <defs>
        {/* satBack: upper half only — ring arcs that go behind the planet */}
        <clipPath id="satBack">
          <rect x="-5" y="-5" width="610" height={cy + 5} />
        </clipPath>
        {/* satFront: lower half only — ring arcs that pass in front of the planet */}
        <clipPath id="satFront">
          <rect x="-5" y={cy} width="610" height="325" />
        </clipPath>
      </defs>

      {/* 1. Back arcs — upper half of ring, will be hidden behind the planet */}
      <ellipse cx={cx} cy={cy} rx={irx} ry={iry}
        fill="none" stroke="#000" strokeWidth="1.5"
        clipPath="url(#satBack)" />
      <ellipse cx={cx} cy={cy} rx={orx} ry={ory}
        fill="none" stroke="#000" strokeWidth="1.5"
        clipPath="url(#satBack)" />

      {/* 2. Planet sphere — white fill masks back arcs inside the circle */}
      <circle cx={cx} cy={cy} r={r} fill="white" stroke="#000" strokeWidth="1.5" />

      {/* 3. Front arcs — lower half of ring, drawn on top of the planet */}
      <ellipse cx={cx} cy={cy} rx={irx} ry={iry}
        fill="none" stroke="#000" strokeWidth="1.5"
        clipPath="url(#satFront)" />
      <ellipse cx={cx} cy={cy} rx={orx} ry={ory}
        fill="none" stroke="#000" strokeWidth="1.5"
        clipPath="url(#satFront)" />

      {/* 4. White mask — interrupts ring lines exactly where the timer text sits */}
      <rect
        x={cx - timerMaskW / 2} y={cy - 14}
        width={timerMaskW} height={28}
        fill="white"
      />

      {/* 5. Timer — sits in the ring band, flanked by ring arcs on left and right */}
      <text x={cx} y={timerY}
        textAnchor="middle" dominantBaseline="middle"
        fontFamily="'Inconsolata', 'Courier New', monospace"
        fontSize="15" fontWeight="700"
        fill="#000">
        {timeLeft}
      </text>

      {/* 6. Letter in upper portion of planet */}
      <text x={cx} y={letterY}
        textAnchor="middle" dominantBaseline="middle"
        fontFamily="'Inconsolata', 'Courier New', monospace"
        fontSize="80" fontWeight="900"
        fill={hasSubmitted ? '#246c46' : '#C85A5A'}>
        {letter}
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
    <footer style={{ textAlign: 'center', padding: '8px 0 8px' }}>
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
  const [scoreExpanded, setScoreExpanded] = useState(false)
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
        <div className="group-title-box">
          <div style={{ fontSize: 22, letterSpacing: '0.2em', textTransform: 'uppercase' }}>THE ALPHABET PROJECT</div>
          <div style={{ fontSize: 11, color: '#C85A5A', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 6 }}>SEASON 1</div>
        </div>

        {/* Planet widget + ENTER/EDIT button */}
        {!isCompleted && (
          <div style={{ marginBottom: 20, textAlign: 'center' }}>
            {currentWeek && !windowClosed ? (
              <>
                <PlanetWidget
                  letter={currentWeek.letter}
                  closesAt={currentWeek.closes_at}
                  hasSubmitted={!!mySubmission}
                />
                <div style={{ marginTop: 16 }}>
                  <Link
                    href={`/groups/${params.id}/submit${mySubmission ? '?edit=1' : ''}`}
                    style={{
                      display: 'inline-block',
                      border: '1px solid #000',
                      borderRadius: 8,
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

        {/* Score box — collapsed: just the nav row. Expanded: adds A–Z grid. */}
        {activeWeek && (
          <div style={{ border: scoreExpanded ? '1px solid #000' : 'none', padding: scoreExpanded ? '16px' : '8px 0', marginBottom: 12 }}>

            {/* YOUR SCORE label */}
            <div style={{ textAlign: 'center', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999', marginBottom: 12 }}>
              YOUR SCORE
            </div>

            {/* LEADERBOARD — score circle (clickable toggle) — SUBMISSIONS */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ flex: 1, height: 1, background: '#000' }} />
              <Link href={`/groups/${params.id}/leaderboard`} style={{
                border: '1px solid #000', borderRadius: 8, padding: '6px 16px', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none',
                color: '#000', margin: '0 8px', fontFamily: 'inherit',
              }}>
                LEADERBOARD
              </Link>
              <div style={{ flex: 1, height: 1, background: '#000' }} />
              <button
                onClick={() => setScoreExpanded(v => !v)}
                className={`score-circle-btn${scoreExpanded ? ' is-expanded' : ''}`}
                style={{
                  width: 52, height: 52, borderRadius: '50%',
                  border: '2px solid #C85A5A',
                  background: scoreExpanded ? '#C85A5A' : 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, fontWeight: 700, color: scoreExpanded ? '#fff' : '#C85A5A',
                  margin: '0 8px', flexShrink: 0, fontFamily: 'inherit',
                }}
              >
                {myScore}
              </button>
              <div style={{ flex: 1, height: 1, background: '#000' }} />
              <Link href={`/groups/${params.id}/submissions`} style={{
                border: '1px solid #000', borderRadius: 8, padding: '6px 16px', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none',
                color: '#000', margin: '0 8px', fontFamily: 'inherit',
              }}>
                SUBMISSIONS
              </Link>
              <div style={{ flex: 1, height: 1, background: '#000' }} />
            </div>

            {/* Expanded: A–Z grid */}
            {scoreExpanded && (
              <>
                <div style={{ borderTop: '1px solid #eee', margin: '20px 0' }} />
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
              </>
            )}
          </div>
        )}

        {/* Rules box */}
        <div style={{ border: rulesExpanded ? '1px solid #000' : 'none', padding: rulesExpanded ? '20px 32px' : '8px 32px', marginBottom: 0 }}>
          <button
            onClick={() => setRulesExpanded(!rulesExpanded)}
            style={{
              display: 'block', width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 22, letterSpacing: '0.08em', textAlign: 'center',
              fontFamily: 'inherit', fontWeight: 'normal', padding: 0,
              marginBottom: rulesExpanded ? 20 : 0,
            }}
          >
            ?
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

'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Nav from '@/components/layout/Nav'

function Countdown({ targetAt, label }: { targetAt: string; label: string }) {
  const [timeLeft, setTimeLeft] = useState('00:00:00')
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
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.05em' }}>{timeLeft}</div>
      <div style={{ fontSize: 8, textTransform: 'uppercase', color: '#aaa', letterSpacing: '0.1em', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function stripHtml(html: string, maxChars = 180): string {
  const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  return text.length <= maxChars ? text : text.slice(0, maxChars).trim()
}

function Footer() {
  return (
    <footer style={{ textAlign: 'center', padding: '8px 0 8px' }}>
      <span style={{ fontSize: 12, color: '#ccc', letterSpacing: '0.18em' }}>MOUNTFORD-GAMBOSI</span>
    </footer>
  )
}

const CARD: React.CSSProperties = {
  border: '1px solid #000',
  background: '#fafaf8',
  overflow: 'hidden',
}

const RULES_DATA = [
  ['One submission per letter', 'You get one entry per week. Everyone is anonymous by default, but you can choose to sign a submission if you like. You can add pictures and music as well.'],
  ['Your word must start with the letter', 'Your title can be any word or phrase, it just has to begin with that week\'s letter. You can write whatever you like, however you like.'],
  ['Edit until Wednesday 23:59', 'You can change your submission at any time before the window closes. After that, it\'s locked.'],
  ['Hidden until midnight Wednesday', 'Nobody can see anyone else\'s submission until the reveal. Not the title, not the content. You will get an email every Wednesday with the week\'s submissions, as well as having them unlocked on here.'],
  ['Scoring', 'You score points by keeping your word. Miss a week, miss a point.'],
]

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export default function GroupPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [group, setGroup] = useState<any>(null)
  const [currentWeek, setCurrentWeek] = useState<any>(null)
  const [mySubmission, setMySubmission] = useState<any>(null)
  const [nextWeek, setNextWeek] = useState<any>(null)
  const [isCompleted, setIsCompleted] = useState(false)
  const [rulesExpanded, setRulesExpanded] = useState(false)
  const [submittedWeekNums, setSubmittedWeekNums] = useState<Set<number>>(new Set())
  const [revealedWeekNums, setRevealedWeekNums] = useState<Set<number>>(new Set())
  const [recentRevealedWeek, setRecentRevealedWeek] = useState<any>(null)
  const [recentRevealedSubs, setRecentRevealedSubs] = useState<any[]>([])
  const rulesInitialized = useRef(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && !rulesInitialized.current) {
      rulesInitialized.current = true
      const key = `myword_rules_seen_${params.id}`
      if (!localStorage.getItem(key)) {
        setRulesExpanded(true)
        localStorage.setItem(key, '1')
      }
    }
  }, [params.id])

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

      // Fetch all weeks for progress strip
      const { data: allWeeks } = await supabase
        .from('weeks').select('id, week_num, revealed_at, letter').eq('group_id', params.id)
      const wks = allWeeks || []

      // User submissions for progress strip
      const { data: userSubs } = await supabase
        .from('submissions').select('week_id').eq('user_id', userId).eq('is_late_catchup', false)
      const submittedWeekIds = new Set((userSubs || []).map((s: any) => s.week_id))

      setSubmittedWeekNums(new Set(
        wks.filter((w: any) => submittedWeekIds.has(w.id)).map((w: any) => w.week_num as number)
      ))
      setRevealedWeekNums(new Set(
        wks.filter((w: any) => w.revealed_at).map((w: any) => w.week_num as number)
      ))

      // Card 4: most recently revealed week + its pieces
      const revealedWeeks = wks.filter((w: any) => w.revealed_at).sort((a: any, b: any) => b.week_num - a.week_num)
      if (revealedWeeks.length > 0) {
        const latestWeekId = revealedWeeks[0].id

        const [{ data: fullWeek }, { data: subs }, { data: favs }] = await Promise.all([
          supabase.from('weeks').select('*').eq('id', latestWeekId).single(),
          supabase.from('submissions').select('*').eq('week_id', latestWeekId).eq('is_late_catchup', false).order('created_at', { ascending: true }),
          supabase.from('favourites').select('submission_id').eq('group_id', params.id),
        ])

        setRecentRevealedWeek(fullWeek)

        if (subs && subs.length > 0) {
          const favCounts: Record<string, number> = {}
          for (const f of favs || []) {
            favCounts[f.submission_id] = (favCounts[f.submission_id] || 0) + 1
          }
          const subsWithCounts = subs.map((s: any) => ({ ...s, favCount: favCounts[s.id] || 0 }))
          const maxFav = Math.max(...subsWithCounts.map((s: any) => s.favCount))
          const topSubs = subsWithCounts.filter((s: any) => s.favCount === maxFav)
          const mostLoved = topSubs[Math.floor(Math.random() * topSubs.length)]
          const rest = subsWithCounts.filter((s: any) => s.id !== mostLoved.id).sort(() => Math.random() - 0.5)

          let picks: any[]
          if (subsWithCounts.length <= 3) {
            picks = subsWithCounts.map((s: any) => ({ ...s, isMostLoved: s.id === mostLoved.id }))
          } else {
            picks = [{ ...mostLoved, isMostLoved: true }, ...rest.slice(0, 2).map((s: any) => ({ ...s, isMostLoved: false }))]
          }
          setRecentRevealedSubs(picks)
        }
      }

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
  const submittedCount = submittedWeekNums.size

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      {isCompleted && (
        <div style={{ background: '#000', color: '#fff', textAlign: 'center', padding: 8, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          ★ THE ALPHABET PROJECT IS COMPLETE — A TO Z ★
        </div>
      )}

      <Nav />

      <main style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: 800, width: '100%', margin: '0 auto', boxSizing: 'border-box', background: '#f0efeb' }}>

        {/* Card 1 — Header */}
        <div style={CARD}>
          <div className="group-title-box" style={{ border: 'none', marginBottom: 0 }}>
            <div style={{ fontSize: 22, letterSpacing: '0.2em', textTransform: 'uppercase' }}>THE ALPHABET PROJECT</div>
            <div style={{ fontSize: 11, color: '#C85A5A', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 6 }}>SEASON 1</div>
          </div>
        </div>

        {/* Card 2 — Progress strip */}
        <div style={{ ...CARD, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#999' }}>Your progress</span>
            <span style={{ fontSize: 11, fontWeight: 700 }}>{submittedCount} / 26</span>
          </div>
          {/* Row 1: A–M */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(13, 1fr)', gap: 5 }}>
            {ALPHABET.slice(0, 13).map((letter, i) => {
              const weekNum = i + 1
              const isSubmitted = submittedWeekNums.has(weekNum)
              const isMissed = revealedWeekNums.has(weekNum) && !isSubmitted
              const isCurrent = currentWeek?.week_num === weekNum
              let bg: string, border: string, color: string, borderWidth: number
              if (isSubmitted) { bg = '#C85A5A'; border = '#C85A5A'; color = '#fff'; borderWidth = 1 }
              else if (isMissed) { bg = '#000'; border = '#000'; color = '#fff'; borderWidth = 1 }
              else if (isCurrent) { bg = 'transparent'; border = '#000'; color = '#000'; borderWidth = 2 }
              else { bg = 'transparent'; border = '#ddd'; color = '#ddd'; borderWidth = 1 }
              return (
                <div key={letter} style={{ aspectRatio: '1', borderRadius: '50%', border: `${borderWidth}px solid ${border}`, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(9px, 1.8vw, 13px)', fontWeight: 700, fontFamily: 'monospace', lineHeight: 1, color }}>
                  {letter}
                </div>
              )
            })}
          </div>
          {/* Row 2: N–Z */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(13, 1fr)', gap: 5, marginTop: 5 }}>
            {ALPHABET.slice(13, 26).map((letter, i) => {
              const weekNum = i + 14
              const isSubmitted = submittedWeekNums.has(weekNum)
              const isMissed = revealedWeekNums.has(weekNum) && !isSubmitted
              const isCurrent = currentWeek?.week_num === weekNum
              let bg: string, border: string, color: string, borderWidth: number
              if (isSubmitted) { bg = '#C85A5A'; border = '#C85A5A'; color = '#fff'; borderWidth = 1 }
              else if (isMissed) { bg = '#000'; border = '#000'; color = '#fff'; borderWidth = 1 }
              else if (isCurrent) { bg = 'transparent'; border = '#000'; color = '#000'; borderWidth = 2 }
              else { bg = 'transparent'; border = '#ddd'; color = '#ddd'; borderWidth = 1 }
              return (
                <div key={letter} style={{ aspectRatio: '1', borderRadius: '50%', border: `${borderWidth}px solid ${border}`, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(9px, 1.8vw, 13px)', fontWeight: 700, fontFamily: 'monospace', lineHeight: 1, color }}>
                  {letter}
                </div>
              )
            })}
          </div>
        </div>

        {/* Card 3 — Hero widget */}
        {!isCompleted && (
          <div style={{ ...CARD, display: 'grid', gridTemplateColumns: 'auto 1fr auto' }}>
            {/* Left: saturn + timer */}
            <div style={{ borderRight: '1px solid #000', padding: '16px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, minWidth: 84 }}>
              <img src="/saturn.svg" alt="Saturn" style={{ width: 52, height: 'auto' }} />
              {activeWeek && currentWeek && (
                <Countdown targetAt={currentWeek.closes_at} label="closes in" />
              )}
              {activeWeek && !currentWeek && nextWeek && (
                <Countdown targetAt={nextWeek.opens_at} label="opens in" />
              )}
            </div>

            {/* Centre: current letter */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
              {activeWeek && (
                <div style={{ fontSize: 88, fontWeight: 900, color: '#C85A5A', fontFamily: 'monospace', lineHeight: 1 }}>
                  {activeWeek.letter}
                </div>
              )}
            </div>

            {/* Right: action buttons */}
            <div style={{ borderLeft: '1px solid #000', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', justifyContent: 'center', minWidth: 110 }}>
              {activeWeek && currentWeek && (
                mySubmission ? (
                  <Link href={`/groups/${params.id}/submit?edit=1`} style={{ textDecoration: 'none', width: '100%' }}>
                    <button style={{ borderRadius: 20, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'monospace', padding: '9px 10px', width: '100%', cursor: 'pointer', background: 'none', border: '1px solid #000', color: '#000' }}>
                      EDIT
                    </button>
                  </Link>
                ) : (
                  <Link href={`/groups/${params.id}/submit`} style={{ textDecoration: 'none', width: '100%' }}>
                    <button style={{ borderRadius: 20, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'monospace', padding: '9px 10px', width: '100%', cursor: 'pointer', background: '#C85A5A', border: '1px solid #C85A5A', color: '#fff' }}>
                      SUBMIT
                    </button>
                  </Link>
                )
              )}
              <Link href={`/groups/${params.id}/leaderboard`} style={{ textDecoration: 'none', width: '100%' }}>
                <button style={{ borderRadius: 20, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'monospace', padding: '9px 10px', width: '100%', cursor: 'pointer', background: 'none', border: '1px solid #000', color: '#000' }}>
                  LEADERBOARD
                </button>
              </Link>
              <Link href={`/groups/${params.id}/submissions`} style={{ textDecoration: 'none', width: '100%' }}>
                <button style={{ borderRadius: 20, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'monospace', padding: '9px 10px', width: '100%', cursor: 'pointer', background: 'none', border: '1px solid #000', color: '#000' }}>
                  INDEX
                </button>
              </Link>
            </div>
          </div>
        )}

        {/* Card 4 — Most recently revealed */}
        {recentRevealedWeek && recentRevealedSubs.length > 0 && (
          <div style={CARD}>
            {/* Header */}
            <div style={{ fontSize: 9, textTransform: 'uppercase', color: '#999', letterSpacing: '0.12em', padding: '14px 20px 12px' }}>
              Most recently revealed · {recentRevealedWeek.letter}
            </div>

            {/* Pieces */}
            {recentRevealedSubs.map((sub, idx) => (
              <div
                key={sub.id}
                onClick={() => router.push(`/groups/${params.id}/submissions?view=read&anchor=${sub.id}`)}
                style={{
                  borderTop: '1px solid #eee',
                  padding: '14px 20px',
                  cursor: 'pointer',
                  borderLeft: sub.isMostLoved ? '2px solid #C85A5A' : undefined,
                  marginLeft: sub.isMostLoved ? -1 : undefined,
                  paddingLeft: sub.isMostLoved ? 12 : undefined,
                }}
              >
                {sub.is_signed && sub.signed_name && (
                  <div style={{ fontSize: 10, fontStyle: 'italic', color: '#888', marginBottom: 4 }}>
                    {sub.signed_name}
                  </div>
                )}
                <div style={{ fontSize: 13, fontWeight: 700, color: '#000', marginBottom: 5 }}>
                  {sub.word_title}
                </div>
                <div style={{ fontSize: 11, color: '#555', lineHeight: 1.6 }}>
                  {stripHtml(sub.body_html || '', 180)}{sub.body_html && stripHtml(sub.body_html, 180).length < (sub.body_html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()).length ? '…' : ''}
                </div>
              </div>
            ))}

            {/* Footer */}
            <div style={{ borderTop: '1px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px' }}>
              <span style={{ fontSize: 9, textTransform: 'uppercase', color: '#888', letterSpacing: '0.08em' }}>
                Week {recentRevealedWeek.week_num} of 26
              </span>
              <span
                onClick={() => router.push(`/groups/${params.id}/submissions?view=read&letter=${recentRevealedWeek.letter}`)}
                style={{ fontSize: 9, textTransform: 'uppercase', color: '#000', letterSpacing: '0.08em', borderBottom: '1px solid #000', cursor: 'pointer' }}
              >
                Read all of {recentRevealedWeek.letter} →
              </span>
            </div>
          </div>
        )}

        {/* Card 5 — Rules */}
        <div style={CARD}>
          <button
            onClick={() => setRulesExpanded(v => !v)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: '100%', padding: '14px 20px', cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit', borderBottom: rulesExpanded ? '1px solid #000' : 'none' }}
          >
            <span style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700 }}>RULES</span>
            <span style={{ position: 'absolute', right: 20, fontSize: 10, color: '#999' }}>{rulesExpanded ? '▲' : '▼'}</span>
          </button>
          {rulesExpanded && (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {RULES_DATA.map(([title, body], i) => (
                <div key={i}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                    {i + 1}. {title}
                  </div>
                  <div style={{ fontSize: 12, color: '#555', lineHeight: 1.7 }}>{body}</div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>

      <Footer />
    </div>
  )
}

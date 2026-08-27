'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Nav from '@/components/layout/Nav'


function getBlurb(html: string): string {
  if (!html) return ''
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return withBreaks.slice(0, 300) + (withBreaks.length > 300 ? '…' : '')
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
  background: '#fff',
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
  const [lastRevealedWeek, setLastRevealedWeek] = useState<any>(null)
  const [lastRevealedSubs, setLastRevealedSubs] = useState<any[]>([])
  const [communityFavourites, setCommunityFavourites] = useState<Record<string, string>>({})
  const [displayPieces, setDisplayPieces] = useState<any[]>([])
  const [timerString, setTimerString] = useState('--:--:--')
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
    const target = currentWeek?.closes_at || nextWeek?.opens_at
    if (!target) return
    const tick = () => {
      const diff = new Date(target).getTime() - Date.now()
      if (diff <= 0) { setTimerString('00:00:00'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimerString(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [currentWeek?.closes_at, nextWeek?.opens_at])

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
      const { data: latestWeek } = await supabase
        .from('weeks')
        .select('*')
        .eq('group_id', params.id)
        .not('revealed_at', 'is', null)
        .order('week_num', { ascending: false })
        .limit(1)
        .single()

      if (latestWeek) {
        const { data: latestSubs } = await supabase
          .from('submissions')
          .select('*, users(*)')
          .eq('week_id', latestWeek.id)
          .eq('is_late_catchup', false)
        setLastRevealedWeek(latestWeek)
        setLastRevealedSubs(latestSubs || [])

        const { data: favs } = await supabase
          .from('favourites').select('submission_id, week_id').eq('group_id', params.id)
        const weekCounts: Record<string, Record<string, number>> = {}
        for (const f of favs || []) {
          if (!weekCounts[f.week_id]) weekCounts[f.week_id] = {}
          weekCounts[f.week_id][f.submission_id] = (weekCounts[f.week_id][f.submission_id] || 0) + 1
        }
        const commFavMap: Record<string, string> = {}
        for (const [weekId, counts] of Object.entries(weekCounts)) {
          const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
          if (top) commFavMap[weekId] = top[0]
        }
        setCommunityFavourites(commFavMap)

        const mostLovedId = commFavMap[latestWeek.id]
        const mostLoved = (latestSubs || []).find((s: any) => s.id === mostLovedId) || null
        const remaining = (latestSubs || []).filter((s: any) => s.id !== mostLovedId)
        const shuffled = [...remaining].sort(() => Math.random() - 0.5)
        const picks = shuffled.slice(0, 2)
        setDisplayPieces(mostLoved ? [mostLoved, ...picks] : picks.slice(0, 3))
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

      <main style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: 800, width: '100%', margin: '0 auto', boxSizing: 'border-box', background: '#fff' }}>

        {/* Card 1 — Header */}
        <div style={CARD}>
          <div className="group-title-box" style={{ border: 'none', marginBottom: 0 }}>
            <div style={{ fontSize: 22, letterSpacing: '0.2em', textTransform: 'uppercase' }}>{group?.name}</div>
          </div>
        </div>

        {/* Card 2 — Hero widget (active season) / simplified links (completed season) */}
        {isCompleted && (
          <div style={{ ...CARD, padding: '14px 16px', display: 'flex', gap: 8 }}>
            <Link
              href={`/groups/${params.id}/leaderboard`}
              style={{ flex: 1, display: 'block', borderRadius: '999px', border: '1px solid #000', padding: '11px 10px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'monospace', background: 'transparent', color: '#000', textAlign: 'center', textDecoration: 'none', transition: 'background 0.15s, color 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#000'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#000' }}
            >
              LEADERBOARD
            </Link>
            <Link
              href={`/groups/${params.id}/submissions`}
              style={{ flex: 1, display: 'block', borderRadius: '999px', border: '1px solid #000', padding: '11px 10px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'monospace', background: 'transparent', color: '#000', textAlign: 'center', textDecoration: 'none', transition: 'background 0.15s, color 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#000'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#000' }}
            >
              READ
            </Link>
          </div>
        )}
        {!isCompleted && (
          <div style={{ ...CARD, display: 'grid', gridTemplateColumns: '1fr auto' }}>
            {/* Left: saturn photo panel */}
            <div style={{
              position: 'relative',
              backgroundImage: 'url(/saturn-bg.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center right',
              backgroundColor: '#111',
              minHeight: 160,
              overflow: 'hidden',
              borderRight: '1px solid #000',
            }}>
              {/* Dark overlay for legibility */}
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
              {/* Week label top-left */}
              {activeWeek && (
                <div style={{ position: 'absolute', top: 14, left: 18, fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', zIndex: 1 }}>
                  {activeWeek.letter ? `Week ${activeWeek.week_num} of 26` : 'The Collection Week'}
                </div>
              )}
              {/* Big letter centred (or EPILOGUE for the letter-less week) */}
              {activeWeek && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: activeWeek.letter ? 110 : 42, fontWeight: 900, lineHeight: 1, color: 'rgba(255,255,255,0.92)', fontFamily: 'monospace', zIndex: 1, pointerEvents: 'none', letterSpacing: activeWeek.letter ? undefined : '0.1em' }}>
                  {activeWeek.letter || 'EPILOGUE'}
                </div>
              )}
              {/* Timer bottom-left */}
              <div style={{ position: 'absolute', bottom: 14, left: 18, zIndex: 1 }}>
                <div style={{ fontSize: 13, fontFamily: 'monospace', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.8)' }}>{timerString}</div>
                <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                  {currentWeek ? 'closes in' : 'opens in'}
                </div>
              </div>
            </div>

            {/* Right: action buttons */}
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', justifyContent: 'center', minWidth: 110 }}>
              {activeWeek && currentWeek && (
                mySubmission ? (
                  <Link
                    href={activeWeek.letter ? `/groups/${params.id}/submit?edit=1` : `/groups/${params.id}/collection`}
                    style={{ display: 'block', borderRadius: '999px', border: '1px solid #000', padding: '9px 10px', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'monospace', background: 'transparent', color: '#000', textAlign: 'center', textDecoration: 'none', transition: 'background 0.15s, color 0.15s', width: '100%', boxSizing: 'border-box' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#000'; e.currentTarget.style.color = '#fff' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#000' }}
                  >
                    EDIT
                  </Link>
                ) : (
                  <Link
                    href={activeWeek.letter ? `/groups/${params.id}/submit` : `/groups/${params.id}/collection`}
                    style={{ display: 'block', borderRadius: '999px', border: '1px solid #C85A5A', padding: '9px 10px', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'monospace', background: '#C85A5A', color: '#fff', textAlign: 'center', textDecoration: 'none', transition: 'background 0.15s, color 0.15s, border-color 0.15s', width: '100%', boxSizing: 'border-box' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#000'; e.currentTarget.style.borderColor = '#000' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#C85A5A'; e.currentTarget.style.borderColor = '#C85A5A' }}
                  >
                    SUBMIT
                  </Link>
                )
              )}
              <Link
                href={`/groups/${params.id}/leaderboard`}
                style={{ display: 'block', borderRadius: '999px', border: '1px solid #000', padding: '9px 10px', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'monospace', background: 'transparent', color: '#000', textAlign: 'center', textDecoration: 'none', transition: 'background 0.15s, color 0.15s', width: '100%', boxSizing: 'border-box' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#000'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#000' }}
              >
                LEADERBOARD
              </Link>
              <Link
                href={`/groups/${params.id}/submissions`}
                style={{ display: 'block', borderRadius: '999px', border: '1px solid #000', padding: '9px 10px', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'monospace', background: 'transparent', color: '#000', textAlign: 'center', textDecoration: 'none', transition: 'background 0.15s, color 0.15s', width: '100%', boxSizing: 'border-box' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#000'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#000' }}
              >
                READ
              </Link>
            </div>
          </div>
        )}

        {/* Card 3 — Most recently revealed */}
        {lastRevealedWeek && displayPieces.length > 0 && (() => {
          const mostLovedId = communityFavourites[lastRevealedWeek.id]
          return (
            <div style={CARD}>
              <div style={{ fontSize: 9, textTransform: 'uppercase', color: '#999', letterSpacing: '0.12em', padding: '14px 20px 12px' }}>
                Most recently revealed · {lastRevealedWeek.letter || 'Epilogue'}
              </div>
              {displayPieces.map((sub: any) => {
                const isMostLoved = sub.id === mostLovedId
                const blurb = getBlurb(sub.body_html || '')
                return (
                  <div
                    key={sub.id}
                    onClick={() => router.push(`/groups/${params.id}/submissions?view=read&anchor=${sub.id}`)}
                    style={{
                      borderTop: '1px solid #eee',
                      padding: '16px 20px',
                      paddingLeft: isMostLoved ? 18 : 20,
                      borderLeft: isMostLoved ? '2px solid #C85A5A' : undefined,
                      cursor: 'pointer',
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
                    <div style={{ fontSize: 11, color: '#555', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {blurb}
                    </div>
                  </div>
                )
              })}
              <div style={{ borderTop: '1px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px' }}>
                <span style={{ fontSize: 9, textTransform: 'uppercase', color: '#888', letterSpacing: '0.08em' }}>
                  {lastRevealedWeek.letter ? `Week ${lastRevealedWeek.week_num} of 26` : 'The Collection Week'}
                </span>
                <span
                  onClick={() => router.push(`/groups/${params.id}/submissions?view=read&letter=${lastRevealedWeek.letter || 'Epilogue'}`)}
                  className="pill-hover"
                  style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em' }}
                >
                  Read all of {lastRevealedWeek.letter || 'the epilogue'} →
                </span>
              </div>
            </div>
          )
        })()}

        {/* Card 4 — Progress strip */}
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

        {/* Card 5 — Rules */}
        <div style={CARD}>
          <button
            onClick={() => setRulesExpanded(v => !v)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: '100%', padding: '10px 20px', cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit', borderBottom: rulesExpanded ? '1px solid #000' : 'none' }}
          >
            <span className="pill-hover" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700 }}>RULES</span>
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

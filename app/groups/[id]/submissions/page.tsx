'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Nav from '@/components/layout/Nav'
import ImageGallery from '@/components/ui/ImageGallery'

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function buildWeekGroups(subs: any[]) {
  const weekMap: Record<string, { week: any; subs: any[] }> = {}
  for (const sub of subs) {
    if (!weekMap[sub.week_id]) weekMap[sub.week_id] = { week: sub.weeks, subs: [] }
    weekMap[sub.week_id].subs.push(sub)
  }
  return Object.values(weekMap).sort((a, b) => a.week?.week_num - b.week?.week_num)
}

function hasImage(html: string) { return /<img[\s>]/i.test(html) }
function hasAudio(html: string) { return /<audio[\s>]/i.test(html) }

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

function extractImages(html: string): string[] {
  const results: string[] = []
  const re = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) results.push(m[1])
  return results
}

function extractAudio(html: string): string[] {
  const results: string[] = []
  const srcRe = /<source[^>]+src=["']([^"']+)["'][^>]*>/gi
  let m: RegExpExecArray | null
  while ((m = srcRe.exec(html)) !== null) results.push(m[1])
  if (results.length) return results
  const audioRe = /<audio[^>]+src=["']([^"']+)["'][^>]*>/gi
  while ((m = audioRe.exec(html)) !== null) results.push(m[1])
  return results
}

// ──────────────────────────────────────────────
// Cabinet (kept, no longer rendered but preserved)
// ──────────────────────────────────────────────

function SubmissionRow({ sub, groupId, isMyVote, onFavourite }: {
  sub: any; groupId: string; isMyVote: boolean; onFavourite?: (submissionId: string, weekId: string) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid #e8e8e8', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 13, fontWeight: 700, flex: 1, minWidth: 120 }}>{sub.word_title}</span>
      <span style={{ display: 'inline-flex', gap: 4 }}>
        {hasImage(sub.body_html) && (
          <span style={{ border: '1px solid #ccc', padding: '1px 6px', fontSize: 10, letterSpacing: '0.06em', fontWeight: 700 }}>IMG</span>
        )}
        {hasAudio(sub.body_html) && (
          <span style={{ border: '1px solid #ccc', padding: '1px 6px', fontSize: 10, letterSpacing: '0.06em', fontWeight: 700 }}>AUD</span>
        )}
      </span>
      {sub.is_signed && sub.signed_name && (
        <span style={{ fontSize: 11, color: '#888', fontStyle: 'italic' }}>{sub.signed_name}</span>
      )}
      {onFavourite && (
        <button onClick={() => onFavourite(sub.id, sub.week_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: isMyVote ? '#C85A5A' : '#ccc', padding: '0 2px', fontFamily: 'inherit', lineHeight: 1, marginLeft: 'auto' }}>
          {isMyVote ? '♥' : '♡'}
        </button>
      )}
    </div>
  )
}

function Cabinet({ subs, groupId, myFavourites, onFavourite }: {
  subs: any[]; groupId: string; myFavourites: Record<string, string>; onFavourite?: (id: string, weekId: string) => void
}) {
  const groups = buildWeekGroups(subs)
  return (
    <div style={{ border: '1px solid #000', overflow: 'hidden' }}>
      {groups.map(({ week, subs: weekSubs }, gi) => (
        <div key={week?.id} style={{ borderTop: gi > 0 ? '2px solid #000' : 'none' }}>
          <div style={{ background: '#000', display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #C85A5A', background: '#C85A5A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>
              {week?.letter}
            </div>
          </div>
          {weekSubs.map(sub => (
            <SubmissionRow key={sub.id} sub={sub} groupId={groupId} isMyVote={myFavourites[sub.week_id] === sub.id} onFavourite={onFavourite} />
          ))}
        </div>
      ))}
    </div>
  )
}

// ──────────────────────────────────────────────
// Main page (inner — uses useSearchParams)
// ──────────────────────────────────────────────

function SubmissionsPageInner({ params }: { params: { id: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [weeks, setWeeks] = useState<any[]>([])
  const [tab, setTab] = useState<'all' | 'mine' | 'favourite'>('all')
  const [displayMode, setDisplayMode] = useState<'titles' | 'blurbs'>('titles')
  const [readView, setReadView] = useState(false)

  const [azSubs, setAZSubs] = useState<any[]>([])
  const [mySubs, setMySubs] = useState<any[]>([])
  const [loadingMine, setLoadingMine] = useState(false)
  const [mineFetched, setMineFetched] = useState(false)
  const [myFavourites, setMyFavourites] = useState<Record<string, string>>({})
  const [communityFavourites, setCommunityFavourites] = useState<Record<string, string>>({})
  const [readFilter, setReadFilter] = useState<'all' | 'mine' | 'loved'>('all')
  const [currentLetter, setCurrentLetter] = useState('')
  const [navOpen, setNavOpen] = useState(false)
  const [envelopedByMe, setEnvelopedByMe] = useState<Set<string>>(new Set())
  const [envelopeToast, setEnvelopeToast] = useState('')

  const anchorParam = searchParams.get('anchor')
  const letterParam = searchParams.get('letter')

  // After read view renders, scroll to anchor or letter
  const readMounted = useRef(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (!readView || loading) return
    if (readMounted.current) return
    readMounted.current = true
    const target = anchorParam
      ? `sub-${anchorParam}`
      : letterParam
      ? `letter-${letterParam}`
      : null
    if (target) {
      setTimeout(() => {
        const el = document.getElementById(target)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [readView, loading, anchorParam, letterParam])

  // IntersectionObserver for current letter in read view
  useEffect(() => {
    if (!readView || readFilter !== 'all') {
      observerRef.current?.disconnect()
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting)
        if (visible.length > 0) setCurrentLetter(visible[0].target.id.replace('letter-', ''))
      },
      { rootMargin: '-10% 0px -80% 0px', threshold: 0 }
    )
    observerRef.current = observer
    setTimeout(() => {
      document.querySelectorAll('[id^="letter-"]').forEach(el => observer.observe(el))
    }, 150)
    return () => observer.disconnect()
  }, [readView, readFilter])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: membership } = await supabase
        .from('group_members').select('*')
        .eq('group_id', params.id).eq('user_id', session.user.id).single()
      if (!membership) { router.push('/dashboard'); return }

      setUserId(session.user.id)

      const { data: allWeeks } = await supabase
        .from('weeks').select('*').eq('group_id', params.id).order('week_num', { ascending: true })
      const w = allWeeks || []
      setWeeks(w)

      const revealedIds = w.filter((wk: any) => wk.revealed_at && new Date(wk.revealed_at) < new Date()).map((wk: any) => wk.id)

      const { data: myFavs } = await supabase
        .from('favourites').select('submission_id, week_id')
        .eq('user_id', session.user.id).eq('group_id', params.id)
      const myFavMap: Record<string, string> = {}
      for (const f of myFavs || []) myFavMap[f.week_id] = f.submission_id
      setMyFavourites(myFavMap)

      const { data: allFavs } = await supabase
        .from('favourites').select('submission_id, week_id').eq('group_id', params.id)
      const weekCounts: Record<string, Record<string, number>> = {}
      for (const f of allFavs || []) {
        if (!weekCounts[f.week_id]) weekCounts[f.week_id] = {}
        weekCounts[f.week_id][f.submission_id] = (weekCounts[f.week_id][f.submission_id] || 0) + 1
      }
      const commFavMap: Record<string, string> = {}
      for (const [weekId, counts] of Object.entries(weekCounts)) {
        const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
        if (top) commFavMap[weekId] = top[0]
      }
      setCommunityFavourites(commFavMap)

      if (revealedIds.length > 0) {
        const { data } = await supabase
          .from('submissions').select('*, users(*), weeks(*)')
          .in('week_id', revealedIds).eq('is_late_catchup', false)
          .order('word_title', { ascending: true })
        setAZSubs(data || [])
      }

      // Envelopes sent by current user
      const { data: myEnvelopes } = await supabase
        .from('envelopes').select('submission_id').eq('from_user_id', session.user.id)
      setEnvelopedByMe(new Set((myEnvelopes || []).map((e: any) => e.submission_id)))

      // Check URL params
      const viewParam = searchParams.get('view')
      if (viewParam === 'read') setReadView(true)

      setLoading(false)
    }
    init()
  }, [])

  const switchToMine = async () => {
    setTab('mine')
    setReadView(false)
    if (mineFetched || !userId) return
    setLoadingMine(true)
    const revealedIds = weeks.filter((w: any) => w.revealed_at && new Date(w.revealed_at) < new Date()).map((w: any) => w.id)
    if (revealedIds.length === 0) { setLoadingMine(false); setMineFetched(true); return }
    const { data } = await supabase
      .from('submissions').select('*, users(*), weeks(*)')
      .eq('user_id', userId!).eq('is_late_catchup', false)
      .in('week_id', revealedIds).order('word_title', { ascending: true })
    setMySubs(data || [])
    setMineFetched(true)
    setLoadingMine(false)
  }

  const handleFavourite = async (submissionId: string, weekId: string) => {
    if (!userId) return
    const currentVote = myFavourites[weekId]
    if (currentVote === submissionId) {
      const { error } = await supabase.from('favourites').delete()
        .eq('user_id', userId).eq('week_id', weekId).eq('group_id', params.id)
      if (!error) setMyFavourites(prev => { const n = { ...prev }; delete n[weekId]; return n })
    } else {
      if (currentVote) await supabase.from('favourites').delete().eq('user_id', userId).eq('week_id', weekId).eq('group_id', params.id)
      const { error } = await supabase.from('favourites').insert({
        group_id: params.id, user_id: userId, submission_id: submissionId, week_id: weekId,
      })
      if (!error) setMyFavourites(prev => ({ ...prev, [weekId]: submissionId }))
    }
  }

  const handleEnvelope = async (sub: any) => {
    if (!userId || sub.user_id === userId) return
    setEnvelopedByMe(prev => { const s = new Set(prev); s.add(sub.id); return s })
    const res = await fetch('/api/envelope', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submission_id: sub.id, author_id: sub.user_id, group_id: params.id }),
    })
    const json = await res.json()
    if (json.mutual) {
      setEnvelopeToast('✉ It\'s a match!')
      setTimeout(() => setEnvelopeToast(''), 3500)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh' }}>
      <Nav />
      <div style={{ padding: '40px', fontSize: 13, color: '#999' }}>Loading...</div>
    </div>
  )

  const revealedWeeks = weeks
    .filter(w => w.revealed_at && new Date(w.revealed_at) < new Date())
    .sort((a, b) => a.week_num - b.week_num)

  const favouriteSubs = azSubs.filter(s => communityFavourites[s.week_id] === s.id).sort((a: any, b: any) => a.weeks?.week_num - b.weeks?.week_num)

  const tabBtn = (active: boolean) => ({
    width: 64, padding: '5px 0', fontSize: 10, letterSpacing: '0.1em',
    textTransform: 'uppercase' as const, textAlign: 'center' as const, cursor: 'pointer', fontFamily: 'monospace',
    borderRadius: 20, border: '1px solid #000', marginLeft: -1,
    background: active ? '#000' : 'transparent', color: active ? '#fff' : '#000',
  })

  const empty = (msg: string) => (
    <div style={{ border: '1px solid #ccc', padding: '40px', textAlign: 'center', fontSize: 13, color: '#666' }}>{msg}</div>
  )

  // Get subs for current tab
  const currentTabSubs = tab === 'all' ? azSubs : tab === 'mine' ? mySubs : favouriteSubs

  // Group subs by letter, return sorted sections.
  // A letter-less week (the epilogue) groups under 'Epilogue' rather than
  // being dropped — sorts last for free since its week_num is the highest.
  const buildLetterSections = (subs: any[], ascending = false) => {
    const grouped = subs.reduce((acc: Record<string, any[]>, sub: any) => {
      const letter = sub.weeks?.letter || 'Epilogue'
      if (!acc[letter]) acc[letter] = []
      acc[letter].push(sub)
      return acc
    }, {})
    const sortedLetters = Object.keys(grouped).sort((a, b) => {
      const aNum = grouped[a][0]?.weeks?.week_num ?? 0
      const bNum = grouped[b][0]?.weeks?.week_num ?? 0
      return aNum - bNum
    })
    return sortedLetters.map(letter => ({
      letter,
      weekId: grouped[letter][0]?.week_id as string,
      subs: grouped[letter] as any[],
    }))
  }

  // ────────────────────────────────
  // READ VIEW
  // ────────────────────────────────
  if (readView) {
    const readViewSubs = readFilter === 'mine'
      ? azSubs.filter((s: any) => s.user_id === userId)
      : readFilter === 'loved'
      ? azSubs.filter((s: any) => myFavourites[s.week_id] === s.id)
      : azSubs
    const letterSections = buildLetterSections(readViewSubs, true)
    const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Nav />
        <main className="page-main">
          {/* Header + filter tabs — sticky so the filter stays reachable while scrolling a long read */}
          <div style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 30, paddingTop: 4, marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <button
                  onClick={() => { setReadView(false); readMounted.current = false }}
                  className="pill-hover"
                  style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: '1px solid #000', fontFamily: 'inherit' }}
                >
                  GO BACK
                </button>
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 400, color: '#C85A5A', letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0, textAlign: 'center', fontFamily: 'inherit' }}>
                READ
              </h1>
              <div />
            </div>

            {/* Filter tabs — same MINE / ♥ / ALL control as the index view */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ display: 'flex' }}>
                <button
                  onClick={() => { setReadFilter('mine'); setTab('mine') }}
                  style={tabBtn(readFilter === 'mine')}
                >
                  MINE
                </button>
                <button
                  onClick={() => { setReadFilter('loved'); setTab('favourite') }}
                  style={tabBtn(readFilter === 'loved')}
                >
                  ♥
                </button>
                <button
                  onClick={() => { setReadFilter('all'); setTab('all') }}
                  style={tabBtn(readFilter === 'all')}
                >
                  ALL
                </button>
              </div>
            </div>
          </div>

          {revealedWeeks.length === 0
            ? empty('No revealed weeks yet.')
            : letterSections.length === 0
            ? empty(readFilter === 'mine' ? "You haven't submitted anything yet." : 'No loved pieces yet.')
            : letterSections.map(({ letter, weekId, subs: weekSubs }) => (
              <div key={weekId} style={{ marginBottom: 64 }}>
                {/* Letter anchor + header */}
                <div id={`letter-${letter}`} style={{ textAlign: 'center', fontSize: letter === 'Epilogue' ? 40 : 80, fontWeight: 900, color: '#C85A5A', lineHeight: 1, marginBottom: 8, letterSpacing: letter === 'Epilogue' ? '0.1em' : undefined, textTransform: letter === 'Epilogue' ? 'uppercase' : undefined }}>
                  {letter}
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid #000', margin: '0 0 32px' }} />

                {/* Pieces */}
                {weekSubs.map((sub, idx) => {
                  const images = extractImages(sub.body_html || '')
                  const audioSrcs = extractAudio(sub.body_html || '')
                  const hasAttachments = images.length > 0 || audioSrcs.length > 0
                  return (
                    <div key={sub.id}>
                      <div id={`sub-${sub.id}`} />
                      {/* Title */}
                      <div style={{ textAlign: 'center', marginBottom: 24 }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: '#C85A5A', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                          {sub.word_title}
                        </span>
                      </div>
                      {/* Body — img/audio stripped from prose */}
                      <div
                        className="submission-card-body"
                        style={{ fontSize: 14, lineHeight: 1.9, marginBottom: hasAttachments ? 16 : 32 }}
                        dangerouslySetInnerHTML={{ __html: (sub.body_html ?? '')
                          .replace(/<img[^>]*>/gi, '')
                          .replace(/<audio[^>]*>[\s\S]*?<\/audio>/gi, '')
                        }}
                      />
                      {/* Attachments block */}
                      {hasAttachments && (
                        <div style={{ border: '1px solid #ccc', padding: '20px 24px', marginBottom: 32 }}>
                          {images.length > 0 && <ImageGallery images={images} />}
                          {audioSrcs.map((src, i) => (
                            <audio key={i} controls src={src} style={{ width: '100%', marginTop: images.length > 0 ? 12 : 0 }} />
                          ))}
                        </div>
                      )}
                      {/* Author */}
                      {sub.is_signed && sub.signed_name && (
                        <div style={{ textAlign: 'right', marginBottom: 16, fontSize: 13, color: '#C85A5A', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                          {sub.signed_name}
                        </div>
                      )}
                      {/* Heart + envelope */}
                      <div style={{ textAlign: 'center', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                        <button
                          onClick={() => handleFavourite(sub.id, sub.week_id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: myFavourites[sub.week_id] === sub.id ? '#C85A5A' : '#ccc', padding: 0, fontFamily: 'inherit', lineHeight: 1 }}
                        >
                          {myFavourites[sub.week_id] === sub.id ? '♥' : '♡'}
                        </button>
                        {sub.user_id !== userId && (
                          <button
                            onClick={() => handleEnvelope(sub)}
                            title="Send envelope"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: envelopedByMe.has(sub.id) ? '#000' : '#ccc', padding: 0, fontFamily: 'inherit', lineHeight: 1 }}
                          >
                            ✉
                          </button>
                        )}
                      </div>
                      {/* Divider between pieces within same letter */}
                      {idx < weekSubs.length - 1 && (
                        <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '0 0 32px' }} />
                      )}
                    </div>
                  )
                })}
              </div>
            ))
          }
        </main>

        {/* Toast */}
        {envelopeToast && (
          <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: '#000', color: '#fff', padding: '10px 20px', fontSize: 12, letterSpacing: '0.1em', zIndex: 60 }}>
            {envelopeToast}
          </div>
        )}

        {/* Letter navigator — only when unfiltered */}
        {readFilter === 'all' && (
          <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 40 }}>
            {navOpen ? (
              <div style={{ background: '#fff', border: '1px solid #000', padding: '12px 8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingLeft: 4, paddingRight: 4 }}>
                  <span style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888' }}>JUMP TO</span>
                  <button onClick={() => setNavOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', lineHeight: 1, padding: 0 }}>✕</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
                  {allLetters.map(l => {
                    const exists = letterSections.some(s => s.letter === l)
                    return (
                      <button
                        key={l}
                        disabled={!exists}
                        onClick={() => {
                          const el = document.getElementById(`letter-${l}`)
                          if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); setNavOpen(false) }
                        }}
                        style={{
                          fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
                          padding: '5px 0', border: '1px solid',
                          borderColor: exists ? '#000' : '#eee',
                          background: currentLetter === l ? '#000' : 'transparent',
                          color: currentLetter === l ? '#fff' : exists ? '#000' : '#ddd',
                          cursor: exists ? 'pointer' : 'default',
                        }}
                      >
                        {l}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <button
                onClick={() => setNavOpen(true)}
                style={{
                  background: '#fff', border: '1px solid #000', padding: '7px 16px',
                  fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                  fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <span style={{ fontWeight: 900, fontFamily: 'monospace', fontSize: 14 }}>{currentLetter || '?'}</span>
                <span>JUMP</span>
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  // ────────────────────────────────
  // INDEX VIEW (titles / blurbs)
  // ────────────────────────────────

  const indexSections = buildLetterSections(currentTabSubs, false) // most recent first

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />
      <main className="page-main">

        {/* Header row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <Link href={`/groups/${params.id}`} className="pill-hover" style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', border: '1px solid #000' }}>
              GO BACK
            </Link>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 400, color: '#C85A5A', letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0, textAlign: 'center', fontFamily: 'inherit' }}>
            INDEX
          </h1>
          <div style={{ textAlign: 'right' }}>
            <button
              onClick={() => setDisplayMode(m => m === 'titles' ? 'blurbs' : 'titles')}
              style={{
                borderRadius: 20, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em',
                padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit',
                background: displayMode === 'blurbs' ? '#000' : 'transparent',
                color: displayMode === 'blurbs' ? '#fff' : '#000',
                border: '1px solid #000',
              }}
            >
              {displayMode === 'titles' ? 'Blurbs' : 'Titles'}
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ flex: 1, height: 1, background: '#000' }} />
          <div style={{ display: 'flex' }}>
            <button onClick={() => { switchToMine(); setReadFilter('mine') }} style={tabBtn(tab === 'mine' && !readView)}>MINE</button>
            <button onClick={() => { setTab('favourite'); setReadView(false); setReadFilter('loved') }} style={tabBtn(tab === 'favourite' && !readView)}>♥</button>
            <button onClick={() => { setTab('all'); setReadView(false); setReadFilter('all') }} style={tabBtn(tab === 'all' && !readView)}>ALL</button>
          </div>
          <div style={{ flex: 1, height: 1, background: '#000' }} />
        </div>

        {/* Content */}
        {tab === 'mine' && loadingMine && (
          <div style={{ fontSize: 13, color: '#666' }}>Loading...</div>
        )}

        {tab === 'mine' && !loadingMine && mineFetched && mySubs.length === 0 && (
          empty("You haven't submitted anything yet.")
        )}

        {tab === 'favourite' && favouriteSubs.length === 0 && (
          empty('No tastiest picks yet.')
        )}

        {tab === 'all' && azSubs.length === 0 && (
          empty('No revealed weeks yet.')
        )}

        {/* Letter sections */}
        {indexSections.length > 0 && (
          <div>
            {displayMode === 'titles' ? (
              // ── TITLES MODE ──
              indexSections.map(({ letter, weekId, subs: weekSubs }, gi) => (
                <div key={weekId}>
                  <div style={{ textAlign: 'center', fontSize: letter === 'Epilogue' ? 24 : 48, fontWeight: 900, fontFamily: 'monospace', color: '#000', marginBottom: 8, marginTop: gi > 0 ? 32 : 0, letterSpacing: letter === 'Epilogue' ? '0.1em' : undefined, textTransform: letter === 'Epilogue' ? 'uppercase' : undefined }}>
                    {letter}
                  </div>
                  {weekSubs.map(sub => {
                    const isMyVote = myFavourites[sub.week_id] === sub.id
                    return (
                      <div
                        key={sub.id}
                        style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '7px 0', borderTop: '1px solid #eee', cursor: 'pointer', gap: 12 }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                          <span
                            className="pill-hover"
                            onClick={() => { setReadView(true); readMounted.current = false; setTimeout(() => { const el = document.getElementById(`sub-${sub.id}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, 150) }}
                            style={{ fontSize: 14, letterSpacing: '0.02em', alignSelf: 'flex-start' }}
                          >{sub.word_title}</span>
                          {sub.is_signed && sub.signed_name && (
                            <span style={{ fontSize: 11, color: '#aaa', fontStyle: 'italic' }}>{sub.signed_name}</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignSelf: 'center' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleFavourite(sub.id, sub.week_id) }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: isMyVote ? '#C85A5A' : '#ddd', padding: 0, fontFamily: 'inherit' }}
                          >
                            ♥
                          </button>
                          {sub.user_id !== userId && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEnvelope(sub) }}
                              title="Send envelope"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: envelopedByMe.has(sub.id) ? '#000' : '#ddd', padding: 0, fontFamily: 'inherit' }}
                            >
                              ✉
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {gi < indexSections.length - 1 && (
                    <div style={{ borderTop: '1px solid #ddd', margin: '16px 0 0' }} />
                  )}
                </div>
              ))
            ) : (
              // ── BLURBS MODE ──
              indexSections.map(({ letter, weekId, subs: weekSubs }, gi) => (
                <div key={weekId}>
                  <div style={{ textAlign: 'center', fontSize: letter === 'Epilogue' ? 24 : 48, fontWeight: 900, fontFamily: 'monospace', color: '#000', marginBottom: 8, marginTop: gi > 0 ? 32 : 0, letterSpacing: letter === 'Epilogue' ? '0.1em' : undefined, textTransform: letter === 'Epilogue' ? 'uppercase' : undefined }}>
                    {letter}
                  </div>
                  {weekSubs.map(sub => {
                    const isMyVote = myFavourites[sub.week_id] === sub.id
                    const blurb = getBlurb(sub.body_html || '')
                    const imgs = hasImage(sub.body_html || '')
                    const auds = hasAudio(sub.body_html || '')
                    return (
                      <div
                        key={sub.id}
                        onClick={() => { setReadView(true); readMounted.current = false; setTimeout(() => { const el = document.getElementById(`sub-${sub.id}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, 150) }}
                        style={{ padding: '20px 0', borderTop: '1px solid #eee', cursor: 'pointer' }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#C85A5A', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                          {sub.word_title}
                        </div>
                        {sub.is_signed && sub.signed_name && (
                          <div style={{ fontSize: 11, color: '#aaa', fontStyle: 'italic', marginBottom: 10 }}>
                            {sub.signed_name}
                          </div>
                        )}
                        <div style={{ fontSize: 13, color: '#444', lineHeight: 1.8, marginBottom: 10, whiteSpace: 'pre-wrap' }}>
                          {blurb}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {imgs && (
                              <span style={{ fontSize: 9, textTransform: 'uppercase', border: '1px solid #ccc', borderRadius: 20, padding: '2px 7px', color: '#999' }}>JPG</span>
                            )}
                            {auds && (
                              <span style={{ fontSize: 9, textTransform: 'uppercase', border: '1px solid #ccc', borderRadius: 20, padding: '2px 7px', color: '#999' }}>MP3</span>
                            )}
                            {!imgs && !auds && <div />}
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleFavourite(sub.id, sub.week_id) }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: isMyVote ? '#C85A5A' : '#ddd', padding: 0, fontFamily: 'inherit' }}
                            >
                              ♥
                            </button>
                            {sub.user_id !== userId && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEnvelope(sub) }}
                                title="Send envelope"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: envelopedByMe.has(sub.id) ? '#000' : '#ddd', padding: 0, fontFamily: 'inherit' }}
                              >
                                ✉
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {gi < indexSections.length - 1 && (
                    <div style={{ borderTop: '1px solid #ddd', margin: '16px 0 0' }} />
                  )}
                </div>
              ))
            )}
          </div>
        )}

      </main>
    </div>
  )
}

// ──────────────────────────────────────────────
// Export with Suspense boundary for useSearchParams
// ──────────────────────────────────────────────

export default function SubmissionsPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh' }}>
        <Nav />
        <div style={{ padding: '40px', fontSize: 13, color: '#999' }}>Loading...</div>
      </div>
    }>
      <SubmissionsPageInner params={params} />
    </Suspense>
  )
}

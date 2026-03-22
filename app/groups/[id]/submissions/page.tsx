'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function htmlPreview(html: string, maxParas: number): { preview: string } {
  const stripped = html
    .replace(/<img[^>]*>/gi, '')
    .replace(/<audio[^>]*>[\s\S]*?<\/audio>/gi, '')
  const grafs = stripped.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || []
  const nonEmpty = grafs.filter(p => p.replace(/<[^>]+>/g, '').trim())
  return { preview: nonEmpty.slice(0, maxParas).join('') }
}

function AttachmentTags({ html }: { html: string }) {
  const hasImage = /<img[\s>]/i.test(html)
  const hasAudio = /<audio[\s>]/i.test(html)
  if (!hasImage && !hasAudio) return null
  return (
    <span style={{ display: 'inline-flex', gap: 4 }}>
      {hasImage && <span className="tag" style={{ color: '#2563eb', borderColor: '#93c5fd', background: '#eff6ff', fontSize: 9 }}>IMG</span>}
      {hasAudio && <span className="tag" style={{ color: '#db2777', borderColor: '#f9a8d4', background: '#fdf2f8', fontSize: 9 }}>AUD</span>}
    </span>
  )
}

function SubmissionCard({
  sub,
  groupId,
  userVotedThisWeek,
  onFavourite,
}: {
  sub: any
  groupId: string
  userVotedThisWeek: string | null
  onFavourite?: (submissionId: string, weekId: string) => void
}) {
  const name = sub.is_signed ? sub.signed_name : null
  const { preview } = htmlPreview(sub.body_html, 8)
  const hasVoted = userVotedThisWeek !== null
  const isMyVote = userVotedThisWeek === sub.id
  const contentRef = useRef<HTMLDivElement>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)

  useEffect(() => {
    const el = contentRef.current
    if (el) setIsOverflowing(el.scrollHeight > el.clientHeight)
  }, [preview])

  return (
    <div className="submission-card">
      <div className="submission-card-header">
        <span style={{ fontWeight: 'bold', fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>
          {sub.word_title}
        </span>
        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <AttachmentTags html={sub.body_html} />
          {onFavourite && (
            <button
              onClick={() => !hasVoted && onFavourite(sub.id, sub.week_id)}
              title={isMyVote ? 'Your favourite' : hasVoted ? 'Already voted this week' : 'Mark as favourite'}
              style={{
                background: 'none',
                border: 'none',
                cursor: hasVoted ? 'default' : 'pointer',
                color: isMyVote ? '#CC0000' : hasVoted ? '#ccc' : '#999',
                fontSize: 16,
                padding: '0 2px',
                lineHeight: 1,
                fontFamily: 'inherit',
              }}
            >
              {isMyVote ? '♥' : '♡'}
            </button>
          )}
        </span>
      </div>
      <div style={{ padding: '12px 16px' }}>
        <div ref={contentRef} style={{ position: 'relative', maxHeight: 150, overflow: 'hidden' }}>
          <div
            className="submission-card-body"
            style={{ padding: '0 16px', fontSize: 13 }}
            dangerouslySetInnerHTML={{ __html: preview }}
          />
          {isOverflowing && (
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 60,
              background: 'linear-gradient(to bottom, transparent, #fff)',
              pointerEvents: 'none',
            }} />
          )}
        </div>
        <Link
          href={`/groups/${groupId}/submissions/${sub.week_id}/${sub.id}`}
          style={{ fontSize: 12, marginTop: 10, display: 'inline-block' }}
        >
          Read full piece →
        </Link>
        {name && <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>{name}</div>}
      </div>
    </div>
  )
}

export default function SubmissionsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [weeks, setWeeks] = useState<any[]>([])
  const [view, setView] = useState<'az' | 'byletter' | 'mine' | 'favourite'>('az')

  // A-Z view state (default)
  const [azSubmissions, setAZSubmissions] = useState<any[]>([])
  const [loadingAZ, setLoadingAZ] = useState(false)

  // By Letter view state
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loadingSubs, setLoadingSubs] = useState(false)

  // Mine view state
  const [mySubmissions, setMySubmissions] = useState<any[]>([])
  const [loadingMine, setLoadingMine] = useState(false)

  // Favourite view state
  const [favouriteSubmissions, setFavouriteSubmissions] = useState<any[]>([])
  const [loadingFavourite, setLoadingFavourite] = useState(false)

  // User's votes: weekId → submissionId
  const [myFavourites, setMyFavourites] = useState<Record<string, string>>({})

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: membership } = await supabase
        .from('group_members').select('*')
        .eq('group_id', params.id).eq('user_id', session.user.id).single()
      if (!membership) { router.push('/dashboard'); return }

      const { data: prof } = await supabase.from('users').select('*').eq('id', session.user.id).single()
      setProfile(prof)
      setUserId(session.user.id)

      const { data: allWeeks } = await supabase
        .from('weeks').select('*').eq('group_id', params.id).order('week_num', { ascending: true })
      const w = allWeeks || []
      setWeeks(w)

      const revealedWeekIds = w
        .filter((wk: any) => wk.revealed_at && new Date(wk.revealed_at) < new Date())
        .map((wk: any) => wk.id)

      // Load user's favourites
      const { data: myFavs } = await supabase
        .from('favourites')
        .select('submission_id, week_id')
        .eq('user_id', session.user.id)
        .eq('group_id', params.id)
      const favMap: Record<string, string> = {}
      for (const f of myFavs || []) {
        favMap[f.week_id] = f.submission_id
      }
      setMyFavourites(favMap)

      // Load A-Z submissions (default view)
      if (revealedWeekIds.length > 0) {
        setLoadingAZ(true)
        const { data } = await supabase
          .from('submissions')
          .select('*, users(*), weeks(*)')
          .in('week_id', revealedWeekIds)
          .eq('is_late_catchup', false)
          .order('submitted_at', { ascending: true })
        setAZSubmissions(data || [])
        setLoadingAZ(false)
      }

      setLoading(false)
    }
    init()
  }, [])

  const switchToByLetter = async () => {
    setView('byletter')
    if (!selectedLetter) {
      const revealedWeeks = weeks.filter((w: any) => w.revealed_at && new Date(w.revealed_at) < new Date())
      if (revealedWeeks.length > 0) {
        const latest = revealedWeeks[revealedWeeks.length - 1]
        await loadSubmissions(latest, setSelectedLetter, setSubmissions, setLoadingSubs, supabase)
      }
    }
  }

  const handleLetterClick = async (week: any) => {
    if (!week.revealed_at || new Date(week.revealed_at) > new Date()) return
    await loadSubmissions(week, setSelectedLetter, setSubmissions, setLoadingSubs, supabase)
  }

  const switchToMine = async () => {
    setView('mine')
    if (mySubmissions.length > 0 || !userId) return
    setLoadingMine(true)
    const revealedWeekIds = weeks
      .filter((w: any) => w.revealed_at && new Date(w.revealed_at) < new Date())
      .map((w: any) => w.id)
    if (revealedWeekIds.length === 0) { setLoadingMine(false); return }
    const { data } = await supabase
      .from('submissions')
      .select('*, weeks(*)')
      .eq('user_id', userId)
      .eq('is_late_catchup', false)
      .in('week_id', revealedWeekIds)
      .order('week_id', { ascending: true })
    const sorted = (data || []).sort((a: any, b: any) => a.weeks?.week_num - b.weeks?.week_num)
    setMySubmissions(sorted)
    setLoadingMine(false)
  }

  const switchToFavourite = async () => {
    setView('favourite')
    setLoadingFavourite(true)

    const { data: allFavs } = await supabase
      .from('favourites')
      .select('submission_id, week_id')
      .eq('group_id', params.id)

    if (!allFavs?.length) {
      setFavouriteSubmissions([])
      setLoadingFavourite(false)
      return
    }

    // Count votes per submission per week
    const weekVotes: Record<string, Record<string, number>> = {}
    for (const fav of allFavs) {
      if (!weekVotes[fav.week_id]) weekVotes[fav.week_id] = {}
      weekVotes[fav.week_id][fav.submission_id] = (weekVotes[fav.week_id][fav.submission_id] || 0) + 1
    }

    // Find top submission per week
    const topIds = Object.values(weekVotes).map(counts =>
      Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    )

    const { data: topSubs } = await supabase
      .from('submissions')
      .select('*, users(*), weeks(*)')
      .in('id', topIds)
    const sorted = (topSubs || []).sort((a: any, b: any) => a.weeks?.week_num - b.weeks?.week_num)
    setFavouriteSubmissions(sorted)
    setLoadingFavourite(false)
  }

  const handleFavourite = async (submissionId: string, weekId: string) => {
    if (!userId) return
    const { error } = await supabase.from('favourites').insert({
      group_id: params.id,
      user_id: userId,
      submission_id: submissionId,
      week_id: weekId,
    })
    if (!error) {
      setMyFavourites(prev => ({ ...prev, [weekId]: submissionId }))
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh' }}>
      <nav className="nav"><Link href="/dashboard" className="nav-brand">[ MY WORD ]</Link></nav>
      <div className="page-container" style={{ paddingTop: 40 }}>Loading...</div>
    </div>
  )

  const toggleBtn = (active: boolean, hasLeftBorder: boolean = true) => ({
    padding: '6px 12px',
    fontSize: 11,
    fontWeight: 'bold' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    border: 'none',
    borderLeft: hasLeftBorder ? '2px solid #000' : 'none',
    cursor: 'pointer',
    background: active ? '#000' : '#fff',
    color: active ? '#fff' : '#000',
  })

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav className="nav">
        <Link href="/dashboard" className="nav-brand">[ MY WORD ]</Link>
        <Link href={`/groups/${params.id}`} className="nav-link">← Project</Link>
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

        {/* Title + toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h1 className="page-title" style={{ margin: 0 }}>Submissions</h1>
          <div style={{ display: 'flex', border: '2px solid #000', overflow: 'hidden' }}>
            <button onClick={() => setView('az')} style={toggleBtn(view === 'az', false)}>A–Z</button>
            <button onClick={switchToByLetter} style={toggleBtn(view === 'byletter')}>By Letter</button>
            <button onClick={switchToMine} style={toggleBtn(view === 'mine')}>Mine</button>
            <button onClick={switchToFavourite} style={toggleBtn(view === 'favourite')}>Favourite</button>
          </div>
        </div>
        <p style={{ fontSize: 11, color: '#999', fontStyle: 'italic', textAlign: 'right', marginBottom: 24 }}>
          Pick your favourite by hearting it! One time only.
        </p>

        {/* A-Z VIEW */}
        {view === 'az' && (
          <>
            {loadingAZ && <div style={{ fontSize: 14, color: '#666' }}>Loading...</div>}
            {!loadingAZ && azSubmissions.length === 0 && (
              <div className="box-shaded" style={{ textAlign: 'center', padding: 48 }}>
                <p style={{ fontSize: 14, color: '#666' }}>No revealed weeks yet.</p>
              </div>
            )}
            {!loadingAZ && azSubmissions.length > 0 && (() => {
              const weekMap: Record<string, { week: any; subs: any[] }> = {}
              for (const sub of azSubmissions) {
                if (!weekMap[sub.week_id]) weekMap[sub.week_id] = { week: sub.weeks, subs: [] }
                weekMap[sub.week_id].subs.push(sub)
              }
              const sortedWeeks = Object.values(weekMap).sort((a, b) => a.week?.week_num - b.week?.week_num)
              return (
                <div style={{ display: 'grid', gap: 40 }}>
                  {sortedWeeks.map(({ week, subs }) => (
                    <div key={week?.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, borderBottom: '3px solid #000', paddingBottom: 8 }}>
                        <span style={{ fontSize: 48, fontWeight: 'bold', color: '#CC0000', lineHeight: 1 }}>{week?.letter}</span>
                        <span style={{ fontSize: 13, color: '#666' }}>{subs.length} submission{subs.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div style={{ display: 'grid', gap: 16 }}>
                        {subs.map(sub => (
                          <SubmissionCard
                            key={sub.id}
                            sub={sub}
                            groupId={params.id}
                            userVotedThisWeek={myFavourites[sub.week_id] || null}
                            onFavourite={handleFavourite}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
          </>
        )}

        {/* BY LETTER VIEW */}
        {view === 'byletter' && (
          <>
            {(() => {
              const revealedWeeks = weeks.filter((w: any) => w.revealed_at && new Date(w.revealed_at) < new Date())
              const currentIndex = revealedWeeks.findIndex((w: any) => w.letter === selectedLetter)
              const prevWeek = currentIndex > 0 ? revealedWeeks[currentIndex - 1] : null
              const nextWeek = currentIndex < revealedWeeks.length - 1 ? revealedWeeks[currentIndex + 1] : null
              return selectedLetter ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24, borderBottom: '3px solid #000', paddingBottom: 12 }}>
                  <button onClick={() => prevWeek && handleLetterClick(prevWeek)} disabled={!prevWeek}
                    style={{ fontSize: 22, fontWeight: 'bold', background: 'none', border: 'none', cursor: prevWeek ? 'pointer' : 'default', color: prevWeek ? '#CC0000' : '#ddd', padding: '0 4px' }}>
                    ←
                  </button>
                  <span style={{ fontSize: 64, fontWeight: 'bold', color: '#CC0000', lineHeight: 1, minWidth: 48, textAlign: 'center' }}>
                    {selectedLetter}
                  </span>
                  <button onClick={() => nextWeek && handleLetterClick(nextWeek)} disabled={!nextWeek}
                    style={{ fontSize: 22, fontWeight: 'bold', background: 'none', border: 'none', cursor: nextWeek ? 'pointer' : 'default', color: nextWeek ? '#CC0000' : '#ddd', padding: '0 4px' }}>
                    →
                  </button>
                  {!loadingSubs && (
                    <span style={{ fontSize: 13, color: '#666', marginLeft: 4 }}>
                      {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              ) : null
            })()}

            {!selectedLetter && (
              <div className="box-shaded" style={{ textAlign: 'center', padding: 48 }}>
                <p style={{ fontSize: 14, color: '#666' }}>No revealed weeks yet.</p>
              </div>
            )}
            {selectedLetter && loadingSubs && <div style={{ fontSize: 14, color: '#666' }}>Loading...</div>}
            {selectedLetter && !loadingSubs && (
              <div style={{ display: 'grid', gap: 16 }}>
                {submissions.map(sub => (
                  <SubmissionCard
                    key={sub.id}
                    sub={sub}
                    groupId={params.id}
                    userVotedThisWeek={myFavourites[sub.week_id] || null}
                    onFavourite={handleFavourite}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* MINE VIEW */}
        {view === 'mine' && (
          <>
            {loadingMine && <div style={{ fontSize: 14, color: '#666' }}>Loading...</div>}
            {!loadingMine && mySubmissions.length === 0 && (
              <div className="box-shaded" style={{ textAlign: 'center', padding: 48 }}>
                <p style={{ fontSize: 14, color: '#666' }}>You haven't submitted anything yet.</p>
              </div>
            )}
            {!loadingMine && mySubmissions.length > 0 && (
              <div style={{ display: 'grid', gap: 24 }}>
                {mySubmissions.map(sub => (
                  <div key={sub.id}>
                    <div style={{ fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#999', marginBottom: 6 }}>
                      Week {sub.weeks?.week_num} · Letter {sub.weeks?.letter}
                    </div>
                    <SubmissionCard
                      sub={sub}
                      groupId={params.id}
                      userVotedThisWeek={null}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* FAVOURITE VIEW */}
        {view === 'favourite' && (
          <>
            {loadingFavourite && <div style={{ fontSize: 14, color: '#666' }}>Loading...</div>}
            {!loadingFavourite && favouriteSubmissions.length === 0 && (
              <div className="box-shaded" style={{ textAlign: 'center', padding: 48 }}>
                <p style={{ fontSize: 14, color: '#666' }}>No favourites yet — be the first to vote!</p>
              </div>
            )}
            {!loadingFavourite && favouriteSubmissions.length > 0 && (
              <div style={{ display: 'grid', gap: 24 }}>
                {favouriteSubmissions.map(sub => (
                  <div key={sub.id}>
                    <div style={{ fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#999', marginBottom: 6 }}>
                      Week {sub.weeks?.week_num} · Letter {sub.weeks?.letter}
                    </div>
                    <SubmissionCard
                      sub={sub}
                      groupId={params.id}
                      userVotedThisWeek={myFavourites[sub.week_id] || null}
                      onFavourite={handleFavourite}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}

async function loadSubmissions(
  week: any,
  setSelectedLetter: (l: string) => void,
  setSubmissions: (s: any[]) => void,
  setLoadingSubs: (b: boolean) => void,
  supabase: any
) {
  setSelectedLetter(week.letter)
  setLoadingSubs(true)
  const { data } = await supabase
    .from('submissions')
    .select('*, users(*)')
    .eq('week_id', week.id)
    .eq('is_late_catchup', false)
    .order('submitted_at', { ascending: true })
  setSubmissions(data || [])
  setLoadingSubs(false)
}

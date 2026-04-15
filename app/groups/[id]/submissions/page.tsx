'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Nav from '@/components/layout/Nav'


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

function SubmissionRow({ sub, groupId, isMyVote, onFavourite, onOpen }: {
  sub: any; groupId: string; isMyVote: boolean; onFavourite?: (submissionId: string, weekId: string) => void; onOpen?: () => void
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

      <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Link
          href={`/groups/${groupId}/submissions/${sub.week_id}/${sub.id}`}
          onClick={onOpen}
          style={{ border: '1px solid #ccc', padding: '2px 10px', fontSize: 10, letterSpacing: '0.06em', fontWeight: 700, textDecoration: 'none', color: '#000', textTransform: 'uppercase' }}
        >
          OPEN
        </Link>
        {onFavourite && (
          <button
            onClick={() => onFavourite(sub.id, sub.week_id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: isMyVote ? '#C85A5A' : '#ccc', padding: '0 2px', fontFamily: 'inherit', lineHeight: 1 }}
          >
            {isMyVote ? '♥' : '♡'}
          </button>
        )}
      </span>
    </div>
  )
}

function Cabinet({ subs, groupId, myFavourites, onFavourite, onOpen }: {
  subs: any[]; groupId: string; myFavourites: Record<string, string>; onFavourite?: (id: string, weekId: string) => void; onOpen?: () => void
}) {
  const groups = buildWeekGroups(subs)
  return (
    <div style={{ border: '1px solid #000', overflow: 'hidden' }}>
      {groups.map(({ week, subs: weekSubs }, gi) => (
        <div key={week?.id} style={{ borderTop: gi > 0 ? '2px solid #000' : 'none' }}>
          <div style={{ background: '#000', display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', border: '2px solid #C85A5A', background: '#C85A5A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#fff',
            }}>
              {week?.letter}
            </div>
          </div>
          {weekSubs.map(sub => (
            <SubmissionRow
              key={sub.id} sub={sub} groupId={groupId}
              isMyVote={myFavourites[sub.week_id] === sub.id}
              onFavourite={onFavourite}
              onOpen={onOpen}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export default function SubmissionsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [weeks, setWeeks] = useState<any[]>([])
  const [view, setView] = useState<'all' | 'mine' | 'favourite' | 'read'>('all')
  const [readWeekNum, setReadWeekNum] = useState<number>(1)

  const [azSubs, setAZSubs] = useState<any[]>([])
  const [mySubs, setMySubs] = useState<any[]>([])
  const [loadingMine, setLoadingMine] = useState(false)
  const [mineFetched, setMineFetched] = useState(false)
  const [myFavourites, setMyFavourites] = useState<Record<string, string>>({})
  const [communityFavourites, setCommunityFavourites] = useState<Record<string, string>>({})

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

      setLoading(false)
    }
    init()
  }, [])

  // Restore scroll position when returning from an individual submission page
  useEffect(() => {
    if (!loading) {
      const saved = sessionStorage.getItem('submissionsScroll')
      if (saved) {
        window.scrollTo(0, parseInt(saved))
        sessionStorage.removeItem('submissionsScroll')
      }
    }
  }, [loading])

  const saveScroll = () => {
    sessionStorage.setItem('submissionsScroll', String(window.scrollY))
  }

  const switchToMine = async () => {
    setView('mine')
    if (mineFetched || !userId) return
    setLoadingMine(true)
    const revealedIds = weeks.filter((w: any) => w.revealed_at && new Date(w.revealed_at) < new Date()).map((w: any) => w.id)
    if (revealedIds.length === 0) { setLoadingMine(false); setMineFetched(true); return }
    const { data } = await supabase
      .from('submissions').select('*, weeks(*)')
      .eq('user_id', userId).eq('is_late_catchup', false)
      .in('week_id', revealedIds).order('word_title', { ascending: true })
    setMySubs((data || []).sort((a: any, b: any) => a.weeks?.week_num - b.weeks?.week_num))
    setMineFetched(true)
    setLoadingMine(false)
  }

  const switchToRead = () => {
    const revealedWeeks = weeks
      .filter(w => w.revealed_at && new Date(w.revealed_at) < new Date())
      .sort((a, b) => a.week_num - b.week_num)
    if (revealedWeeks.length > 0) {
      setReadWeekNum(revealedWeeks[revealedWeeks.length - 1].week_num)
    }
    setView('read')
    window.scrollTo(0, 0)
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

  if (loading) return (
    <div style={{ minHeight: '100vh' }}>
      <Nav />
      <div style={{ padding: '40px', fontSize: 13, color: '#999' }}>Loading...</div>
    </div>
  )

  const tabBtn = (active: boolean) => ({
    padding: '6px 20px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase' as const, cursor: 'pointer', fontFamily: 'inherit',
    background: active ? '#000' : 'transparent', color: active ? '#fff' : '#000',
    border: '1px solid #000', marginRight: -1,
  })

  const favouriteSubs = azSubs.filter(s => communityFavourites[s.week_id] === s.id).sort((a, b) => a.weeks?.week_num - b.weeks?.week_num)
  const empty = (msg: string) => (
    <div style={{ border: '1px solid #ccc', padding: '40px', textAlign: 'center', fontSize: 13, color: '#666' }}>{msg}</div>
  )

  // READ view computed values
  const revealedWeeks = weeks
    .filter(w => w.revealed_at && new Date(w.revealed_at) < new Date())
    .sort((a, b) => a.week_num - b.week_num)
  const currentReadWeek = revealedWeeks.find(w => w.week_num === readWeekNum)
  const readWeekSubs = azSubs
    .filter(s => s.week_id === currentReadWeek?.id)
    .sort((a, b) => a.word_title.localeCompare(b.word_title))
  const readWeekIdx = revealedWeeks.findIndex(w => w.week_num === readWeekNum)
  const prevReadWeek = readWeekIdx > 0 ? revealedWeeks[readWeekIdx - 1] : null
  const nextReadWeek = readWeekIdx < revealedWeeks.length - 1 ? revealedWeeks[readWeekIdx + 1] : null
  const navBtnInline = { margin: '0 16px', width: 120 }

  const goToWeek = (weekNum: number) => {
    setReadWeekNum(weekNum)
    window.scrollTo(0, 0)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />

      <main className="page-main">

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <Link href={`/groups/${params.id}`} style={{ fontSize: 11, color: '#999', letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none' }}>
              GO BACK
            </Link>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 400, color: '#C85A5A', letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0, textAlign: 'center', fontFamily: 'inherit' }}>
            SUBMISSIONS
          </h1>
          <div />
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ flex: 1, height: 1, background: '#000' }} />
          <div style={{ display: 'flex', margin: '0 0' }}>
            <button onClick={() => setView('all')} style={tabBtn(view === 'all')}>ALL</button>
            <button onClick={switchToMine} style={tabBtn(view === 'mine')}>MINE</button>
            <button onClick={() => setView('favourite')} style={tabBtn(view === 'favourite')}>♥</button>
            <button onClick={switchToRead} style={tabBtn(view === 'read')}>READ</button>
          </div>
          <div style={{ flex: 1, height: 1, background: '#000' }} />
        </div>

        {view === 'all' && (
          azSubs.length === 0 ? empty('No revealed weeks yet.') :
          <Cabinet subs={azSubs} groupId={params.id} myFavourites={myFavourites} onFavourite={handleFavourite} onOpen={saveScroll} />
        )}

        {view === 'mine' && (
          loadingMine ? <div style={{ fontSize: 13, color: '#666' }}>Loading...</div> :
          mineFetched && mySubs.length === 0 ? empty("You haven't submitted anything yet.") :
          <Cabinet subs={mySubs} groupId={params.id} myFavourites={myFavourites} onOpen={saveScroll} />
        )}

        {view === 'favourite' && (
          favouriteSubs.length === 0 ? empty('No tastiest picks yet.') :
          <Cabinet subs={favouriteSubs} groupId={params.id} myFavourites={myFavourites} onOpen={saveScroll} />
        )}

        {view === 'read' && (
          revealedWeeks.length === 0 ? empty('No revealed weeks yet.') : (
            <div>
              {/* Big letter */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 0 }}>
                <div style={{ fontSize: 80, fontWeight: 900, color: '#C85A5A', lineHeight: 1 }}>
                  {currentReadWeek?.letter}
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #000', margin: '16px 0' }} />

              {/* Submissions */}
              {readWeekSubs.map(sub => (
                <div key={sub.id}>
                  {/* Title */}
                  <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#C85A5A', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      {sub.word_title}
                    </span>
                  </div>

                  {/* Body */}
                  <div
                    className="submission-card-body"
                    style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 40 }}
                    dangerouslySetInnerHTML={{ __html: (sub.body_html ?? '')
                      .replace(/<img[^>]*>/gi, '')
                      .replace(/<audio[^>]*>[\s\S]*?<\/audio>/gi, '')
                    }}
                  />

                  {/* Author */}
                  {sub.is_signed && sub.signed_name && (
                    <div style={{ textAlign: 'right', marginBottom: 16, fontSize: 13, color: '#C85A5A', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {sub.signed_name}
                    </div>
                  )}

                  {/* Heart */}
                  <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <button
                      onClick={() => handleFavourite(sub.id, sub.week_id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: myFavourites[sub.week_id] === sub.id ? '#C85A5A' : '#ccc', padding: 0, fontFamily: 'inherit', lineHeight: 1 }}
                    >
                      {myFavourites[sub.week_id] === sub.id ? '♥' : '♡'}
                    </button>
                  </div>

                  {/* Divider */}
                  <hr style={{ border: 'none', borderTop: '1px solid #000', margin: '0 0 40px' }} />
                </div>
              ))}

              {/* Week navigation */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ flex: 1, height: 1, background: '#000' }} />
                {prevReadWeek ? (
                  <button onClick={() => goToWeek(prevReadWeek.week_num)} className="btn-black" style={navBtnInline}>
                    ← {prevReadWeek.letter}
                  </button>
                ) : (
                  <div style={navBtnInline} />
                )}
                <div style={{ flex: 1, height: 1, background: '#000' }} />
                {nextReadWeek ? (
                  <button onClick={() => goToWeek(nextReadWeek.week_num)} className="btn-black" style={navBtnInline}>
                    {nextReadWeek.letter} →
                  </button>
                ) : (
                  <div style={navBtnInline} />
                )}
                <div style={{ flex: 1, height: 1, background: '#000' }} />
              </div>

            </div>
          )
        )}

      </main>

    </div>
  )
}

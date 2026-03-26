'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function MediaTags({ html }: { html: string }) {
  const hasImage = /<img[\s>]/i.test(html)
  const hasAudio = /<audio[\s>]/i.test(html)
  if (!hasImage && !hasAudio) return null
  return (
    <span style={{ display: 'inline-flex', gap: 4 }}>
      {hasImage && <span className="tag" style={{ fontSize: 9 }}>IMG</span>}
      {hasAudio && <span className="tag" style={{ fontSize: 9 }}>AUD</span>}
    </span>
  )
}

function LetterTab({ letter, count }: { letter: string; count: number }) {
  return (
    <div style={{
      background: '#000', color: '#fff',
      padding: '7px 16px',
      display: 'flex', alignItems: 'baseline', gap: 10,
    }}>
      <span style={{ fontSize: 14, fontWeight: 'bold', letterSpacing: '0.1em' }}>{letter}</span>
      <span style={{ fontSize: 10, color: '#777', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {count} piece{count !== 1 ? 's' : ''}
      </span>
    </div>
  )
}

function FileStrip({
  sub, groupId, isCommunityFavourite, isMyVote, onFavourite,
}: {
  sub: any
  groupId: string
  isCommunityFavourite: boolean
  isMyVote: boolean
  onFavourite?: (submissionId: string, weekId: string) => void
}) {
  return (
    <div className="file-strip-row">
      <Link
        href={`/groups/${groupId}/submissions/${sub.week_id}/${sub.id}`}
        className="file-strip-link"
      >
        <span className="file-strip-title">{sub.word_title}</span>
        <span className="file-strip-meta">
          <MediaTags html={sub.body_html} />
          <span className="file-strip-wordcount">{sub.word_count}w</span>
          {isCommunityFavourite && <span className="file-strip-fav-dot">♥</span>}
          {sub.is_signed && sub.signed_name && (
            <span className="file-strip-signed">{sub.signed_name}</span>
          )}
          <span className="file-strip-arrow">→</span>
        </span>
      </Link>
      {onFavourite && (
        <button
          onClick={() => onFavourite(sub.id, sub.week_id)}
          title={isMyVote ? 'Remove favourite' : 'Mark as favourite'}
          className={`file-strip-vote${isMyVote ? ' voted' : ''}`}
        >
          {isMyVote ? '♥' : '♡'}
        </button>
      )}
    </div>
  )
}

function buildWeekGroups(subs: any[]) {
  const weekMap: Record<string, { week: any; subs: any[] }> = {}
  for (const sub of subs) {
    if (!weekMap[sub.week_id]) weekMap[sub.week_id] = { week: sub.weeks, subs: [] }
    weekMap[sub.week_id].subs.push(sub)
  }
  return Object.values(weekMap).sort((a, b) => a.week?.week_num - b.week?.week_num)
}

export default function SubmissionsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [weeks, setWeeks] = useState<any[]>([])
  const [view, setView] = useState<'az' | 'mine' | 'favourite'>('az')

  const [azSubmissions, setAZSubmissions] = useState<any[]>([])
  const [loadingAZ, setLoadingAZ] = useState(false)

  const [mySubmissions, setMySubmissions] = useState<any[]>([])
  const [loadingMine, setLoadingMine] = useState(false)
  const [mineFetched, setMineFetched] = useState(false)

  // User's own vote: weekId → submissionId
  const [myFavourites, setMyFavourites] = useState<Record<string, string>>({})
  // Community top pick: weekId → submissionId
  const [communityFavourites, setCommunityFavourites] = useState<Record<string, string>>({})

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

      // User's own favourites
      const { data: myFavs } = await supabase
        .from('favourites')
        .select('submission_id, week_id')
        .eq('user_id', session.user.id)
        .eq('group_id', params.id)
      const myFavMap: Record<string, string> = {}
      for (const f of myFavs || []) myFavMap[f.week_id] = f.submission_id
      setMyFavourites(myFavMap)

      // All group favourites → compute community top per week
      const { data: allFavs } = await supabase
        .from('favourites')
        .select('submission_id, week_id')
        .eq('group_id', params.id)
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

      // A-Z submissions, alphabetical by title
      if (revealedWeekIds.length > 0) {
        setLoadingAZ(true)
        const { data } = await supabase
          .from('submissions')
          .select('*, users(*), weeks(*)')
          .in('week_id', revealedWeekIds)
          .eq('is_late_catchup', false)
          .order('word_title', { ascending: true })
        setAZSubmissions(data || [])
        setLoadingAZ(false)
      }

      setLoading(false)
    }
    init()
  }, [])

  const switchToMine = async () => {
    setView('mine')
    if (mineFetched || !userId) return
    setLoadingMine(true)
    const revealedWeekIds = weeks
      .filter((w: any) => w.revealed_at && new Date(w.revealed_at) < new Date())
      .map((w: any) => w.id)
    if (revealedWeekIds.length === 0) { setLoadingMine(false); setMineFetched(true); return }
    const { data } = await supabase
      .from('submissions')
      .select('*, weeks(*)')
      .eq('user_id', userId)
      .eq('is_late_catchup', false)
      .in('week_id', revealedWeekIds)
      .order('word_title', { ascending: true })
    const sorted = (data || []).sort((a: any, b: any) => a.weeks?.week_num - b.weeks?.week_num)
    setMySubmissions(sorted)
    setMineFetched(true)
    setLoadingMine(false)
  }

  const handleFavourite = async (submissionId: string, weekId: string) => {
    if (!userId) return
    const currentVote = myFavourites[weekId]
    if (currentVote === submissionId) {
      const { error } = await supabase.from('favourites').delete()
        .eq('user_id', userId).eq('week_id', weekId).eq('group_id', params.id)
      if (!error) {
        setMyFavourites(prev => { const next = { ...prev }; delete next[weekId]; return next })
        // recompute community favs locally: remove this vote
        setCommunityFavourites(prev => recomputeAfterVoteChange(prev, weekId, null, currentVote, azSubmissions))
      }
    } else {
      if (currentVote) {
        await supabase.from('favourites').delete()
          .eq('user_id', userId).eq('week_id', weekId).eq('group_id', params.id)
      }
      const { error } = await supabase.from('favourites').insert({
        group_id: params.id, user_id: userId, submission_id: submissionId, week_id: weekId,
      })
      if (!error) {
        setMyFavourites(prev => ({ ...prev, [weekId]: submissionId }))
      }
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh' }}>
      <nav className="nav"><Link href="/dashboard" className="nav-brand">[ MY WORD ]</Link></nav>
      <div className="page-container" style={{ paddingTop: 40 }}>Loading...</div>
    </div>
  )

  const toggleBtn = (active: boolean, first: boolean = false) => ({
    padding: '6px 14px',
    fontSize: 11,
    fontWeight: 'bold' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    border: 'none',
    borderLeft: first ? 'none' : '2px solid #000',
    cursor: 'pointer',
    background: active ? '#000' : '#fff',
    color: active ? '#fff' : '#000',
  })

  const emptyState = (msg: string) => (
    <div className="box-shaded" style={{ textAlign: 'center', padding: 48 }}>
      <p style={{ fontSize: 13, color: '#666' }}>{msg}</p>
    </div>
  )

  const renderCabinet = (subs: any[], showVote: boolean) => {
    if (subs.length === 0) return emptyState('No revealed weeks yet.')
    const groups = buildWeekGroups(subs)
    return (
      <div className="file-cabinet">
        {groups.map(({ week, subs: weekSubs }, gi) => (
          <div key={week?.id} style={{ borderTop: gi > 0 ? '2px solid #000' : 'none' }}>
            <LetterTab letter={week?.letter} count={weekSubs.length} />
            {weekSubs.map(sub => (
              <FileStrip
                key={sub.id}
                sub={sub}
                groupId={params.id}
                isCommunityFavourite={communityFavourites[sub.week_id] === sub.id}
                isMyVote={myFavourites[sub.week_id] === sub.id}
                onFavourite={showVote ? handleFavourite : undefined}
              />
            ))}
          </div>
        ))}
      </div>
    )
  }

  // Community favourite per letter — one entry per revealed week
  const favouriteSubs = azSubmissions
    .filter(sub => communityFavourites[sub.week_id] === sub.id)
    .sort((a, b) => a.weeks?.week_num - b.weeks?.week_num)

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
        <div className="submissions-header">
          <h1 className="page-title" style={{ margin: 0 }}>Submissions</h1>
          <div style={{ display: 'flex', border: '2px solid #000', overflow: 'hidden' }}>
            <button onClick={() => setView('az')} style={toggleBtn(view === 'az', true)}>A–Z</button>
            <button onClick={switchToMine} style={toggleBtn(view === 'mine')}>Mine</button>
            <button onClick={() => setView('favourite')} style={toggleBtn(view === 'favourite')}>Favourite</button>
          </div>
        </div>
        <p style={{ fontSize: 11, color: '#999', fontStyle: 'italic', textAlign: 'right', marginBottom: 24 }}>
          Heart your favourite piece from each letter.
        </p>

        {view === 'az' && (
          loadingAZ
            ? <div style={{ fontSize: 13, color: '#666' }}>Loading...</div>
            : renderCabinet(azSubmissions, true)
        )}

        {view === 'mine' && (
          loadingMine
            ? <div style={{ fontSize: 13, color: '#666' }}>Loading...</div>
            : mineFetched && mySubmissions.length === 0
              ? emptyState("You haven't submitted anything yet.")
              : renderCabinet(mySubmissions, false)
        )}

        {view === 'favourite' && (
          favouriteSubs.length === 0
            ? emptyState('No favourites yet — be the first to vote.')
            : renderCabinet(favouriteSubs, false)
        )}
      </div>
    </div>
  )
}

// Optimistic community favourite recompute isn't worth the complexity —
// a full page reload will pick up changes. This stub keeps the type happy.
function recomputeAfterVoteChange(
  prev: Record<string, string>,
  _weekId: string,
  _newSubId: string | null,
  _oldSubId: string,
  _subs: any[]
): Record<string, string> {
  return prev
}

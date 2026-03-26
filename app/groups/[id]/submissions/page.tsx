'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// Tab horizontal positions — cycle through 4 slots across the cabinet width
const TAB_SLOTS = [0, 1, 2, 3]

// Content indent within an open folder — gives the irregular filing cabinet look
const ENTRY_INDENTS = [0, 48, 24, 64, 12, 40, 28, 56, 8, 36]

function textPreview(html: string, chars = 200): string {
  const stripped = (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return stripped.length > chars ? stripped.slice(0, chars) + '…' : stripped
}

function MediaTags({ html, small }: { html: string; small?: boolean }) {
  const hasImage = /<img[\s>]/i.test(html)
  const hasAudio = /<audio[\s>]/i.test(html)
  if (!hasImage && !hasAudio) return null
  const sz = small ? 8 : 9
  return (
    <span style={{ display: 'inline-flex', gap: 3 }}>
      {hasImage && <span className="tag" style={{ fontSize: sz }}>IMG</span>}
      {hasAudio && <span className="tag" style={{ fontSize: sz }}>AUD</span>}
    </span>
  )
}

function FolderSection({
  week, subs, groupId, tabSlot, communityFavourites, myFavourites, onFavourite,
}: {
  week: any
  subs: any[]
  groupId: string
  tabSlot: number
  communityFavourites: Record<string, string>
  myFavourites: Record<string, string>
  onFavourite?: (submissionId: string, weekId: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="folder-section">
      {/* Tab protruding above the folder */}
      <div className={`folder-tab-wrap folder-tab-slot-${tabSlot}`}>
        <button
          className={`folder-tab${open ? ' open' : ''}`}
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
        >
          <span className="folder-tab-letter">{week.letter}</span>
          <span className="folder-tab-count">{subs.length}</span>
        </button>
      </div>

      {/* Folder body — expands on click */}
      {open ? (
        <div className="folder-body">
          {subs.map((sub, i) => {
            const indent = ENTRY_INDENTS[i % ENTRY_INDENTS.length]
            const isFav = communityFavourites[sub.week_id] === sub.id
            const isMyVote = myFavourites[sub.week_id] === sub.id
            const preview = textPreview(sub.body_html)
            return (
              <div key={sub.id} className="folder-entry" style={{ marginLeft: indent }}>
                <div className="folder-entry-inner">
                  <Link
                    href={`/groups/${groupId}/submissions/${sub.week_id}/${sub.id}`}
                    className="folder-entry-link"
                  >
                    <div className="folder-entry-title">
                      <span className="folder-entry-name">{sub.word_title}</span>
                      <span className="folder-entry-badges">
                        <MediaTags html={sub.body_html} small />
                        {isFav && <span className="folder-fav-mark">♥</span>}
                      </span>
                    </div>
                    {preview && (
                      <div className="folder-entry-preview">{preview}</div>
                    )}
                  </Link>
                  {onFavourite && (
                    <button
                      onClick={() => onFavourite(sub.id, sub.week_id)}
                      title={isMyVote ? 'Remove favourite' : 'Mark as favourite'}
                      className={`folder-vote-btn${isMyVote ? ' voted' : ''}`}
                    >
                      {isMyVote ? '♥' : '♡'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="folder-closed" />
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
        .from('favourites').select('submission_id, week_id')
        .eq('user_id', session.user.id).eq('group_id', params.id)
      const myFavMap: Record<string, string> = {}
      for (const f of myFavs || []) myFavMap[f.week_id] = f.submission_id
      setMyFavourites(myFavMap)

      // All group favourites → community top per week
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

      // A-Z submissions, alphabetical by title
      if (revealedWeekIds.length > 0) {
        setLoadingAZ(true)
        const { data } = await supabase
          .from('submissions').select('*, users(*), weeks(*)')
          .in('week_id', revealedWeekIds).eq('is_late_catchup', false)
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
      .from('submissions').select('*, weeks(*)')
      .eq('user_id', userId).eq('is_late_catchup', false)
      .in('week_id', revealedWeekIds).order('word_title', { ascending: true })
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
      if (!error) setMyFavourites(prev => { const n = { ...prev }; delete n[weekId]; return n })
    } else {
      if (currentVote) {
        await supabase.from('favourites').delete()
          .eq('user_id', userId).eq('week_id', weekId).eq('group_id', params.id)
      }
      const { error } = await supabase.from('favourites').insert({
        group_id: params.id, user_id: userId, submission_id: submissionId, week_id: weekId,
      })
      if (!error) setMyFavourites(prev => ({ ...prev, [weekId]: submissionId }))
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh' }}>
      <nav className="nav"><Link href="/dashboard" className="nav-brand">[ MY WORD ]</Link></nav>
      <div className="page-container" style={{ paddingTop: 40 }}>Loading...</div>
    </div>
  )

  const toggleBtn = (active: boolean, first = false) => ({
    padding: '6px 14px', fontSize: 11, fontWeight: 'bold' as const,
    textTransform: 'uppercase' as const, letterSpacing: '0.08em',
    border: 'none', borderLeft: first ? 'none' : '2px solid #000',
    cursor: 'pointer', background: active ? '#000' : '#fff', color: active ? '#fff' : '#000',
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
      <div className="cabinet">
        {groups.map(({ week, subs: weekSubs }, gi) => (
          <FolderSection
            key={week?.id}
            week={week}
            subs={weekSubs}
            groupId={params.id}
            tabSlot={gi % 4}
            communityFavourites={communityFavourites}
            myFavourites={myFavourites}
            onFavourite={showVote ? handleFavourite : undefined}
          />
        ))}
      </div>
    )
  }

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
            await supabase.auth.signOut(); window.location.href = '/'
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
        <p style={{ fontSize: 11, color: '#999', fontStyle: 'italic', textAlign: 'right', marginBottom: 32 }}>
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

'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { createLoreClient } from '@/lib/supabase/lore-client'
import Nav from '@/components/layout/Nav'
import dynamic from 'next/dynamic'

const WorldMap = dynamic(() => import('@/components/lore/WorldMap'), { ssr: false })

// lore client kept for realtime subscriptions only (read-only channel, no auth needed)

function LoreFooter() {
  return (
    <footer style={{ textAlign: 'center', padding: '48px 0 28px' }}>
      <span style={{ fontSize: 11, color: '#ccc', letterSpacing: '0.18em' }}>POGOSI-GAMBOSI</span>
    </footer>
  )
}

function timeAgo(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function LoreDashboard() {
  const router = useRouter()
  const mainSupa = createClient()
  const lore = createLoreClient()

  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [goldenHolder, setGoldenHolder] = useState<string | null>(null)
  const [feed, setFeed] = useState<any[]>([])
  const [allChars, setAllChars] = useState<any[]>([])
  const [allTags, setAllTags] = useState<any[]>([])
  const [allPlaces, setAllPlaces] = useState<string[]>([])
  const [follows, setFollows] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [allYarnIds, setAllYarnIds] = useState<string[]>([])
  const [mapYarns, setMapYarns] = useState<any[]>([])
  const [heartCounts, setHeartCounts] = useState<Record<string, number>>({})

  const [showFilters, setShowFilters] = useState(false)
  const [filterChar, setFilterChar] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [filterPlace, setFilterPlace] = useState('')
  const [showReadMenu, setShowReadMenu] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  const readMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await mainSupa.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)

      // Redirect to welcome if user has no character name yet
      const charRes = await fetch('/api/lore/character')
      const charJson = charRes.ok ? await charRes.json() : { character: null }
      if (!charJson.character) {
        router.push('/lore/welcome')
        return
      }

      const res = await fetch('/api/lore/feed')
      if (!res.ok) { router.push('/login'); return }
      const data = await res.json()

      setFeed(data.yarns)
      setAllChars(data.chars)
      setAllTags(data.tags)
      setFollows(data.follows)
      setNotifications(data.notifications)
      setAllPlaces(data.places)
      setAllYarnIds(data.allYarnIds)
      if (data.goldenHolder) setGoldenHolder(data.goldenHolder)
      if (data.mapYarns) setMapYarns(data.mapYarns)
      if (data.heartCounts) setHeartCounts(data.heartCounts)

      setLoading(false)
    }
    init()
  }, [])

  // Realtime subscription — channel only; individual yarn fetched via admin API
  useEffect(() => {
    const channel = lore.channel('lore-yarns-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lore_yarns' }, async (payload) => {
        const res = await fetch(`/api/lore/yarn/${payload.new.id}`)
        if (res.ok) {
          const { yarn } = await res.json()
          if (yarn) setFeed(prev => [yarn, ...prev.slice(0, 29)])
        }
      })
      .subscribe()
    return () => { lore.removeChannel(channel) }
  }, [])

  // Close read menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (readMenuRef.current && !readMenuRef.current.contains(e.target as Node)) {
        setShowReadMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleRandomYarn = () => {
    if (allYarnIds.length === 0) return
    const id = allYarnIds[Math.floor(Math.random() * allYarnIds.length)]
    router.push(`/lore/yarn/${id}`)
  }

  const markRead = async (id: string) => {
    await fetch(`/api/lore/notification/${id}`, { method: 'PATCH' })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const filteredFeed = feed.filter(y => {
    const charName = (y.lore_characters as any)?.character_name || ''
    if (filterChar && charName !== filterChar) return false
    if (filterPlace && y.place !== filterPlace) return false
    return true
  })

  const btnStyle = (active?: boolean): React.CSSProperties => ({
    padding: '6px 14px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit',
    background: active ? '#000' : 'none', color: active ? '#fff' : '#000',
    border: '1px solid #000', transition: 'background 0.12s, color 0.12s',
  })

  const unreadCount = notifications.filter(n => !n.read).length

  if (loading) return (
    <div style={{ minHeight: '100vh' }}>
      <Nav />
      <div style={{ padding: '40px', fontSize: 13, color: '#999' }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />
      <main className="page-main">

        <Link href="/dashboard" style={{ fontSize: 11, color: '#000', letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none' }}>
          ← GO BACK
        </Link>

        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C85A5A', textAlign: 'center', margin: '16px 0 24px' }}>
          LORE
        </h1>

        {/* Hero box */}
        <div style={{ border: '1px solid #000', minHeight: 'min(55vh, 420px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', marginBottom: 0 }}>
          <img src="/lore_dashboard_hero_asset.png" alt="Lore" style={{ width: 'min(340px, 75%)', height: 'auto', display: 'block', marginBottom: 24 }} />
          {goldenHolder && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 6 }}>
                GOLDEN YARN HELD BY
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {goldenHolder}
              </div>
            </div>
          )}
        </div>

        {/* Live activity feed */}
        <div style={{ border: '1px solid #000', borderTop: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #e8e8e8' }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', flex: 1 }}>LIVE ACTIVITY</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowFilters(f => !f)} style={btnStyle(showFilters)}>⊞ FILTER</button>
              <button onClick={async () => {
                const res = await fetch('/api/lore/feed')
                if (res.ok) { const d = await res.json(); setFeed(d.yarns) }
              }} style={btnStyle()}>↺ REFRESH</button>
            </div>
          </div>

          {showFilters && (
            <div style={{ display: 'flex', gap: 8, padding: '10px 16px', borderBottom: '1px solid #e8e8e8', flexWrap: 'wrap' }}>
              <select value={filterChar} onChange={e => setFilterChar(e.target.value)} style={{ fontSize: 11, padding: '4px 8px', border: '1px solid #ccc', fontFamily: 'inherit', flex: 1, minWidth: 120 }}>
                <option value="">ALL CHARACTERS</option>
                {[...allChars].sort((a, b) => {
                  const aF = follows.some(f => f.follow_type === 'character' && f.follow_value === a.character_name)
                  const bF = follows.some(f => f.follow_type === 'character' && f.follow_value === b.character_name)
                  return (bF ? 1 : 0) - (aF ? 1 : 0)
                }).map(c => (
                  <option key={c.id} value={c.character_name}>{c.character_name}</option>
                ))}
              </select>
              <select value={filterTag} onChange={e => setFilterTag(e.target.value)} style={{ fontSize: 11, padding: '4px 8px', border: '1px solid #ccc', fontFamily: 'inherit', flex: 1, minWidth: 120 }}>
                <option value="">ALL TAGS</option>
                {allTags.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
              <select value={filterPlace} onChange={e => setFilterPlace(e.target.value)} style={{ fontSize: 11, padding: '4px 8px', border: '1px solid #ccc', fontFamily: 'inherit', flex: 1, minWidth: 120 }}>
                <option value="">ALL PLACES</option>
                {[...allPlaces].sort((a, b) => {
                  const aF = follows.some(f => f.follow_type === 'place' && f.follow_value === a)
                  const bF = follows.some(f => f.follow_type === 'place' && f.follow_value === b)
                  return (bF ? 1 : 0) - (aF ? 1 : 0)
                }).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          )}

          {filteredFeed.length === 0 ? (
            <div style={{ padding: '24px 16px', fontSize: 13, color: '#999', textAlign: 'center' }}>No activity yet.</div>
          ) : (
            filteredFeed.map(yarn => (
              <Link key={yarn.id} href={`/lore/yarn/${yarn.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#fafafa'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = ''}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#C85A5A', flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontSize: 12, flex: 1 }}>
                    <strong>{(yarn.lore_characters as any)?.character_name || 'Unknown'}</strong>
                    {' '}made an entry —{' '}
                    <em>{yarn.title}</em>
                  </span>
                  <span style={{ fontSize: 10, color: '#bbb', whiteSpace: 'nowrap' }}>{timeAgo(yarn.created_at)}</span>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Action bar */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, position: 'relative', flexWrap: 'wrap' }}>
          <Link href="/lore/add" style={{ textDecoration: 'none' }}>
            <button style={{ ...btnStyle(), border: '1px solid #C85A5A', color: '#C85A5A' }}
              onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = '#C85A5A'; (e.target as HTMLButtonElement).style.color = '#fff' }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = 'none'; (e.target as HTMLButtonElement).style.color = '#C85A5A' }}
            >
              + ADD YARN
            </button>
          </Link>

          <div ref={readMenuRef} style={{ position: 'relative' }}>
            <button onClick={() => setShowReadMenu(m => !m)} style={btnStyle(showReadMenu)}>
              READ ▾
            </button>
            {showReadMenu && (
              <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 10, background: '#fff', border: '1px solid #000', minWidth: 140, marginTop: 2 }}>
                <Link href="/lore/index" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                  <div style={{ padding: '10px 16px', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#f5f5f5'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = ''}
                  >
                    INDEX
                  </div>
                </Link>
                <div style={{ padding: '10px 16px', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', borderTop: '1px solid #eee' }}
                  onClick={handleRandomYarn}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#f5f5f5'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = ''}
                >
                  RANDOM
                </div>
              </div>
            )}
          </div>

          <button onClick={() => setShowMap(m => !m)} style={btnStyle(showMap)}>
            MAP ▾
          </button>

          <Link href="/lore/characters" style={{ textDecoration: 'none' }}>
            <button style={btnStyle()}>SETTINGS</button>
          </Link>

          <button
            onClick={() => setShowHelp(h => !h)}
            style={{ marginLeft: 'auto', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', border: '1px solid #ccc', background: showHelp ? '#000' : '#fff', color: showHelp ? '#fff' : '#555', padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit' }}
            onMouseEnter={e => { if (!showHelp) { (e.currentTarget as HTMLButtonElement).style.background = '#000'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#000' } }}
            onMouseLeave={e => { if (!showHelp) { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; (e.currentTarget as HTMLButtonElement).style.color = '#555'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#ccc' } }}
          >
            ?
          </button>
        </div>

        {/* Help panel */}
        {showHelp && (
          <div style={{ border: '1px solid #000', marginTop: 8, padding: 16 }}>
            {[
              'Lore is a shared story archive for the My Word group. Everyone writes entries called yarns, set at real dates, building up a single timeline together over time.',
              'You get in with a password. Once you\'re in you pick a character name, which is what everyone in Lore knows you as. You can change it whenever you like.',
              'Writing a yarn is simple. You give it a title, set a date (even just a year if that\'s all you know), write the story, and attach images or audio if you want. Then you tag it with characters, a place, tags, and optionally link it to an event where multiple yarns can sit together.',
              'The main page shows a live feed of what everyone is adding, and displays who currently holds the golden yarn, which goes to whoever has written the most loved story at any given time. Hearts are private so nobody knows how many a story has, it just quietly determines the award.',
              'Reading through Lore you can follow a character forward and backward through time, jump between yarns that share an event, or browse the full index chronologically by year.',
              'On any yarn you can heart it privately, concur with it (public), or validate it if you were actually there and are tagged in it. You can also contribute, which threads your own yarn directly below someone else\'s.',
              'Some tags are taboo, which means the story text is hidden from you unless you have been mentioned in or written a yarn with that tag yourself. You unlock them by becoming part of that part of the story.',
            ].map((para, i) => (
              <p key={i} style={{ fontSize: 13, lineHeight: 1.9, margin: '0 0 12px', color: '#333' }}>{para}</p>
            ))}
          </div>
        )}

        {/* Map panel */}
        {showMap && (
          <div style={{ border: '1px solid #000', marginTop: 8, height: 240 }}>
            <WorldMap mapYarns={mapYarns} heartCounts={heartCounts} />
          </div>
        )}

        {/* Notifications */}
        {notifications.length > 0 && (
          <div style={{ border: '1px solid #000', marginTop: 24 }}>
            <div style={{ background: '#000', color: '#fff', padding: '10px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>NOTIFICATIONS</span>
              {unreadCount > 0 && <span style={{ background: '#C85A5A', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>{unreadCount}</span>}
            </div>
            {notifications.map(n => (
              <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid #f0f0f0', background: n.read ? '#fff' : '#fffaf9' }}>
                {!n.read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#C85A5A', flexShrink: 0, display: 'inline-block' }} />}
                <span style={{ fontSize: 12, flex: 1 }}>
                  {n.notif_type === 'mention' ? 'You were mentioned in' : 'New yarn in'}{' '}
                  <em>{(n.lore_yarns as any)?.title || 'a yarn'}</em>
                </span>
                {n.yarn_id && (
                  <Link href={`/lore/yarn/${n.yarn_id}`} onClick={() => markRead(n.id)} style={{ border: '1px solid #ccc', padding: '2px 10px', fontSize: 10, letterSpacing: '0.06em', fontWeight: 700, textDecoration: 'none', color: '#000', textTransform: 'uppercase' }}>
                    {n.notif_type === 'mention' ? 'VERIFY' : 'READ'}
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}

      </main>
      <LoreFooter />
    </div>
  )
}

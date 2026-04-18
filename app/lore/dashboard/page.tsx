'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { createLoreClient } from '@/lib/supabase/lore-client'
import Nav from '@/components/layout/Nav'

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

  const [showFilters, setShowFilters] = useState(false)
  const [filterChar, setFilterChar] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [filterPlace, setFilterPlace] = useState('')
  const [showReadMenu, setShowReadMenu] = useState(false)
  const [showMap, setShowMap] = useState(false)

  const readMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await mainSupa.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)

      const [{ data: yarns }, { data: chars }, { data: tags }, { data: follows }, { data: notifs }] = await Promise.all([
        lore.from('lore_yarns').select('id, title, created_at, author_id, lore_characters(character_name)').order('created_at', { ascending: false }).limit(30),
        lore.from('lore_characters').select('id, character_name'),
        lore.from('lore_tags').select('id, name, is_taboo'),
        lore.from('lore_follows').select('*').eq('user_id', session.user.id),
        lore.from('lore_notifications').select('*, lore_yarns(title)').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(20),
      ])

      setFeed(yarns || [])
      setAllChars(chars || [])
      setAllTags((tags || []).filter((t: any) => !t.is_taboo))
      setFollows(follows || [])
      setNotifications(notifs || [])

      // Collect places
      const { data: places } = await lore.from('lore_yarns').select('place').not('place', 'is', null)
      const uniquePlaces = Array.from(new Set((places || []).map((p: any) => p.place).filter(Boolean))) as string[]
      setAllPlaces(uniquePlaces)

      // Golden yarn holder from view
      const { data: golden } = await lore.from('golden_yarn_holder').select('character_name').single()
      if (golden) setGoldenHolder((golden as any).character_name)

      setLoading(false)
    }
    init()
  }, [])

  // Realtime subscription
  useEffect(() => {
    const channel = lore.channel('lore-yarns-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lore_yarns' }, async (payload) => {
        const { data: fullYarn } = await lore
          .from('lore_yarns')
          .select('id, title, created_at, author_id, lore_characters(character_name)')
          .eq('id', payload.new.id)
          .single()
        if (fullYarn) setFeed(prev => [fullYarn, ...prev.slice(0, 29)])
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

  const handleRandomYarn = async () => {
    const { data } = await lore.from('lore_yarns').select('id')
    if (!data || data.length === 0) return
    const random = data[Math.floor(Math.random() * data.length)]
    router.push(`/lore/yarn/${random.id}`)
  }

  const markRead = async (id: string) => {
    await lore.from('lore_notifications').update({ read: true }).eq('id', id)
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

        {/* Label */}
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: '#C85A5A', textTransform: 'uppercase', marginBottom: 16 }}>
          LORE
        </div>

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
                const { data } = await lore.from('lore_yarns').select('id, title, created_at, author_id, lore_characters(character_name)').order('created_at', { ascending: false }).limit(30)
                setFeed(data || [])
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
            <button style={btnStyle()}>CHARACTERS</button>
          </Link>
        </div>

        {/* Map panel */}
        {showMap && (
          <div style={{ border: '1px solid #000', borderTop: 'none', height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f9f9', marginTop: 0 }}>
            <span style={{ fontSize: 11, color: '#bbb', letterSpacing: '0.14em', textTransform: 'uppercase' }}>MAP — YARN LOCATIONS</span>
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

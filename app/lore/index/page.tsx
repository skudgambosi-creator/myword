'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Nav from '@/components/layout/Nav'

function LoreFooter() {
  return (
    <footer style={{ textAlign: 'center', padding: '48px 0 28px' }}>
      <span style={{ fontSize: 11, color: '#ccc', letterSpacing: '0.18em' }}>POGOSI-GAMBOSI</span>
    </footer>
  )
}

function formatDate(day: number | null, month: number | null, year: number) {
  if (day && month) return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`
  if (month) return `${month.toString().padStart(2, '0')}/${year}`
  return `${year}`
}

export default function LoreIndex() {
  const router = useRouter()
  const mainSupa = createClient()

  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [yarns, setYarns] = useState<any[]>([])
  const [allChars, setAllChars] = useState<any[]>([])
  const [allTags, setAllTags] = useState<any[]>([])
  const [allPlaces, setAllPlaces] = useState<string[]>([])
  const [follows, setFollows] = useState<any[]>([])
  const [myHearts, setMyHearts] = useState<Set<string>>(new Set())
  const [heartCounts, setHeartCounts] = useState<Record<string, number>>({})

  const [filterChar, setFilterChar] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [filterPlace, setFilterPlace] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await mainSupa.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)

      const res = await fetch('/api/lore/yarns')
      if (!res.ok) { router.push('/login'); return }
      const data = await res.json()

      setYarns(data.yarns)
      setAllChars(data.chars)
      setAllTags(data.tags)
      setFollows(data.follows)
      setMyHearts(new Set(data.myHeartIds))
      setHeartCounts(data.heartCounts)
      setAllPlaces(Array.from(new Set((data.yarns as any[]).map((y: any) => y.place).filter(Boolean))) as string[])

      setLoading(false)
    }
    init()
  }, [])

  const toggleHeart = async (yarnId: string) => {
    if (!userId) return
    if (myHearts.has(yarnId)) {
      await fetch(`/api/lore/yarn/${yarnId}/heart`, { method: 'DELETE' })
      setMyHearts(prev => { const n = new Set(prev); n.delete(yarnId); return n })
      setHeartCounts(prev => ({ ...prev, [yarnId]: Math.max(0, (prev[yarnId] || 1) - 1) }))
    } else {
      await fetch(`/api/lore/yarn/${yarnId}/heart`, { method: 'POST' })
      setMyHearts(prev => new Set(Array.from(prev).concat(yarnId)))
      setHeartCounts(prev => ({ ...prev, [yarnId]: (prev[yarnId] || 0) + 1 }))
    }
  }

  // Calculate golden yarns
  const now = new Date()
  const thisMonth = now.getMonth() + 1
  const thisYear = now.getFullYear()
  const monthlyGolden = Object.entries(heartCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
  const yearlyGolden = Object.entries(heartCounts).sort((a, b) => b[1] - a[1])[0]?.[0]

  const sortedFollowedChars = [...allChars].sort((a, b) => {
    const aF = follows.some(f => f.follow_type === 'character' && f.follow_value === a.character_name)
    const bF = follows.some(f => f.follow_type === 'character' && f.follow_value === b.character_name)
    return (bF ? 1 : 0) - (aF ? 1 : 0)
  })

  // Filter
  const filtered = yarns.filter(y => {
    if (filterChar) {
      const mentioned = (y.lore_yarn_characters || []).some((yc: any) => yc.lore_characters?.character_name === filterChar)
      const author = (y.lore_characters as any)?.character_name === filterChar
      if (!mentioned && !author) return false
    }
    if (filterTag) {
      const hasTags = (y.lore_yarn_tags || []).some((yt: any) => yt.lore_tags?.name === filterTag)
      if (!hasTags) return false
    }
    if (filterPlace && y.place !== filterPlace) return false
    return true
  })

  // Group by year, then by event
  const byYear: Record<number, Record<string, any[]>> = {}
  for (const yarn of filtered) {
    if (!byYear[yarn.year]) byYear[yarn.year] = {}
    const eventKey = yarn.event_id ? `event:${yarn.event_id}` : 'no_event'
    if (!byYear[yarn.year][eventKey]) byYear[yarn.year][eventKey] = []
    byYear[yarn.year][eventKey].push(yarn)
  }

  const years = Object.keys(byYear).map(Number).sort((a, b) => a - b)

  const selectStyle: React.CSSProperties = { fontSize: 11, padding: '4px 8px', border: '1px solid #ccc', fontFamily: 'inherit', flex: 1, minWidth: 120 }

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

        <Link href="/lore/dashboard" style={{ fontSize: 11, color: '#999', letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none' }}>
          ← GO BACK
        </Link>

        <h1 style={{ fontSize: 22, fontWeight: 400, color: '#C85A5A', letterSpacing: '0.15em', textTransform: 'uppercase', textAlign: 'center', margin: '16px 0' }}>
          INDEX
        </h1>

        <hr style={{ border: 'none', borderTop: '1px solid #000', marginBottom: 16 }} />

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>FILTER</span>
          <select value={filterChar} onChange={e => setFilterChar(e.target.value)} style={selectStyle}>
            <option value="">CHARACTERS</option>
            {sortedFollowedChars.map(c => (
              <option key={c.id} value={c.character_name}>
                {follows.some(f => f.follow_type === 'character' && f.follow_value === c.character_name) ? '★ ' : ''}{c.character_name}
              </option>
            ))}
          </select>
          <select value={filterTag} onChange={e => setFilterTag(e.target.value)} style={selectStyle}>
            <option value="">TAGS</option>
            {allTags.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
          <select value={filterPlace} onChange={e => setFilterPlace(e.target.value)} style={selectStyle}>
            <option value="">PLACES</option>
            {allPlaces.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {(filterChar || filterTag || filterPlace) && (
            <button onClick={() => { setFilterChar(''); setFilterTag(''); setFilterPlace('') }} style={{ fontSize: 10, padding: '4px 8px', border: '1px solid #ccc', background: 'none', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.06em' }}>
              CLEAR
            </button>
          )}
        </div>
        <hr style={{ border: 'none', borderTop: '1px solid #e8e8e8', marginBottom: 24 }} />

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', fontSize: 13, color: '#999', padding: '40px 0' }}>No yarns found.</div>
        )}

        {/* Year blocks */}
        {years.map((year, yi) => {
          const eventGroups = byYear[year]
          const eventKeys = Object.keys(eventGroups)
          const noEventYarns = eventGroups['no_event'] || []
          const eventEntries = eventKeys.filter(k => k !== 'no_event').map(k => {
            const yarnList = eventGroups[k]
            const event = yarnList[0]?.lore_events
            return { event, yarns: yarnList }
          })

          return (
            <div key={year} style={{ display: 'grid', gridTemplateColumns: '64px 1fr', marginBottom: 24 }}>
              <div style={{ paddingTop: 4 }}>
                <span style={{ fontSize: 11, color: '#999', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{year}</span>
              </div>
              <div style={{ borderLeft: '1px solid #ddd', paddingLeft: 20 }}>

                {/* Event groups */}
                {eventEntries.map(({ event, yarns: eventYarns }) => (
                  <div key={event?.id} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #000', paddingBottom: 6, marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, flex: 1, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{event?.title}</span>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {monthlyGolden && eventYarns.some((y: any) => y.id === monthlyGolden) && (
                          <img src="/lore_golden_yarn_symbol.png" alt="" style={{ width: 14, height: 14, filter: 'sepia(0) saturate(1) hue-rotate(0deg)', opacity: 0.7 }} />
                        )}
                        {yearlyGolden && eventYarns.some((y: any) => y.id === yearlyGolden) && (
                          <img src="/lore_golden_yarn_symbol.png" alt="" style={{ width: 14, height: 14, filter: 'sepia(1) saturate(2) hue-rotate(10deg)' }} />
                        )}
                      </div>
                    </div>
                    {eventYarns.map((yarn: any) => (
                      <YarnRow key={yarn.id} yarn={yarn} isHearted={myHearts.has(yarn.id)} onHeart={() => toggleHeart(yarn.id)} monthlyGolden={monthlyGolden} yearlyGolden={yearlyGolden} />
                    ))}
                  </div>
                ))}

                {/* No-event yarns */}
                {noEventYarns.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    {eventEntries.length > 0 && (
                      <div style={{ borderBottom: '1px solid #eee', paddingBottom: 6, marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em' }}>NO EVENT</span>
                      </div>
                    )}
                    {noEventYarns.map((yarn: any) => (
                      <YarnRow key={yarn.id} yarn={yarn} isHearted={myHearts.has(yarn.id)} onHeart={() => toggleHeart(yarn.id)} monthlyGolden={monthlyGolden} yearlyGolden={yearlyGolden} />
                    ))}
                  </div>
                )}

              </div>
            </div>
          )
        })}

      </main>
      <LoreFooter />
    </div>
  )
}

function YarnRow({ yarn, isHearted, onHeart, monthlyGolden, yearlyGolden }: {
  yarn: any; isHearted: boolean; onHeart: () => void; monthlyGolden: string | undefined; yearlyGolden: string | undefined
}) {
  const author = (yarn.lore_characters as any)?.character_name || 'Unknown'
  const dateStr = formatDate(yarn.day, yarn.month, yarn.year)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 10, color: '#bbb', minWidth: 72, flexShrink: 0 }}>{dateStr}</span>
      <Link href={`/lore/yarn/${yarn.id}`} style={{ fontSize: 13, textDecoration: 'underline', color: '#000', flex: 1, minWidth: 80 }}>
        {yarn.title}
      </Link>
      <span style={{ fontSize: 11, color: '#999', flexShrink: 0 }}>{author}</span>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
        {monthlyGolden === yarn.id && <img src="/lore_golden_yarn_symbol.png" alt="" style={{ width: 14, height: 14, opacity: 0.7 }} />}
        {yearlyGolden === yarn.id && <img src="/lore_golden_yarn_symbol.png" alt="" style={{ width: 14, height: 14, filter: 'sepia(1) saturate(2) hue-rotate(10deg)' }} />}
        <button onClick={onHeart} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: isHearted ? '#C85A5A' : '#ccc', padding: 0, fontFamily: 'inherit', lineHeight: 1 }}>
          {isHearted ? '♥' : '♡'}
        </button>
      </div>
    </div>
  )
}

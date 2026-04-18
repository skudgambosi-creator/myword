'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: '#000', color: '#fff', padding: '8px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{children}</div>
)

export default function LoreAddTagPage() {
  const router = useRouter()
  const mainSupa = createClient()
  const lore = createLoreClient()

  const [userId, setUserId] = useState<string | null>(null)
  const [draft, setDraft] = useState<any>(null)

  const [allChars, setAllChars] = useState<any[]>([])
  const [allTags, setAllTags] = useState<any[]>([])
  const [allEvents, setAllEvents] = useState<any[]>([])
  const [allPlaces, setAllPlaces] = useState<string[]>([])

  const [selectedChars, setSelectedChars] = useState<string[]>([])
  const [newCharName, setNewCharName] = useState('')

  const [place, setPlace] = useState('')
  const [placeSuggestions, setPlaceSuggestions] = useState<string[]>([])

  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [newTagName, setNewTagName] = useState('')
  const [selectedTabooTags, setSelectedTabooTags] = useState<string[]>([])
  const [newTabooTagName, setNewTabooTagName] = useState('')

  const [eventMode, setEventMode] = useState<'none' | 'existing' | 'new'>('none')
  const [selectedEventId, setSelectedEventId] = useState('')
  const [newEventName, setNewEventName] = useState('')
  const [eventTiming, setEventTiming] = useState<'lead_up' | 'happened_at'>('happened_at')

  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await mainSupa.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)

      const draftRaw = sessionStorage.getItem('lore_yarn_draft')
      if (!draftRaw) { router.push('/lore/add'); return }
      setDraft(JSON.parse(draftRaw))

      const [{ data: chars }, { data: tags }, { data: events }, { data: places }] = await Promise.all([
        lore.from('lore_characters').select('id, character_name'),
        lore.from('lore_tags').select('id, name, is_taboo'),
        lore.from('lore_events').select('id, title').order('title'),
        lore.from('lore_yarns').select('place').not('place', 'is', null),
      ])

      setAllChars(chars || [])
      setAllTags((tags || []).filter((t: any) => !t.is_taboo))
      setAllEvents(events || [])
      const uniquePlaces = Array.from(new Set((places || []).map((p: any) => p.place).filter(Boolean))) as string[]
      setAllPlaces(uniquePlaces)
    }
    init()
  }, [])

  const toggleChar = (id: string) => setSelectedChars(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  const toggleTag = (id: string) => setSelectedTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])
  const toggleTabooTag = (id: string) => setSelectedTabooTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])

  const addNewChar = async () => {
    if (!newCharName.trim()) return
    const existing = allChars.find(c => c.character_name.toLowerCase() === newCharName.trim().toLowerCase())
    if (existing) {
      if (!selectedChars.includes(existing.id)) setSelectedChars(prev => [...prev, existing.id])
    } else {
      const { data } = await lore.from('lore_characters').insert({ character_name: newCharName.trim(), user_id: userId }).select().single()
      if (data) {
        setAllChars(prev => [...prev, data])
        setSelectedChars(prev => [...prev, (data as any).id])
      }
    }
    setNewCharName('')
  }

  const addNewTag = async (isTaboo: boolean) => {
    const name = isTaboo ? newTabooTagName.trim() : newTagName.trim()
    if (!name) return
    const existing = [...allTags, ...allChars].find((t: any) => t.name?.toLowerCase() === name.toLowerCase())
    let tagId: string
    if (existing) {
      tagId = existing.id
    } else {
      const { data } = await lore.from('lore_tags').insert({ name, is_taboo: isTaboo }).select().single()
      if (!data) return
      tagId = (data as any).id
      if (isTaboo) {
        setAllTags(prev => [...prev])
      } else {
        setAllTags(prev => [...prev, data])
      }
    }
    if (isTaboo) {
      if (!selectedTabooTags.includes(tagId)) setSelectedTabooTags(prev => [...prev, tagId])
    } else {
      if (!selectedTags.includes(tagId)) setSelectedTags(prev => [...prev, tagId])
    }
    isTaboo ? setNewTabooTagName('') : setNewTagName('')
  }

  const handlePublish = async () => {
    if (!draft || !userId) return
    setPublishing(true)
    setError('')

    try {
      // Get or create author character
      let { data: authorChar } = await lore.from('lore_characters').select('id').eq('user_id', userId).single()
      if (!authorChar) {
        const { data: newChar } = await lore.from('lore_characters').insert({ user_id: userId, character_name: 'Unknown' }).select().single()
        authorChar = newChar
      }
      if (!authorChar) throw new Error('Could not find character')

      // Handle event
      let eventId: string | null = null
      if (eventMode === 'existing' && selectedEventId) {
        eventId = selectedEventId
      } else if (eventMode === 'new' && newEventName.trim()) {
        const { data: newEvent } = await lore.from('lore_events').insert({ title: newEventName.trim() }).select().single()
        if (newEvent) eventId = (newEvent as any).id
      }

      const wordCount = draft.bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length

      // Insert yarn
      const { data: newYarn, error: yarnErr } = await lore.from('lore_yarns').insert({
        author_id: (authorChar as any).id,
        title: draft.title,
        body_html: draft.bodyHtml,
        day: draft.day ? parseInt(draft.day) : null,
        month: draft.month ? parseInt(draft.month) : null,
        year: parseInt(draft.year),
        place: place.trim() || null,
        event_id: eventId,
        event_timing: eventId ? eventTiming : null,
        parent_yarn_id: draft.parentYarnId || null,
        word_count: wordCount,
      }).select().single()

      if (yarnErr || !newYarn) throw new Error(yarnErr?.message || 'Failed to save yarn')

      const yarnId = (newYarn as any).id

      // Insert tags
      const allTagIds = [...selectedTags, ...selectedTabooTags]
      if (allTagIds.length > 0) {
        await lore.from('lore_yarn_tags').insert(allTagIds.map(tag_id => ({ yarn_id: yarnId, tag_id })))
      }

      // Insert character mentions
      if (selectedChars.length > 0) {
        await lore.from('lore_yarn_characters').insert(selectedChars.map(character_id => ({ yarn_id: yarnId, character_id })))

        // Create mention notifications
        const mentionedCharsData = allChars.filter(c => selectedChars.includes(c.id))
        for (const char of mentionedCharsData) {
          const { data: charUser } = await lore.from('lore_characters').select('user_id').eq('id', char.id).single()
          if (charUser && (charUser as any).user_id !== userId) {
            await lore.from('lore_notifications').insert({
              user_id: (charUser as any).user_id,
              notif_type: 'mention',
              yarn_id: yarnId,
            })
          }
        }
      }

      sessionStorage.removeItem('lore_yarn_draft')
      router.push(`/lore/yarn/${yarnId}`)
    } catch (e: any) {
      setError(e.message || 'Something went wrong.')
      setPublishing(false)
    }
  }

  const pillStyle = (active: boolean, taboo?: boolean): React.CSSProperties => ({
    padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
    border: `1px solid ${active ? (taboo ? '#C85A5A' : '#000') : '#ccc'}`,
    background: active ? (taboo ? '#C85A5A' : '#000') : 'none',
    color: active ? '#fff' : '#666',
    letterSpacing: '0.06em', transition: 'background 0.1s, color 0.1s',
  })

  const timingBtn = (val: typeof eventTiming): React.CSSProperties => ({
    padding: '5px 12px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
    border: '1px solid #000', marginRight: -1,
    background: eventTiming === val ? '#000' : 'none',
    color: eventTiming === val ? '#fff' : '#000',
  })

  const modeBtn = (val: typeof eventMode): React.CSSProperties => ({
    padding: '5px 12px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
    border: '1px solid #000', marginRight: -1,
    background: eventMode === val ? '#000' : 'none',
    color: eventMode === val ? '#fff' : '#000',
  })

  const stepStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
    color: active ? '#fff' : '#999', background: active ? '#000' : 'transparent',
    border: '1px solid #000', padding: '4px 14px',
  })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />
      <main className="page-main">

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 8 }}>
          <span style={stepStyle(false)}>1 — WRITE</span>
          <div style={{ flex: 1, height: 1, background: '#000' }} />
          <span style={stepStyle(true)}>2 — TAG & FILE</span>
        </div>

        {/* Characters */}
        <div style={{ border: '1px solid #000', marginBottom: 16, overflow: 'hidden' }}>
          <SectionHeader>CHARACTERS MENTIONED</SectionHeader>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {allChars.map(c => (
                <button key={c.id} onClick={() => toggleChar(c.id)} style={pillStyle(selectedChars.includes(c.id))}>
                  {c.character_name}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={newCharName} onChange={e => setNewCharName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNewChar()} placeholder="Add character..." style={{ flex: 1, background: 'none', border: 'none', borderBottom: '1px solid #ccc', padding: '6px 0', fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
              <button onClick={addNewChar} style={{ border: '1px solid #000', padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', background: 'none', letterSpacing: '0.06em' }}>ADD</button>
            </div>
          </div>
        </div>

        {/* Place */}
        <div style={{ border: '1px solid #000', marginBottom: 16, overflow: 'hidden' }}>
          <SectionHeader>PLACE</SectionHeader>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={place} onChange={e => { setPlace(e.target.value); setPlaceSuggestions(allPlaces.filter(p => p.toLowerCase().includes(e.target.value.toLowerCase()) && e.target.value)) }}
                placeholder="Enter a place..." list="place-suggestions"
                style={{ flex: 1, background: 'none', border: 'none', borderBottom: '1px solid #ccc', padding: '6px 0', fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
              <button onClick={() => setPlace('')} style={{ border: '1px solid #ccc', padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', background: 'none', letterSpacing: '0.06em' }}>CLEAR</button>
            </div>
            <datalist id="place-suggestions">
              {allPlaces.map(p => <option key={p} value={p} />)}
            </datalist>
          </div>
        </div>

        {/* Tags */}
        <div style={{ border: '1px solid #000', marginBottom: 16, overflow: 'hidden' }}>
          <SectionHeader>TAGS</SectionHeader>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {allTags.map(t => (
                <button key={t.id} onClick={() => toggleTag(t.id)} style={pillStyle(selectedTags.includes(t.id))}>{t.name}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={newTagName} onChange={e => setNewTagName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNewTag(false)} placeholder="Add tag..." style={{ flex: 1, background: 'none', border: 'none', borderBottom: '1px solid #ccc', padding: '6px 0', fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
              <button onClick={() => addNewTag(false)} style={{ border: '1px solid #000', padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', background: 'none', letterSpacing: '0.06em' }}>ADD</button>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #ccc', padding: '16px' }}>
            <div style={{ fontSize: 10, color: '#C85A5A', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>TABOO TAGS</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {/* taboo tags shown on demand — start empty, user adds */}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input value={newTabooTagName} onChange={e => setNewTabooTagName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNewTag(true)} placeholder="Add taboo tag..." style={{ flex: 1, background: 'none', border: 'none', borderBottom: '1px solid #C85A5A', padding: '6px 0', fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
              <button onClick={() => addNewTag(true)} style={{ border: '1px solid #C85A5A', color: '#C85A5A', padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', background: 'none', letterSpacing: '0.06em' }}>ADD</button>
            </div>
            <div style={{ fontSize: 11, color: '#999', lineHeight: 1.6 }}>
              Taboo tags replace the text body with _ for readers who haven't been mentioned in a yarn using this tag, or submitted one themselves.
            </div>
          </div>
        </div>

        {/* Event */}
        <div style={{ border: '1px solid #000', marginBottom: 24, overflow: 'hidden' }}>
          <SectionHeader>EVENT</SectionHeader>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', marginBottom: 16 }}>
              <button onClick={() => setEventMode('none')} style={modeBtn('none')}>NO EVENT</button>
              <button onClick={() => setEventMode('existing')} style={modeBtn('existing')}>SELECT EXISTING</button>
              <button onClick={() => setEventMode('new')} style={modeBtn('new')}>CREATE NEW</button>
            </div>

            {eventMode === 'existing' && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)} style={{ flex: 1, border: '1px solid #ccc', padding: '6px 8px', fontSize: 12, fontFamily: 'inherit' }}>
                  <option value="">Select event...</option>
                  {allEvents.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                </select>
                <div style={{ display: 'flex' }}>
                  <button onClick={() => setEventTiming('lead_up')} style={timingBtn('lead_up')}>LEAD UP TO EVENT</button>
                  <button onClick={() => setEventTiming('happened_at')} style={timingBtn('happened_at')}>HAPPENED AT EVENT</button>
                </div>
              </div>
            )}

            {eventMode === 'new' && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input value={newEventName} onChange={e => setNewEventName(e.target.value)} placeholder="Event name..." style={{ flex: 1, background: 'none', border: 'none', borderBottom: '1px solid #ccc', padding: '6px 0', fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
                <div style={{ display: 'flex' }}>
                  <button onClick={() => setEventTiming('lead_up')} style={timingBtn('lead_up')}>LEAD UP TO EVENT</button>
                  <button onClick={() => setEventTiming('happened_at')} style={timingBtn('happened_at')}>HAPPENED AT EVENT</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && <div style={{ fontSize: 12, color: '#C85A5A', marginBottom: 12 }}>{error}</div>}

        {/* Bottom bar */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button onClick={() => router.push('/lore/add')} style={{ background: 'none', border: '1px solid #ccc', padding: '8px 20px', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit' }}>
            ← BACK
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={handlePublish} disabled={publishing} style={{ background: '#C85A5A', color: '#fff', border: '1px solid #C85A5A', padding: '8px 24px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit' }}>
            {publishing ? '...' : 'PUBLISH'}
          </button>
        </div>

      </main>
      <LoreFooter />
    </div>
  )
}

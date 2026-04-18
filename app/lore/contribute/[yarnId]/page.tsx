'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createLoreClient } from '@/lib/supabase/lore-client'
import Nav from '@/components/layout/Nav'
import LoreEditor from '@/components/editor/LoreEditor'

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

function countWords(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length
}

export default function ContributePage() {
  const { yarnId } = useParams<{ yarnId: string }>()
  const router = useRouter()
  const mainSupa = createClient()
  const lore = createLoreClient()

  const [userId, setUserId] = useState<string | null>(null)
  const [parentTitle, setParentTitle] = useState('')
  const [step, setStep] = useState<1 | 2>(1)

  // Step 1
  const [day, setDay] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [title, setTitle] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [writeError, setWriteError] = useState('')

  // Step 2
  const [allChars, setAllChars] = useState<any[]>([])
  const [allTags, setAllTags] = useState<any[]>([])
  const [allEvents, setAllEvents] = useState<any[]>([])
  const [allPlaces, setAllPlaces] = useState<string[]>([])
  const [selectedChars, setSelectedChars] = useState<string[]>([])
  const [newCharName, setNewCharName] = useState('')
  const [place, setPlace] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [newTagName, setNewTagName] = useState('')
  const [selectedTabooTags, setSelectedTabooTags] = useState<string[]>([])
  const [newTabooTagName, setNewTabooTagName] = useState('')
  const [eventMode, setEventMode] = useState<'none' | 'existing' | 'new'>('none')
  const [selectedEventId, setSelectedEventId] = useState('')
  const [newEventName, setNewEventName] = useState('')
  const [eventTiming, setEventTiming] = useState<'lead_up' | 'happened_at'>('happened_at')
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState('')

  const wordCount = countWords(bodyHtml)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await mainSupa.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)

      const { data: parentYarn } = await lore.from('lore_yarns').select('title').eq('id', yarnId).single()
      if (parentYarn) setParentTitle((parentYarn as any).title)

      const [{ data: chars }, { data: tags }, { data: events }, { data: places }] = await Promise.all([
        lore.from('lore_characters').select('id, character_name'),
        lore.from('lore_tags').select('id, name, is_taboo'),
        lore.from('lore_events').select('id, title').order('title'),
        lore.from('lore_yarns').select('place').not('place', 'is', null),
      ])
      setAllChars(chars || [])
      setAllTags((tags || []).filter((t: any) => !t.is_taboo))
      setAllEvents(events || [])
      setAllPlaces(Array.from(new Set((places || []).map((p: any) => p.place).filter(Boolean))) as string[])
    }
    init()
  }, [yarnId])

  const handleContinue = () => {
    setWriteError('')
    if (!year.trim()) { setWriteError('Year is required.'); return }
    if (!title.trim()) { setWriteError('Title is required.'); return }
    if (wordCount < 5) { setWriteError('Minimum 5 words required.'); return }
    setStep(2)
    window.scrollTo(0, 0)
  }

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
      if (data) { setAllChars(prev => [...prev, data]); setSelectedChars(prev => [...prev, (data as any).id]) }
    }
    setNewCharName('')
  }

  const addNewTag = async (isTaboo: boolean) => {
    const name = isTaboo ? newTabooTagName.trim() : newTagName.trim()
    if (!name) return
    const { data } = await lore.from('lore_tags').insert({ name, is_taboo: isTaboo }).select().single()
    if (data) {
      if (!isTaboo) setAllTags(prev => [...prev, data])
      const id = (data as any).id
      isTaboo ? setSelectedTabooTags(prev => [...prev, id]) : setSelectedTags(prev => [...prev, id])
    }
    isTaboo ? setNewTabooTagName('') : setNewTagName('')
  }

  const handlePublish = async () => {
    if (!userId) return
    setPublishing(true)
    setPublishError('')

    try {
      let { data: authorChar } = await lore.from('lore_characters').select('id').eq('user_id', userId).single()
      if (!authorChar) {
        const { data: newChar } = await lore.from('lore_characters').insert({ user_id: userId, character_name: 'Unknown' }).select().single()
        authorChar = newChar
      }
      if (!authorChar) throw new Error('Could not find character')

      let eventId: string | null = null
      if (eventMode === 'existing' && selectedEventId) eventId = selectedEventId
      else if (eventMode === 'new' && newEventName.trim()) {
        const { data: newEvent } = await lore.from('lore_events').insert({ title: newEventName.trim() }).select().single()
        if (newEvent) eventId = (newEvent as any).id
      }

      const wc = countWords(bodyHtml)

      const { data: newYarn, error: yarnErr } = await lore.from('lore_yarns').insert({
        author_id: (authorChar as any).id,
        title, body_html: bodyHtml,
        day: day ? parseInt(day) : null,
        month: month ? parseInt(month) : null,
        year: parseInt(year),
        place: place.trim() || null,
        event_id: eventId,
        event_timing: eventId ? eventTiming : null,
        parent_yarn_id: yarnId,
        word_count: wc,
      }).select().single()

      if (yarnErr || !newYarn) throw new Error(yarnErr?.message || 'Failed to save yarn')

      const newYarnId = (newYarn as any).id

      if ([...selectedTags, ...selectedTabooTags].length > 0) {
        await lore.from('lore_yarn_tags').insert([...selectedTags, ...selectedTabooTags].map(tag_id => ({ yarn_id: newYarnId, tag_id })))
      }
      if (selectedChars.length > 0) {
        await lore.from('lore_yarn_characters').insert(selectedChars.map(character_id => ({ yarn_id: newYarnId, character_id })))
      }

      router.push(`/lore/yarn/${newYarnId}`)
    } catch (e: any) {
      setPublishError(e.message || 'Something went wrong.')
      setPublishing(false)
    }
  }

  const stepStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
    color: active ? '#fff' : '#999', background: active ? '#000' : 'transparent',
    border: '1px solid #000', padding: '4px 14px',
  })

  const pillStyle = (active: boolean, taboo?: boolean): React.CSSProperties => ({
    padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
    border: `1px solid ${active ? (taboo ? '#C85A5A' : '#000') : '#ccc'}`,
    background: active ? (taboo ? '#C85A5A' : '#000') : 'none',
    color: active ? '#fff' : '#666', letterSpacing: '0.06em',
  })

  const timingBtn = (val: typeof eventTiming): React.CSSProperties => ({
    padding: '5px 12px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
    border: '1px solid #000', marginRight: -1,
    background: eventTiming === val ? '#000' : 'none', color: eventTiming === val ? '#fff' : '#000',
  })

  const modeBtn = (val: typeof eventMode): React.CSSProperties => ({
    padding: '5px 12px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
    border: '1px solid #000', marginRight: -1,
    background: eventMode === val ? '#000' : 'none', color: eventMode === val ? '#fff' : '#000',
  })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />
      <main className="page-main">

        <div style={{ fontSize: 11, color: '#999', marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          CONTRIBUTING TO: <span style={{ color: '#000' }}>{parentTitle}</span>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 8 }}>
          <span style={stepStyle(step === 1)}>1 — WRITE</span>
          <div style={{ flex: 1, height: 1, background: step === 2 ? '#000' : '#ccc' }} />
          <span style={stepStyle(step === 2)}>2 — TAG & FILE</span>
        </div>

        {step === 1 && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[['DAY', day, setDay, 1, 31], ['MONTH', month, setMonth, 1, 12]].map(([label, val, setter, min, max]: any) => (
                <div key={label as string} style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{label}</div>
                  <input type="number" min={min} max={max} value={val} onChange={e => setter(e.target.value)} placeholder="—"
                    style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid #000', padding: '8px 0', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }} />
                </div>
              ))}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>YEAR <span style={{ color: '#C85A5A' }}>*</span></div>
                <input type="number" value={year} onChange={e => setYear(e.target.value)} placeholder="required"
                  style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid #000', padding: '8px 0', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="TITLE"
                style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid #000', padding: '10px 0', fontSize: 15, fontFamily: 'inherit', outline: 'none', letterSpacing: '0.1em', textTransform: 'uppercase', boxSizing: 'border-box' as const }} />
            </div>

            <div style={{ border: '1px solid #ccc', marginBottom: 8 }}>
              {userId && <LoreEditor content={bodyHtml} onChange={setBodyHtml} userId={userId} />}
            </div>
            <div style={{ textAlign: 'right', fontSize: 11, color: '#999', marginBottom: 24 }}>{wordCount} / 2000</div>

            {writeError && <div style={{ fontSize: 12, color: '#C85A5A', marginBottom: 12 }}>{writeError}</div>}

            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button onClick={() => router.push(`/lore/yarn/${yarnId}`)} style={{ background: 'none', border: '1px solid #ccc', padding: '8px 20px', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit' }}>CANCEL</button>
              <div style={{ flex: 1 }} />
              <button onClick={handleContinue} style={{ background: '#000', color: '#fff', border: '1px solid #000', padding: '8px 20px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit' }}>CONTINUE →</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            {/* Characters */}
            <div style={{ border: '1px solid #000', marginBottom: 16, overflow: 'hidden' }}>
              <SectionHeader>CHARACTERS MENTIONED</SectionHeader>
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  {allChars.map(c => <button key={c.id} onClick={() => toggleChar(c.id)} style={pillStyle(selectedChars.includes(c.id))}>{c.character_name}</button>)}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={newCharName} onChange={e => setNewCharName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNewChar()} placeholder="Add character..." style={{ flex: 1, background: 'none', border: 'none', borderBottom: '1px solid #ccc', padding: '6px 0', fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
                  <button onClick={addNewChar} style={{ border: '1px solid #000', padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', background: 'none' }}>ADD</button>
                </div>
              </div>
            </div>

            {/* Place */}
            <div style={{ border: '1px solid #000', marginBottom: 16, overflow: 'hidden' }}>
              <SectionHeader>PLACE</SectionHeader>
              <div style={{ padding: '16px' }}>
                <input value={place} onChange={e => setPlace(e.target.value)} list="contribute-places" placeholder="Enter a place..."
                  style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid #ccc', padding: '6px 0', fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                <datalist id="contribute-places">{allPlaces.map(p => <option key={p} value={p} />)}</datalist>
              </div>
            </div>

            {/* Tags */}
            <div style={{ border: '1px solid #000', marginBottom: 16, overflow: 'hidden' }}>
              <SectionHeader>TAGS</SectionHeader>
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  {allTags.map(t => <button key={t.id} onClick={() => toggleTag(t.id)} style={pillStyle(selectedTags.includes(t.id))}>{t.name}</button>)}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={newTagName} onChange={e => setNewTagName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNewTag(false)} placeholder="Add tag..." style={{ flex: 1, background: 'none', border: 'none', borderBottom: '1px solid #ccc', padding: '6px 0', fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
                  <button onClick={() => addNewTag(false)} style={{ border: '1px solid #000', padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', background: 'none' }}>ADD</button>
                </div>
              </div>
              <div style={{ borderTop: '1px solid #ccc', padding: '16px' }}>
                <div style={{ fontSize: 10, color: '#C85A5A', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>TABOO TAGS</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input value={newTabooTagName} onChange={e => setNewTabooTagName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNewTag(true)} placeholder="Add taboo tag..." style={{ flex: 1, background: 'none', border: 'none', borderBottom: '1px solid #C85A5A', padding: '6px 0', fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
                  <button onClick={() => addNewTag(true)} style={{ border: '1px solid #C85A5A', color: '#C85A5A', padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', background: 'none' }}>ADD</button>
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
                      <button onClick={() => setEventTiming('lead_up')} style={timingBtn('lead_up')}>LEAD UP</button>
                      <button onClick={() => setEventTiming('happened_at')} style={timingBtn('happened_at')}>HAPPENED AT</button>
                    </div>
                  </div>
                )}
                {eventMode === 'new' && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input value={newEventName} onChange={e => setNewEventName(e.target.value)} placeholder="Event name..." style={{ flex: 1, background: 'none', border: 'none', borderBottom: '1px solid #ccc', padding: '6px 0', fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
                    <div style={{ display: 'flex' }}>
                      <button onClick={() => setEventTiming('lead_up')} style={timingBtn('lead_up')}>LEAD UP</button>
                      <button onClick={() => setEventTiming('happened_at')} style={timingBtn('happened_at')}>HAPPENED AT</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {publishError && <div style={{ fontSize: 12, color: '#C85A5A', marginBottom: 12 }}>{publishError}</div>}

            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button onClick={() => { setStep(1); window.scrollTo(0, 0) }} style={{ background: 'none', border: '1px solid #ccc', padding: '8px 20px', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit' }}>← BACK</button>
              <div style={{ flex: 1 }} />
              <button onClick={handlePublish} disabled={publishing} style={{ background: '#C85A5A', color: '#fff', border: '1px solid #C85A5A', padding: '8px 24px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit' }}>
                {publishing ? '...' : 'PUBLISH'}
              </button>
            </div>
          </>
        )}

      </main>
      <LoreFooter />
    </div>
  )
}

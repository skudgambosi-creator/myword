'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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

function InlineError({ msg }: { msg: string }) {
  if (!msg) return null
  return <div style={{ fontSize: 11, color: '#C85A5A', marginTop: 6, letterSpacing: '0.03em' }}>{msg}</div>
}

const inputStyle: React.CSSProperties = {
  flex: 1, background: 'none', border: 'none', borderBottom: '1px solid #ccc',
  padding: '6px 0', fontSize: 12, fontFamily: 'inherit', outline: 'none',
}

const addBtn: React.CSSProperties = {
  border: '1px solid #000', padding: '4px 12px', fontSize: 11,
  cursor: 'pointer', fontFamily: 'inherit', background: 'none', letterSpacing: '0.06em',
}

function countWords(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length
}

export default function LoreAddTagPage() {
  const router = useRouter()
  const mainSupa = createClient()

  // ── Core ──────────────────────────────────────────────
  const [yarnId, setYarnId] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [initError, setInitError] = useState('')
  const [loading, setLoading] = useState(true)

  // ── Reference data ────────────────────────────────────
  const [allChars, setAllChars] = useState<any[]>([])
  const [allTags, setAllTags] = useState<any[]>([])       // non-taboo
  const [allEvents, setAllEvents] = useState<any[]>([])
  const [allPlaces, setAllPlaces] = useState<string[]>([])

  // ── Characters ────────────────────────────────────────
  const [selectedChars, setSelectedChars] = useState<string[]>([])
  const [newCharName, setNewCharName] = useState('')
  const [charError, setCharError] = useState('')
  const [charBusy, setCharBusy] = useState(false)

  // ── Place ─────────────────────────────────────────────
  const [place, setPlace] = useState('')
  const [placeSaved, setPlaceSaved] = useState('')
  const [placeBusy, setPlaceBusy] = useState(false)
  const [placeError, setPlaceError] = useState('')
  const [placeSuggestions, setPlaceSuggestions] = useState<{ display_name: string; lat: string; lon: string }[]>([])
  const [placeSearching, setPlaceSearching] = useState(false)
  const [selectedPlaceLat, setSelectedPlaceLat] = useState<number | null>(null)
  const [selectedPlaceLon, setSelectedPlaceLon] = useState<number | null>(null)
  const placeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Tags (non-taboo) ──────────────────────────────────
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [newTagName, setNewTagName] = useState('')
  const [tagError, setTagError] = useState('')
  const [tagBusy, setTagBusy] = useState(false)

  // ── Taboo tags ────────────────────────────────────────
  const [selectedTabooTags, setSelectedTabooTags] = useState<{ id: string; name: string }[]>([])
  const [newTabooTagName, setNewTabooTagName] = useState('')
  const [tabooTagError, setTabooTagError] = useState('')
  const [tabooTagBusy, setTabooTagBusy] = useState(false)

  // ── Event ─────────────────────────────────────────────
  const [eventMode, setEventMode] = useState<'none' | 'existing' | 'new'>('none')
  const [eventId, setEventId] = useState<string | null>(null)
  const [eventTitle, setEventTitle] = useState('')
  const [eventTiming, setEventTiming] = useState<'lead_up' | 'happened_at'>('happened_at')
  const [eventDropdown, setEventDropdown] = useState('')
  const [newEventName, setNewEventName] = useState('')
  const [eventError, setEventError] = useState('')
  const [eventBusy, setEventBusy] = useState(false)

  // ─────────────────────────────────────────────────────
  // Init: load reference data, create yarn
  // ─────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await mainSupa.auth.getSession()
      if (!session) { router.push('/login'); return }

      const draftRaw = sessionStorage.getItem('lore_yarn_draft')
      if (!draftRaw) { router.push('/lore/add'); return }
      const draft = JSON.parse(draftRaw)

      // Load reference data via admin API (bypasses RLS)
      const refRes = await fetch('/api/lore/ref')
      const ref = refRes.ok ? await refRes.json() : { chars: [], tags: [], events: [], places: [] }

      setAllChars(ref.chars)
      setAllTags((ref.tags as any[]).filter((t: any) => !t.is_taboo))
      setAllEvents(ref.events)
      setAllPlaces(ref.places)

      // Edit mode: use existing yarn and pre-fill
      if (draft.editMode && draft.yarnId) {
        setEditMode(true)
        setYarnId(draft.yarnId)
        const detailRes = await fetch(`/api/lore/yarn/${draft.yarnId}/detail`)
        if (detailRes.ok) {
          const detailData = await detailRes.json()
          const y = detailData.yarn
          if (y.place) { setPlace(y.place); setPlaceSaved(y.place) }
          const charIds = (y.lore_yarn_characters || []).map((yc: any) => yc.lore_characters?.id).filter(Boolean)
          setSelectedChars(charIds)
          const nonTabooTagIds = (y.lore_yarn_tags || []).filter((yt: any) => yt.lore_tags && !yt.lore_tags.is_taboo).map((yt: any) => yt.lore_tags.id)
          setSelectedTags(nonTabooTagIds)
          const tabooTags = (y.lore_yarn_tags || []).filter((yt: any) => yt.lore_tags?.is_taboo).map((yt: any) => ({ id: yt.lore_tags.id, name: yt.lore_tags.name }))
          setSelectedTabooTags(tabooTags)
          if (y.event_id && (y.lore_events as any)?.title) {
            setEventId(y.event_id)
            setEventTitle((y.lore_events as any).title)
            setEventDropdown(y.event_id)
            setEventMode('existing')
            if (y.event_timing) setEventTiming(y.event_timing)
          }
        }
        setLoading(false)
        return
      }

      // Recover existing yarn or create fresh
      const existingId = sessionStorage.getItem('lore_yarn_id')
      if (existingId) {
        setYarnId(existingId)
      } else {
        const wordCount = countWords(draft.bodyHtml)
        const res = await fetch('/api/lore/yarn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: draft.title,
            bodyHtml: draft.bodyHtml,
            day: draft.day || null,
            month: draft.month || null,
            year: draft.year,
            wordCount,
            parentYarnId: draft.parentYarnId || null,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          setInitError(data.error || 'Could not create yarn. Go back and try again.')
          setLoading(false)
          return
        }
        sessionStorage.setItem('lore_yarn_id', data.yarnId)
        setYarnId(data.yarnId)
      }

      setLoading(false)
    }
    init()
  }, [])

  // ─────────────────────────────────────────────────────
  // Characters
  // ─────────────────────────────────────────────────────
  const handleToggleChar = async (charId: string) => {
    if (!yarnId) return
    const adding = !selectedChars.includes(charId)
    const res = await fetch(`/api/lore/yarn/${yarnId}/character`, {
      method: adding ? 'POST' : 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterId: charId }),
    })
    if (res.ok) {
      setSelectedChars(prev => adding ? [...prev, charId] : prev.filter(c => c !== charId))
    }
  }

  const handleAddChar = async () => {
    const trimmed = newCharName.trim()
    if (!trimmed || !yarnId) return
    setCharError('')
    const found = allChars.find(c => c.character_name.toLowerCase() === trimmed.toLowerCase())
    if (!found) {
      setCharError(`"${trimmed}" is not registered in Lore yet.`)
      return
    }
    if (selectedChars.includes(found.id)) { setNewCharName(''); return }
    setCharBusy(true)
    const res = await fetch(`/api/lore/yarn/${yarnId}/character`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterId: found.id }),
    })
    const data = await res.json()
    setCharBusy(false)
    if (!res.ok) { setCharError(data.error || 'Failed to add character.'); return }
    setSelectedChars(prev => [...prev, found.id])
    setNewCharName('')
  }

  // ─────────────────────────────────────────────────────
  // Place
  // ─────────────────────────────────────────────────────
  const handlePlaceInput = (val: string) => {
    setPlace(val)
    setPlaceError('')

    // Check if user selected a known suggestion (exact match → capture lat/lon)
    const matched = placeSuggestions.find(s => s.display_name === val)
    if (matched) {
      setSelectedPlaceLat(parseFloat(matched.lat))
      setSelectedPlaceLon(parseFloat(matched.lon))
    } else {
      setSelectedPlaceLat(null)
      setSelectedPlaceLon(null)
    }

    if (placeDebounceRef.current) clearTimeout(placeDebounceRef.current)
    if (val.length < 3) { setPlaceSuggestions([]); setPlaceSearching(false); return }
    setPlaceSearching(true)
    placeDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=8&addressdetails=1`,
          { headers: { 'Accept-Language': 'en', 'User-Agent': 'myword-lore/1.0' } }
        )
        const data = await res.json()
        setPlaceSuggestions((data as any[]).map((r: any) => ({ display_name: r.display_name, lat: r.lat, lon: r.lon })))
      } catch {}
      setPlaceSearching(false)
    }, 200)
  }

  const handleSetPlace = async () => {
    if (!yarnId) return
    setPlaceBusy(true)
    setPlaceError('')
    const res = await fetch(`/api/lore/yarn/${yarnId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ place, latitude: selectedPlaceLat, longitude: selectedPlaceLon }),
    })
    const data = await res.json()
    setPlaceBusy(false)
    if (!res.ok) { setPlaceError(data.error || 'Failed to set place.'); return }
    setPlaceSaved(place.trim())
  }

  // ─────────────────────────────────────────────────────
  // Tags
  // ─────────────────────────────────────────────────────
  const handleToggleTag = async (tag: any) => {
    if (!yarnId) return
    const adding = !selectedTags.includes(tag.id)
    const res = await fetch(`/api/lore/yarn/${yarnId}/tag`, {
      method: adding ? 'POST' : 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adding ? { tagId: tag.id } : { tagId: tag.id }),
    })
    if (res.ok) {
      setSelectedTags(prev => adding ? [...prev, tag.id] : prev.filter(t => t !== tag.id))
    }
  }

  const handleAddTag = async (isTaboo: boolean) => {
    const raw = isTaboo ? newTabooTagName : newTagName
    const trimmed = raw.trim()
    if (!trimmed || !yarnId) return

    const setBusy = isTaboo ? setTabooTagBusy : setTagBusy
    const setError = isTaboo ? setTabooTagError : setTagError
    const setNew = isTaboo ? setNewTabooTagName : setNewTagName

    setBusy(true)
    setError('')

    const res = await fetch(`/api/lore/yarn/${yarnId}/tag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagName: trimmed, isTaboo }),
    })
    const data = await res.json()
    setBusy(false)

    if (!res.ok) { setError(data.error || 'Failed to add tag.'); return }

    const { tagId, tagName: returnedName } = data

    if (isTaboo) {
      if (!selectedTabooTags.some(t => t.id === tagId)) {
        setSelectedTabooTags(prev => [...prev, { id: tagId, name: returnedName }])
      }
    } else {
      if (!selectedTags.includes(tagId)) {
        setSelectedTags(prev => [...prev, tagId])
        if (!allTags.some(t => t.id === tagId)) {
          setAllTags(prev => [...prev, { id: tagId, name: returnedName, is_taboo: false }])
        }
      }
    }
    setNew('')
  }

  const handleRemoveTabooTag = async (tag: { id: string; name: string }) => {
    if (!yarnId) return
    const res = await fetch(`/api/lore/yarn/${yarnId}/tag`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagId: tag.id }),
    })
    if (res.ok) {
      setSelectedTabooTags(prev => prev.filter(t => t.id !== tag.id))
    }
  }

  // ─────────────────────────────────────────────────────
  // Event
  // ─────────────────────────────────────────────────────
  const handleEventModeChange = async (mode: 'none' | 'existing' | 'new') => {
    setEventMode(mode)
    setEventError('')
    if (mode === 'none' && eventId && yarnId) {
      setEventBusy(true)
      const res = await fetch(`/api/lore/yarn/${yarnId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: null }),
      })
      setEventBusy(false)
      if (res.ok) { setEventId(null); setEventTitle(''); setEventDropdown('') }
    }
  }

  const handleSelectEvent = async (selectedId: string) => {
    setEventDropdown(selectedId)
    if (!selectedId || !yarnId) return
    setEventBusy(true)
    setEventError('')
    const res = await fetch(`/api/lore/yarn/${yarnId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: selectedId, eventTiming }),
    })
    const data = await res.json()
    setEventBusy(false)
    if (!res.ok) { setEventError(data.error || 'Failed to set event.'); return }
    const ev = allEvents.find(e => e.id === selectedId)
    if (ev) { setEventId(selectedId); setEventTitle(ev.title) }
  }

  const handleCreateEvent = async () => {
    const trimmed = newEventName.trim()
    if (!trimmed || !yarnId) return
    setEventBusy(true)
    setEventError('')
    const res = await fetch(`/api/lore/yarn/${yarnId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventName: trimmed, eventTiming }),
    })
    const data = await res.json()
    setEventBusy(false)
    if (!res.ok) { setEventError(data.error || 'Failed to create event.'); return }
    setEventId(data.eventId)
    setEventTitle(data.eventTitle)
    setAllEvents(prev => [...prev, { id: data.eventId, title: data.eventTitle }])
    setEventDropdown(data.eventId)
    setEventMode('existing')
    setNewEventName('')
  }

  const handleTimingChange = async (timing: 'lead_up' | 'happened_at') => {
    setEventTiming(timing)
    if (!eventId || !yarnId) return
    await fetch(`/api/lore/yarn/${yarnId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventTiming: timing }),
    })
  }

  // ─────────────────────────────────────────────────────
  // Navigation
  // ─────────────────────────────────────────────────────
  const handleBack = async () => {
    if (editMode && yarnId) {
      router.push(`/lore/add?edit=true&yarnId=${yarnId}`)
      return
    }
    if (yarnId) {
      await fetch(`/api/lore/yarn/${yarnId}`, { method: 'DELETE' })
      sessionStorage.removeItem('lore_yarn_id')
    }
    router.push('/lore/add')
  }

  const handlePublish = async () => {
    if (yarnId) {
      await fetch(`/api/lore/yarn/${yarnId}/publish`, { method: 'POST' })
    }
    sessionStorage.removeItem('lore_yarn_draft')
    sessionStorage.removeItem('lore_yarn_id')
    router.push(`/lore/yarn/${yarnId}`)
  }

  // ─────────────────────────────────────────────────────
  // Styles
  // ─────────────────────────────────────────────────────
  const pill = (active: boolean, taboo?: boolean): React.CSSProperties => ({
    padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
    border: `1px solid ${active ? (taboo ? '#C85A5A' : '#000') : '#ccc'}`,
    background: active ? (taboo ? '#C85A5A' : '#000') : 'none',
    color: active ? '#fff' : '#888',
    letterSpacing: '0.06em',
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

  // ─────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh' }}>
      <Nav />
      <div style={{ padding: '40px', fontSize: 13, color: '#999' }}>
        {initError ? (
          <>
            <div style={{ color: '#C85A5A', marginBottom: 12 }}>{initError}</div>
            <button onClick={() => router.push('/lore/add')} style={{ border: '1px solid #ccc', padding: '6px 16px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>← GO BACK</button>
          </>
        ) : 'Setting up...'}
      </div>
    </div>
  )

  const disabled = !yarnId

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

        {/* ── CHARACTERS ─────────────────────────────── */}
        <div style={{ border: '1px solid #000', marginBottom: 16, overflow: 'hidden' }}>
          <SectionHeader>CHARACTERS MENTIONED</SectionHeader>
          <div style={{ padding: '16px' }}>
            {/* Existing character pills */}
            {allChars.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {allChars.map(c => (
                  <button key={c.id} onClick={() => handleToggleChar(c.id)} disabled={disabled}
                    style={pill(selectedChars.includes(c.id))}>
                    {c.character_name}
                  </button>
                ))}
              </div>
            )}
            {/* Search / add by name */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={newCharName} onChange={e => { setNewCharName(e.target.value); setCharError('') }}
                onKeyDown={e => e.key === 'Enter' && handleAddChar()}
                list="all-chars-list" placeholder="Type a character name to add..."
                style={inputStyle} disabled={disabled} />
              <datalist id="all-chars-list">
                {allChars.map(c => <option key={c.id} value={c.character_name} />)}
              </datalist>
              <button onClick={handleAddChar} disabled={disabled || charBusy} style={addBtn}>
                {charBusy ? '...' : 'ADD'}
              </button>
            </div>
            <InlineError msg={charError} />
          </div>
        </div>

        {/* ── PLACE ──────────────────────────────────── */}
        <div style={{ border: '1px solid #000', marginBottom: 16, overflow: 'hidden' }}>
          <SectionHeader>PLACE</SectionHeader>
          <div style={{ padding: '16px' }}>
            {placeSaved && (
              <div style={{ fontSize: 12, color: '#555', marginBottom: 8, letterSpacing: '0.04em' }}>
                Saved: <strong>{placeSaved}</strong>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={place}
                onChange={e => handlePlaceInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSetPlace()}
                list="place-suggestions" placeholder="Enter a place..."
                style={inputStyle} disabled={disabled} />
              <datalist id="place-suggestions">
                {placeSearching && <option value="" disabled>searching...</option>}
                {placeSuggestions.length > 0
                  ? placeSuggestions.map(p => <option key={p.display_name} value={p.display_name} />)
                  : allPlaces.map(p => <option key={p} value={p} />)
                }
              </datalist>
              {place.trim() && (
                <button onClick={handleSetPlace} disabled={disabled || placeBusy} style={addBtn}>
                  {placeBusy ? '...' : 'SET'}
                </button>
              )}
              {placeSaved && (
                <button onClick={async () => { setPlace(''); await fetch(`/api/lore/yarn/${yarnId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ place: '' }) }); setPlaceSaved('') }}
                  style={{ ...addBtn, border: '1px solid #ccc', color: '#999' }}>CLEAR</button>
              )}
            </div>
            <InlineError msg={placeError} />
          </div>
        </div>

        {/* ── TAGS ───────────────────────────────────── */}
        <div style={{ border: '1px solid #000', marginBottom: 16, overflow: 'hidden' }}>
          <SectionHeader>TAGS</SectionHeader>
          <div style={{ padding: '16px' }}>
            {/* New tag input */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input value={newTagName} onChange={e => { setNewTagName(e.target.value); setTagError('') }}
                onKeyDown={e => e.key === 'Enter' && handleAddTag(false)}
                placeholder="Type a new tag..." style={inputStyle} disabled={disabled} />
              <button onClick={() => handleAddTag(false)} disabled={disabled || tagBusy} style={addBtn}>
                {tagBusy ? '...' : 'ADD'}
              </button>
            </div>
            <InlineError msg={tagError} />

            {/* All existing tags as clickable pills */}
            {allTags.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 10, color: '#bbb', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>EXISTING TAGS</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {allTags.map(t => (
                    <button key={t.id} onClick={() => handleToggleTag(t)} disabled={disabled}
                      style={pill(selectedTags.includes(t.id))}>
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Taboo tags */}
          <div style={{ borderTop: '1px solid #ccc', padding: '16px' }}>
            <div style={{ fontSize: 10, color: '#C85A5A', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>TABOO TAGS</div>

            {/* Selected taboo tags */}
            {selectedTabooTags.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {selectedTabooTags.map(t => (
                  <span key={t.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', border: '1px solid #C85A5A', background: '#C85A5A', color: '#fff', fontSize: 11, letterSpacing: '0.06em' }}>
                    {t.name}
                    <button onClick={() => handleRemoveTabooTag(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 0, fontSize: 12, lineHeight: 1 }}>×</button>
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input value={newTabooTagName} onChange={e => { setNewTabooTagName(e.target.value); setTabooTagError('') }}
                onKeyDown={e => e.key === 'Enter' && handleAddTag(true)}
                placeholder="Add taboo tag..." style={{ ...inputStyle, borderBottomColor: '#C85A5A' }}
                disabled={disabled} />
              <button onClick={() => handleAddTag(true)} disabled={disabled || tabooTagBusy}
                style={{ ...addBtn, border: '1px solid #C85A5A', color: '#C85A5A' }}>
                {tabooTagBusy ? '...' : 'ADD'}
              </button>
            </div>
            <InlineError msg={tabooTagError} />
            <div style={{ fontSize: 11, color: '#999', lineHeight: 1.6 }}>
              Taboo tags replace the text body with _ for readers who haven't been mentioned in a yarn using this tag, or submitted one themselves.
            </div>
          </div>
        </div>

        {/* ── EVENT ──────────────────────────────────── */}
        <div style={{ border: '1px solid #000', marginBottom: 24, overflow: 'hidden' }}>
          <SectionHeader>EVENT</SectionHeader>
          <div style={{ padding: '16px' }}>

            {/* Mode buttons */}
            <div style={{ display: 'flex', marginBottom: 16 }}>
              <button onClick={() => handleEventModeChange('none')} style={modeBtn('none')}>NO EVENT</button>
              <button onClick={() => handleEventModeChange('existing')} style={modeBtn('existing')}>SELECT EXISTING</button>
              <button onClick={() => handleEventModeChange('new')} style={modeBtn('new')}>CREATE NEW</button>
              {eventBusy && <span style={{ marginLeft: 12, fontSize: 11, color: '#999', alignSelf: 'center' }}>...</span>}
            </div>

            {/* Current event indicator */}
            {eventId && eventTitle && (
              <div style={{ fontSize: 12, color: '#555', marginBottom: 12 }}>
                Linked to: <strong>{eventTitle}</strong>
              </div>
            )}

            {/* Select existing */}
            {eventMode === 'existing' && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <select value={eventDropdown} onChange={e => handleSelectEvent(e.target.value)}
                  disabled={disabled || eventBusy}
                  style={{ flex: 1, border: '1px solid #ccc', padding: '6px 8px', fontSize: 12, fontFamily: 'inherit' }}>
                  <option value="">Select event...</option>
                  {allEvents.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                </select>
                <div style={{ display: 'flex' }}>
                  <button onClick={() => handleTimingChange('lead_up')} style={timingBtn('lead_up')}>LEAD UP TO EVENT</button>
                  <button onClick={() => handleTimingChange('happened_at')} style={timingBtn('happened_at')}>HAPPENED AT EVENT</button>
                </div>
              </div>
            )}

            {/* Create new */}
            {eventMode === 'new' && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <input value={newEventName} onChange={e => { setNewEventName(e.target.value); setEventError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleCreateEvent()}
                  placeholder="Event name..."
                  style={{ ...inputStyle, flex: 1 }} disabled={disabled || eventBusy} />
                <div style={{ display: 'flex' }}>
                  <button onClick={() => handleTimingChange('lead_up')} style={timingBtn('lead_up')}>LEAD UP TO EVENT</button>
                  <button onClick={() => handleTimingChange('happened_at')} style={timingBtn('happened_at')}>HAPPENED AT EVENT</button>
                </div>
                <button onClick={handleCreateEvent} disabled={disabled || eventBusy || !newEventName.trim()} style={addBtn}>
                  {eventBusy ? '...' : 'CREATE'}
                </button>
              </div>
            )}

            <InlineError msg={eventError} />
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button onClick={handleBack}
            style={{ background: 'none', border: '1px solid #ccc', padding: '8px 20px', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit' }}>
            ← BACK
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={handlePublish} disabled={!yarnId}
            style={{ background: '#C85A5A', color: '#fff', border: '1px solid #C85A5A', padding: '8px 24px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: yarnId ? 'pointer' : 'default', fontFamily: 'inherit', opacity: yarnId ? 1 : 0.5 }}>
            PUBLISH
          </button>
        </div>

      </main>
      <LoreFooter />
    </div>
  )
}

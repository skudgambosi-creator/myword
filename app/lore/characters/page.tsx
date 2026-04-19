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

function SectionHeader({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ background: '#000', color: '#fff', padding: '8px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span>{children}</span>
      {action}
    </div>
  )
}

export default function LoreCharactersPage() {
  const router = useRouter()
  const mainSupa = createClient()

  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [myChar, setMyChar] = useState<any>(null)
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [follows, setFollows] = useState<any[]>([])
  const [allChars, setAllChars] = useState<any[]>([])
  const [allTags, setAllTags] = useState<any[]>([])
  const [allPlaces, setAllPlaces] = useState<string[]>([])

  const [newFollowChar, setNewFollowChar] = useState('')
  const [newFollowTag, setNewFollowTag] = useState('')
  const [newFollowPlace, setNewFollowPlace] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await mainSupa.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)

      // Fetch character via API (uses service role key, bypasses RLS)
      const charRes = await fetch('/api/lore/character')
      const charJson = charRes.ok ? await charRes.json() : { character: null }
      const charData = charJson.character

      const refRes = await fetch('/api/lore/ref')
      const ref = refRes.ok ? await refRes.json() : { chars: [], tags: [], follows: [], places: [] }

      setMyChar(charData)
      setNewName(charData?.character_name || '')
      setFollows(ref.follows)
      setAllChars(ref.chars)
      setAllTags((ref.tags as any[]).filter((t: any) => !t.is_taboo))
      setAllPlaces(ref.places)
      setLoading(false)
    }
    init()
  }, [])

  const saveName = async () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    setSavingName(true)
    setSaveError('')

    const res = await fetch('/api/lore/character', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterName: trimmed }),
    })

    const data = await res.json()
    setSavingName(false)

    if (!res.ok) {
      setSaveError(data.error || 'Failed to save. Try again.')
      return
    }

    setMyChar((prev: any) =>
      prev ? { ...prev, character_name: trimmed } : { user_id: userId, character_name: trimmed }
    )
    setEditingName(false)
    setSaveError('')
  }

  const addFollow = async (type: 'character' | 'tag' | 'place', value: string) => {
    if (!value.trim() || !userId) return
    const exists = follows.some(f => f.follow_type === type && f.follow_value === value.trim())
    if (exists) return
    const res = await fetch('/api/lore/follow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followType: type, followValue: value.trim() }),
    })
    if (res.ok) {
      setFollows(prev => [...prev, { user_id: userId, follow_type: type, follow_value: value.trim() }])
    }
    if (type === 'character') setNewFollowChar('')
    if (type === 'tag') setNewFollowTag('')
    if (type === 'place') setNewFollowPlace('')
  }

  const removeFollow = async (type: 'character' | 'tag' | 'place', value: string) => {
    if (!userId) return
    await fetch('/api/lore/follow', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followType: type, followValue: value }),
    })
    setFollows(prev => prev.filter(f => !(f.follow_type === type && f.follow_value === value)))
  }

  const followedChars = follows.filter(f => f.follow_type === 'character').map(f => f.follow_value)
  const followedTags = follows.filter(f => f.follow_type === 'tag').map(f => f.follow_value)
  const followedPlaces = follows.filter(f => f.follow_type === 'place').map(f => f.follow_value)

  const pillStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    border: '1px solid #000', padding: '3px 10px', fontSize: 11,
    letterSpacing: '0.06em', margin: '0 6px 6px 0',
  }

  const inputStyle: React.CSSProperties = {
    flex: 1, background: 'none', border: 'none', borderBottom: '1px solid #ccc',
    padding: '6px 0', fontSize: 12, fontFamily: 'inherit', outline: 'none',
  }

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

        <h1 style={{ fontSize: 22, fontWeight: 400, color: '#C85A5A', letterSpacing: '0.15em', textTransform: 'uppercase', textAlign: 'center', margin: '16px 0 24px' }}>
          CHARACTER PROFILE
        </h1>

        {/* Your character name */}
        <div style={{ border: '1px solid #000', marginBottom: 16, overflow: 'hidden' }}>
          <SectionHeader action={
            <button
              onClick={() => {
                if (editingName) {
                  setEditingName(false)
                  setSaveError('')
                  setNewName(myChar?.character_name || '')
                } else {
                  setNewName(myChar?.character_name || '')
                  setEditingName(true)
                }
              }}
              style={{ background: 'none', border: '1px solid #fff', color: '#fff', padding: '2px 10px', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.08em' }}
            >
              {editingName ? 'CANCEL' : 'EDIT'}
            </button>
          }>
            YOUR CHARACTER NAME
          </SectionHeader>
          <div style={{ padding: '20px 16px' }}>
            {!editingName ? (
              <div style={{ fontSize: 20, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                {myChar?.character_name || <span style={{ color: '#999', fontSize: 13, fontWeight: 400 }}>No character set yet. Press EDIT to add one.</span>}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveName()
                    if (e.key === 'Escape') { setEditingName(false); setSaveError(''); setNewName(myChar?.character_name || '') }
                  }}
                  placeholder="Enter your character name..."
                  style={{ ...inputStyle, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}
                  autoFocus
                />
                {savingName && <div style={{ fontSize: 11, color: '#999', letterSpacing: '0.06em' }}>Saving...</div>}
                {saveError && <div style={{ fontSize: 11, color: '#C85A5A', letterSpacing: '0.04em' }}>{saveError}</div>}
                {!savingName && !saveError && <div style={{ fontSize: 11, color: '#aaa', letterSpacing: '0.04em' }}>Press Enter to save</div>}
              </div>
            )}
          </div>
        </div>

        {/* Characters you follow */}
        <div style={{ border: '1px solid #000', marginBottom: 16, overflow: 'hidden' }}>
          <SectionHeader>CHARACTERS YOU FOLLOW</SectionHeader>
          <div style={{ padding: '16px' }}>
            <div style={{ marginBottom: 12 }}>
              {followedChars.length === 0 ? (
                <span style={{ fontSize: 12, color: '#999' }}>None yet.</span>
              ) : followedChars.map(name => (
                <span key={name} style={pillStyle}>
                  {name}
                  <button onClick={() => removeFollow('character', name)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#999', padding: 0, fontFamily: 'inherit', lineHeight: 1 }}>×</button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={newFollowChar} onChange={e => setNewFollowChar(e.target.value)} onKeyDown={e => e.key === 'Enter' && addFollow('character', newFollowChar)}
                list="all-chars-list" placeholder="Character name..." style={inputStyle} />
              <datalist id="all-chars-list">{allChars.map(c => <option key={c.id} value={c.character_name} />)}</datalist>
              <button onClick={() => addFollow('character', newFollowChar)} style={{ border: '1px solid #000', padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', background: 'none', letterSpacing: '0.06em' }}>ADD</button>
            </div>
          </div>
        </div>

        {/* Tags you follow */}
        <div style={{ border: '1px solid #000', marginBottom: 16, overflow: 'hidden' }}>
          <SectionHeader>TAGS YOU FOLLOW</SectionHeader>
          <div style={{ padding: '16px' }}>
            <div style={{ marginBottom: 12 }}>
              {followedTags.length === 0 ? (
                <span style={{ fontSize: 12, color: '#999' }}>None yet.</span>
              ) : followedTags.map(name => (
                <span key={name} style={pillStyle}>
                  {name}
                  <button onClick={() => removeFollow('tag', name)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#999', padding: 0, fontFamily: 'inherit', lineHeight: 1 }}>×</button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={newFollowTag} onChange={e => setNewFollowTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && addFollow('tag', newFollowTag)}
                list="all-tags-list" placeholder="Tag name..." style={inputStyle} />
              <datalist id="all-tags-list">{allTags.map(t => <option key={t.id} value={t.name} />)}</datalist>
              <button onClick={() => addFollow('tag', newFollowTag)} style={{ border: '1px solid #000', padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', background: 'none', letterSpacing: '0.06em' }}>ADD</button>
            </div>
          </div>
        </div>

        {/* Places you follow */}
        <div style={{ border: '1px solid #000', marginBottom: 24, overflow: 'hidden' }}>
          <SectionHeader>PLACES YOU FOLLOW</SectionHeader>
          <div style={{ padding: '16px' }}>
            <div style={{ marginBottom: 12 }}>
              {followedPlaces.length === 0 ? (
                <span style={{ fontSize: 12, color: '#999' }}>None yet.</span>
              ) : followedPlaces.map(name => (
                <span key={name} style={pillStyle}>
                  {name}
                  <button onClick={() => removeFollow('place', name)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#999', padding: 0, fontFamily: 'inherit', lineHeight: 1 }}>×</button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={newFollowPlace} onChange={e => setNewFollowPlace(e.target.value)} onKeyDown={e => e.key === 'Enter' && addFollow('place', newFollowPlace)}
                list="all-places-list" placeholder="Place name..." style={inputStyle} />
              <datalist id="all-places-list">{allPlaces.map(p => <option key={p} value={p} />)}</datalist>
              <button onClick={() => addFollow('place', newFollowPlace)} style={{ border: '1px solid #000', padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', background: 'none', letterSpacing: '0.06em' }}>ADD</button>
            </div>
          </div>
        </div>

      </main>
      <LoreFooter />
    </div>
  )
}

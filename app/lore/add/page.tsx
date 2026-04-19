'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Nav from '@/components/layout/Nav'
import LoreEditor from '@/components/editor/LoreEditor'

function LoreFooter() {
  return (
    <footer style={{ textAlign: 'center', padding: '48px 0 28px' }}>
      <span style={{ fontSize: 11, color: '#ccc', letterSpacing: '0.18em' }}>POGOSI-GAMBOSI</span>
    </footer>
  )
}

function countWords(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length
}

export default function LoreAddPage() {
  const router = useRouter()
  const mainSupa = createClient()

  const [userId, setUserId] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editYarnId, setEditYarnId] = useState<string | null>(null)
  const [contentLoaded, setContentLoaded] = useState(false)
  const [day, setDay] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [title, setTitle] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const wordCount = countWords(bodyHtml)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await mainSupa.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)

      const params = new URLSearchParams(window.location.search)
      const isEdit = params.get('edit') === 'true'
      const yarnId = params.get('yarnId')

      if (isEdit && yarnId) {
        setEditMode(true)
        setEditYarnId(yarnId)
        const res = await fetch(`/api/lore/yarn/${yarnId}/detail`)
        if (res.ok) {
          const data = await res.json()
          const y = data.yarn
          setDay(y.day?.toString() || '')
          setMonth(y.month?.toString() || '')
          setYear(y.year?.toString() || '')
          setTitle(y.title || '')
          setBodyHtml(y.body_html || '')
        }
        setContentLoaded(true)
      } else {
        const draft = sessionStorage.getItem('lore_yarn_draft')
        if (draft) {
          const d = JSON.parse(draft)
          setDay(d.day || '')
          setMonth(d.month || '')
          setYear(d.year || '')
          setTitle(d.title || '')
          setBodyHtml(d.bodyHtml || '')
        }
        setContentLoaded(true)
      }
    }
    init()
  }, [])

  const handleContinue = async () => {
    setError('')
    if (!year.trim()) { setError('Year is required.'); return }
    if (!title.trim()) { setError('Title is required.'); return }
    if (wordCount < 5) { setError('Minimum 5 words required.'); return }

    if (editMode && editYarnId) {
      setSaving(true)
      const res = await fetch(`/api/lore/yarn/${editYarnId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), bodyHtml, day: day || null, month: month || null, year, wordCount }),
      })
      setSaving(false)
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Failed to save. Try again.')
        return
      }
      sessionStorage.setItem('lore_yarn_draft', JSON.stringify({ day, month, year, title, bodyHtml, editMode: true, yarnId: editYarnId }))
    } else {
      sessionStorage.setItem('lore_yarn_draft', JSON.stringify({ day, month, year, title, bodyHtml, parentYarnId: null }))
    }
    router.push('/lore/add/tag')
  }

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
          <span style={stepStyle(true)}>1 — WRITE</span>
          <div style={{ flex: 1, height: 1, background: '#ccc' }} />
          <span style={stepStyle(false)}>2 — TAG & FILE</span>
        </div>

        {/* Date */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>DAY</div>
            <input type="number" min={1} max={31} value={day} onChange={e => setDay(e.target.value)} placeholder="—"
              style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid #000', padding: '8px 0', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>MONTH</div>
            <input type="number" min={1} max={12} value={month} onChange={e => setMonth(e.target.value)} placeholder="—"
              style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid #000', padding: '8px 0', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>YEAR <span style={{ color: '#C85A5A' }}>*</span></div>
            <input type="number" value={year} onChange={e => setYear(e.target.value)} placeholder="required"
              style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid #000', padding: '8px 0', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 16 }}>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="TITLE"
            style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid #000', padding: '10px 0', fontSize: 15, fontFamily: 'inherit', outline: 'none', letterSpacing: '0.1em', textTransform: 'uppercase', boxSizing: 'border-box' }} />
        </div>

        {/* Editor — only mount after content is ready so TipTap receives correct initial value */}
        <div style={{ border: '1px solid #ccc', marginBottom: 8, minHeight: 120 }}>
          {userId && contentLoaded
            ? <LoreEditor content={bodyHtml} onChange={setBodyHtml} userId={userId} />
            : <div style={{ padding: 16, fontSize: 12, color: '#999' }}>Loading...</div>
          }
        </div>

        {/* Word count */}
        <div style={{ textAlign: 'right', fontSize: 11, color: '#999', marginBottom: 24 }}>
          {wordCount} / 2000
        </div>

        {error && <div style={{ fontSize: 12, color: '#C85A5A', marginBottom: 12 }}>{error}</div>}

        {/* Bottom bar */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            onClick={() => editMode && editYarnId ? router.push(`/lore/yarn/${editYarnId}`) : router.push('/lore/dashboard')}
            style={{ background: 'none', border: '1px solid #ccc', padding: '8px 20px', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            CANCEL
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={handleContinue} disabled={saving} style={{ background: '#000', color: '#fff', border: '1px solid #000', padding: '8px 20px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'SAVING...' : 'CONTINUE →'}
          </button>
        </div>

      </main>
      <LoreFooter />
    </div>
  )
}

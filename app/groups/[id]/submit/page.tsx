'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Editor from '@/components/editor/Editor'

function countWords(html: string): number {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  if (!text) return 0
  return text.split(' ').filter(w => w.length > 0).length
}

export default function SubmitPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const isCatchup = searchParams.get('catchup') === '1'
  const catchupWeekId = searchParams.get('week')
  const isEdit = searchParams.get('edit') === '1'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [letter, setLetter] = useState('')
  const [weekId, setWeekId] = useState('')
  const [wordTitle, setWordTitle] = useState('')
  const [content, setContent] = useState('')
  const [existingSubmissionId, setExistingSubmissionId] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const now = new Date().toISOString()

      if (isCatchup && catchupWeekId) {
        const { data: week } = await supabase.from('weeks').select('*').eq('id', catchupWeekId).single()
        if (week) {
          setLetter(week.letter)
          setWeekId(week.id)
        }
      } else {
        const { data: week } = await supabase
          .from('weeks').select('*').eq('group_id', params.id)
          .lte('opens_at', now).order('week_num', { ascending: false }).limit(1).single()

        if (week) {
          setLetter(week.letter)
          setWeekId(week.id)

          if (isEdit) {
            const { data: sub } = await supabase
              .from('submissions').select('*')
              .eq('user_id', user.id).eq('week_id', week.id).eq('is_late_catchup', false).single()
            if (sub) {
              setWordTitle(sub.word_title)
              setContent(sub.body_html)
              setExistingSubmissionId(sub.id)
            }
          }
        }
      }
      setLoading(false)
    }
    init()
  }, [])

  const wordCount = countWords(content)

  const handleSubmit = async () => {
    setError('')

    if (!wordTitle.trim()) return setError('Please enter a word title.')
    if (wordTitle.trim()[0].toUpperCase() !== letter.toUpperCase()) {
      return setError(`Your word title must begin with the letter ${letter}.`)
    }
    if (wordCount < 5) return setError('Minimum 5 words required.')
    if (wordCount > 1000) return setError('Maximum 1,000 words.')

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      if (existingSubmissionId) {
        const { error } = await supabase.from('submissions').update({
          word_title: wordTitle.trim(),
          body_html: content,
          word_count: wordCount,
          updated_at: new Date().toISOString(),
        }).eq('id', existingSubmissionId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('submissions').insert({
          group_id: params.id,
          user_id: user.id,
          week_id: weekId,
          word_title: wordTitle.trim(),
          body_html: content,
          word_count: wordCount,
          is_late_catchup: isCatchup,
        })
        if (error) throw error
      }

      router.push(`/groups/${params.id}`)
      router.refresh()
    } catch (e: any) {
      setError(e.message || 'Failed to save submission.')
      setSaving(false)
    }
  }

  if (loading) return <div className="page-container" style={{ paddingTop: 40 }}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav className="nav">
        <a href={`/groups/${params.id}`} className="nav-brand">[ MY WORD ]</a>
        <span className="nav-link" style={{ color: '#666' }}>
          {isCatchup ? `Late submission — Letter ${letter} (0 pts)` : `Submit — Letter ${letter}`}
        </span>
      </nav>

      <div className="page-container" style={{ paddingTop: 40, paddingBottom: 60, maxWidth: 760 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
          <h1 className="page-title" style={{ marginBottom: 0 }}>
            {isEdit ? 'Edit Submission' : isCatchup ? `Late: Letter ${letter}` : `Letter ${letter}`}
          </h1>
          <span style={{ fontSize: 32, fontWeight: 'bold', color: '#CC0000' }}>{letter}</span>
        </div>

        {isCatchup && (
          <div className="box-shaded" style={{ marginBottom: 20, fontSize: 13 }}>
            This is a late catch-up submission. It will appear in the archive but scores 0 points.
          </div>
        )}

        {error && (
          <div style={{ border: '2px solid #CC0000', padding: '8px 12px', marginBottom: 16, fontSize: 13, color: '#CC0000' }}>
            {error}
          </div>
        )}

        {/* Word title */}
        <div style={{ marginBottom: 20 }}>
          <label className="field-label">
            Word Title <span style={{ color: '#CC0000' }}>*</span>
            <span style={{ color: '#999', marginLeft: 8, fontWeight: 'normal', textTransform: 'none', letterSpacing: 0 }}>
              must begin with {letter}
            </span>
          </label>
          <input
            className="field-input"
            type="text"
            value={wordTitle}
            onChange={e => setWordTitle(e.target.value)}
            placeholder={`Enter a word or phrase starting with ${letter}...`}
            style={{ fontSize: 18, fontWeight: 'bold' }}
          />
        </div>

        {/* Editor */}
        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Your Piece</label>
          <Editor content={content} onChange={setContent} groupId={params.id} />
        </div>

        {/* Word count */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <span style={{ fontSize: 12, color: wordCount < 5 ? '#CC0000' : wordCount > 1000 ? '#CC0000' : '#666' }}>
            {wordCount} / 1,000 words
            {wordCount < 5 && wordCount > 0 && ' — minimum 5 words'}
            {wordCount > 1000 && ' — over limit'}
          </span>
          {wordCount >= 5 && wordCount <= 1000 && (
            <span style={{ fontSize: 12, color: '#006600' }}>✓ Word count OK</span>
          )}
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', gap: 12 }}>
          <a href={`/groups/${params.id}`} className="btn btn-ghost">Cancel</a>
          <button className="btn btn-accent" style={{ flex: 1 }}
            onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Submit'}
          </button>
        </div>

        <p style={{ fontSize: 12, color: '#999', marginTop: 12, textAlign: 'center' }}>
          Your word title is private until the Wednesday reveal.
          {!isCatchup && ' You can edit this until Tuesday 23:59.'}
        </p>
      </div>
    </div>
  )
}

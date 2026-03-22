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

function extractMedia(html: string) {
  const images: string[] = []
  const audios: string[] = []
  const imgRegex = /<img[^>]+src="([^"]+)"/g
  const audioRegex = /<audio[^>]+src="([^"]+)"/g
  let m
  while ((m = imgRegex.exec(html)) !== null) images.push(m[1])
  while ((m = audioRegex.exec(html)) !== null) audios.push(m[1])
  return { images, audios }
}

function fileNameFromUrl(url: string) {
  const raw = url.split('/').pop() || url
  // strip the timestamp prefix (e.g. "1710000000000-myfile.mp3" → "myfile.mp3")
  const dashIdx = raw.indexOf('-')
  return dashIdx !== -1 ? raw.slice(dashIdx + 1) : raw
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
  const [showSignScreen, setShowSignScreen] = useState(false)

  const [letter, setLetter] = useState('')
  const [weekId, setWeekId] = useState('')
  const [wordTitle, setWordTitle] = useState('')
  const [content, setContent] = useState('')
  const [existingSubmissionId, setExistingSubmissionId] = useState('')
  const [existingSignedName, setExistingSignedName] = useState('')
  const [memberNumber, setMemberNumber] = useState<number | null>(null)
  const [signedName, setSignedName] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: prof } = await supabase.from('users').select('member_number').eq('id', user.id).single()
      setMemberNumber(prof?.member_number || null)

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
              setExistingSignedName(sub.signed_name || '')
              setSignedName(sub.signed_name || '')
            }
          }
        }
      }
      setLoading(false)
    }
    init()
  }, [])

  const wordCount = countWords(content)

  const handleContinue = () => {
    setError('')
    if (!wordTitle.trim()) return setError('Please enter a word title.')
    if (wordTitle.trim()[0].toUpperCase() !== letter.toUpperCase()) {
      return setError(`Your word title must begin with the letter ${letter}.`)
    }
    if (wordCount < 5) return setError('Minimum 5 words required.')
    if (wordCount > 2000) return setError('Maximum 2,000 words.')
    setShowSignScreen(true)
  }

  const handleSave = async (name: string | null) => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const isSigned = !!name
    const resolvedName = name || null

    try {
      if (existingSubmissionId) {
        const { error } = await supabase.from('submissions').update({
          word_title: wordTitle.trim(),
          body_html: content,
          word_count: wordCount,
          is_signed: isSigned,
          signed_name: resolvedName,
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
          is_signed: isSigned,
          signed_name: resolvedName,
        })
        if (error) throw error
      }
      router.push(`/groups/${params.id}`)
      router.refresh()
    } catch (e: any) {
      setError(e.message || 'Failed to save submission.')
      setSaving(false)
      setShowSignScreen(false)
    }
  }

  if (loading) return <div className="page-container" style={{ paddingTop: 40 }}>Loading...</div>

  const { images: galleryImages, audios: galleryAudios } = extractMedia(content)

  // ── SIGN SCREEN ──────────────────────────────────────────────
  if (showSignScreen) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <nav className="nav">
          <a href={`/groups/${params.id}`} className="nav-brand">[ MY WORD ]</a>
          <span className="nav-link" style={{ color: '#666' }}>Submit — Letter {letter}</span>
        </nav>

        <div className="page-container" style={{ paddingTop: 60, paddingBottom: 60, maxWidth: 520 }}>

          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 80, fontWeight: 'bold', color: '#CC0000', lineHeight: 1, marginBottom: 16 }}>
              {letter}
            </div>
            <div style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 6 }}>{wordTitle}</div>
            <div style={{ fontSize: 13, color: '#999' }}>{wordCount} / 2,000 words</div>
            {(galleryImages.length > 0 || galleryAudios.length > 0) && (
              <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
                {galleryImages.map((src, i) => (
                  <img key={i} src={src} alt={`Image ${i + 1}`}
                    style={{ width: 56, height: 56, objectFit: 'cover', border: '1px solid #ccc' }} />
                ))}
                {galleryAudios.map((src, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, border: '1px solid #ccc', padding: '4px 8px' }}>
                    <span style={{ fontWeight: 'bold', color: '#CC0000' }}>AUD</span>
                    <span style={{ color: '#555' }}>{fileNameFromUrl(src)}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div style={{ borderTop: '2px solid #000', borderBottom: '2px solid #000', padding: '24px 0', marginBottom: 32, textAlign: 'center' }}>
            <p style={{ fontSize: 15, marginBottom: 6 }}>Sign your piece or submit anonymously?</p>
            <p style={{ fontSize: 12, color: '#999' }}>This cannot be undone after the window closes.</p>
          </div>

          {error && (
            <div style={{ border: '2px solid #CC0000', padding: '8px 12px', marginBottom: 16, fontSize: 13, color: '#CC0000' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label className="field-label">Sign with your name</label>
              <input
                className="field-input"
                type="text"
                value={signedName}
                onChange={e => setSignedName(e.target.value)}
                placeholder="Enter your name..."
                disabled={saving}
              />
            </div>
            <button
              className="btn btn-accent"
              style={{ padding: '16px', fontSize: 15, width: '100%' }}
              disabled={saving || !signedName.trim()}
              onClick={() => { if (!signedName.trim()) return; handleSave(signedName.trim()) }}>
              {saving ? 'Submitting...' : `Sign as "${signedName.trim() || '…'}"`}
            </button>
            <div style={{ textAlign: 'center', fontSize: 12, color: '#999' }}>— or —</div>
            <button
              className="btn"
              style={{ padding: '16px', fontSize: 15, width: '100%' }}
              disabled={saving}
              onClick={() => handleSave(null)}>
              {saving ? 'Submitting...' : `Submit anonymously — Member #${memberNumber}`}
            </button>
            <button
              className="btn btn-ghost"
              style={{ width: '100%' }}
              disabled={saving}
              onClick={() => setShowSignScreen(false)}>
              ← Go back and edit
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── EDITOR SCREEN ────────────────────────────────────────────
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

        <div style={{ marginBottom: 16 }}>
          <label className="field-label">Your Piece</label>
          <Editor content={content} onChange={setContent} groupId={params.id} />
        </div>

        {(galleryImages.length > 0 || galleryAudios.length > 0) && (
          <div style={{ border: '1px solid #ccc', padding: '12px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 'bold', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#999', marginBottom: 10 }}>
              Attachments ({galleryImages.length + galleryAudios.length})
            </div>
            {galleryImages.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: galleryAudios.length > 0 ? 10 : 0 }}>
                {galleryImages.map((src, i) => (
                  <img key={i} src={src} alt={`Image ${i + 1}`}
                    style={{ width: 72, height: 72, objectFit: 'cover', border: '1px solid #ccc', display: 'block' }} />
                ))}
              </div>
            )}
            {galleryAudios.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {galleryAudios.map((src, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span style={{ fontWeight: 'bold', color: '#CC0000' }}>AUD</span>
                    <span style={{ color: '#555' }}>{fileNameFromUrl(src)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <span style={{ fontSize: 12, color: wordCount < 5 ? '#CC0000' : wordCount > 2000 ? '#CC0000' : '#666' }}>
            {wordCount} / 2,000 words
            {wordCount < 5 && wordCount > 0 && ' — minimum 5 words'}
            {wordCount > 2000 && ' — over limit'}
          </span>
          {wordCount >= 5 && wordCount <= 2000 && (
            <span style={{ fontSize: 12, color: '#006600' }}>✓ Word count OK</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <a href={`/groups/${params.id}`} className="btn btn-ghost">Cancel</a>
          <button className="btn btn-accent" style={{ flex: 1 }}
            onClick={handleContinue} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Continue →'}
          </button>
        </div>

        <p style={{ fontSize: 12, color: '#999', marginTop: 12, textAlign: 'center' }}>
          Your word title is private until the Wednesday reveal.
          {!isCatchup && ' You can edit this until the window closes.'}
        </p>
      </div>
    </div>
  )
}

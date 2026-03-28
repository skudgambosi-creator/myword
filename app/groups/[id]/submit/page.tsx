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
  const dashIdx = raw.indexOf('-')
  return dashIdx !== -1 ? raw.slice(dashIdx + 1) : raw
}

function PreAuthHeader({ title }: { title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '28px 40px 0', gap: 16 }}>
      <div style={{ flex: 1, height: 1, background: '#000' }} />
      <span style={{ fontSize: 15, letterSpacing: '0.22em', fontWeight: 400, whiteSpace: 'nowrap' }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: '#000' }} />
    </div>
  )
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
        if (week) { setLetter(week.letter); setWeekId(week.id) }
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
    if (!wordTitle.trim()) return setError('Please enter a title.')
    if (wordTitle.trim()[0].toUpperCase() !== letter.toUpperCase()) return setError(`Your title must begin with the letter ${letter}.`)
    if (wordCount < 5) return setError('Minimum 5 words required.')
    if (wordCount > 2000) return setError('Maximum 2,000 words.')
    setShowSignScreen(true)
  }

  const handleSave = async (name: string | null) => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    try {
      if (existingSubmissionId) {
        const { error } = await supabase.from('submissions').update({
          word_title: wordTitle.trim(), body_html: content, word_count: wordCount,
          is_signed: !!name, signed_name: name || null, updated_at: new Date().toISOString(),
        }).eq('id', existingSubmissionId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('submissions').insert({
          group_id: params.id, user_id: user.id, week_id: weekId,
          word_title: wordTitle.trim(), body_html: content, word_count: wordCount,
          is_late_catchup: isCatchup, is_signed: !!name, signed_name: name || null,
        })
        if (error) throw error
      }
      router.push(`/groups/${params.id}`)
      router.refresh()
    } catch (e: any) {
      setError(e.message || 'Failed to save.')
      setSaving(false)
      setShowSignScreen(false)
    }
  }

  if (loading) return <div style={{ padding: 40, fontSize: 13, color: '#999' }}>Loading...</div>

  const { images: galleryImages, audios: galleryAudios } = extractMedia(content)

  // ── SIGN SCREEN ────────────────────────────────────────────
  if (showSignScreen) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <PreAuthHeader title="MY WORD" />

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 40px 0', maxWidth: 800, width: '100%', margin: '0 auto' }}>

          {/* Big letter */}
          <div style={{ fontSize: 120, fontWeight: 900, color: '#C85A5A', lineHeight: 1, marginBottom: 8, textAlign: 'center' }}>
            {letter}
          </div>

          {/* Title */}
          <div style={{ fontSize: 16, fontWeight: 700, color: '#C85A5A', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 24, textAlign: 'center' }}>
            {wordTitle}
          </div>

          {/* Question */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 13, letterSpacing: '0.05em', marginBottom: 4 }}>
              WOULD YOU LIKE TO SIGN OR REMAIN ANONYMOUS?
            </div>
            <div style={{ fontSize: 11, color: '#999', letterSpacing: '0.05em' }}>
              (YOU CAN CHANGE YOUR MIND UNTIL THE CUTOFF)
            </div>
          </div>

          {error && (
            <div style={{ color: '#C85A5A', fontSize: 12, marginBottom: 16, letterSpacing: '0.05em' }}>{error}</div>
          )}

          {/* Sign field */}
          <div style={{ width: '100%', marginBottom: 32 }}>
            <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: 12 }}>SIGN:</span>
            <input
              type="text"
              value={signedName}
              onChange={e => setSignedName(e.target.value)}
              disabled={saving}
              style={{ border: 'none', borderBottom: '1px solid #000', outline: 'none', fontSize: 13, width: 'calc(100% - 60px)', fontFamily: 'inherit', background: 'transparent' }}
            />
          </div>

          {/* Three buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, width: '100%' }}>
            <div style={{ flex: 1, height: 1, background: '#000' }} />
            <button
              onClick={() => setShowSignScreen(false)}
              disabled={saving}
              style={{ margin: '0 12px', background: '#000', color: '#fff', border: 'none', padding: '10px 20px', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              GO BACK
            </button>
            <div style={{ flex: 1, height: 1, background: '#000' }} />
            <button
              onClick={() => handleSave(null)}
              disabled={saving}
              style={{ margin: '0 12px', background: '#000', color: '#fff', border: 'none', padding: '10px 20px', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {saving ? '...' : 'ANON'}
            </button>
            <div style={{ flex: 1, height: 1, background: '#000' }} />
            <button
              onClick={() => { if (!signedName.trim()) return; handleSave(signedName.trim()) }}
              disabled={saving || !signedName.trim()}
              style={{ margin: '0 12px', background: signedName.trim() ? '#000' : '#ccc', color: '#fff', border: 'none', padding: '10px 20px', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: signedName.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}
            >
              {saving ? '...' : 'SIGN'}
            </button>
            <div style={{ flex: 1, height: 1, background: '#000' }} />
          </div>
        </main>
      </div>
    )
  }

  // ── EDITOR SCREEN ──────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PreAuthHeader title="MY WORD" />

      <main style={{ flex: 1, padding: '32px 40px 0', maxWidth: 900, width: '100%', margin: '0 auto' }}>

        {/* Big letter */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <span style={{ fontSize: 100, fontWeight: 900, color: '#C85A5A', lineHeight: 1 }}>{letter}</span>
        </div>

        {isCatchup && (
          <div style={{ border: '1px solid #ccc', padding: '12px 16px', marginBottom: 20, fontSize: 12, color: '#666' }}>
            Late catch-up submission — appears in archive but scores 0 points.
          </div>
        )}

        {error && (
          <div style={{ color: '#C85A5A', fontSize: 12, marginBottom: 16, letterSpacing: '0.05em' }}>{error}</div>
        )}

        {/* Title field */}
        <div style={{ marginBottom: 24 }}>
          <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: 12 }}>TITLE:</span>
          <input
            type="text"
            value={wordTitle}
            onChange={e => setWordTitle(e.target.value)}
            style={{ border: 'none', borderBottom: '1px solid #000', outline: 'none', fontSize: 14, width: 'calc(100% - 60px)', fontFamily: 'inherit', background: 'transparent', fontWeight: 700 }}
          />
        </div>

        {/* Editor */}
        <div style={{ marginBottom: 16 }}>
          <Editor content={content} onChange={setContent} groupId={params.id} />
        </div>

        {/* Attachments */}
        {(galleryImages.length > 0 || galleryAudios.length > 0) ? (
          <div style={{ border: '1px solid #ccc', padding: '16px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#999', marginBottom: 10 }}>
              Attachments ({galleryImages.length + galleryAudios.length})
            </div>
            {galleryImages.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: galleryAudios.length > 0 ? 10 : 0 }}>
                {galleryImages.map((src, i) => (
                  <img key={i} src={src} alt={`Image ${i + 1}`} style={{ width: 72, height: 72, objectFit: 'cover', border: '1px solid #ccc', display: 'block' }} />
                ))}
              </div>
            )}
            {galleryAudios.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {galleryAudios.map((src, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span style={{ fontWeight: 700, color: '#C85A5A' }}>AUD</span>
                    <span style={{ color: '#555' }}>{fileNameFromUrl(src)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ border: '1px solid #ccc', padding: '16px', marginBottom: 16, textAlign: 'center' }}>
            <span style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#ccc' }}>ATTACHMENTS SHOW IN HERE</span>
          </div>
        )}

        {/* Footer bar: CANCEL | word count | CONTINUE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 40 }}>
          <div style={{ flex: 1, height: 1, background: '#000' }} />
          <a
            href={`/groups/${params.id}`}
            style={{ margin: '0 12px', background: '#000', color: '#fff', padding: '10px 20px', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none' }}
          >
            CANCEL
          </a>
          <div style={{ flex: 1, height: 1, background: '#000' }} />

          <span style={{ margin: '0 16px', fontSize: 12, color: wordCount > 2000 ? '#C85A5A' : '#666', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
            {wordCount}/2000
          </span>

          <div style={{ flex: 1, height: 1, background: '#000' }} />
          <button
            onClick={handleContinue}
            disabled={saving}
            style={{ margin: '0 12px', background: '#000', color: '#fff', border: 'none', padding: '10px 20px', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {saving ? '...' : 'CONTINUE'}
          </button>
          <div style={{ flex: 1, height: 1, background: '#000' }} />
        </div>
      </main>
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function textPreview(html: string, maxChars: number) {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/?(p|div|h[1-6]|li|blockquote)[^>]*>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxChars)
}

function AttachmentTags({ html }: { html: string }) {
  const hasImage = /<img[\s>]/i.test(html)
  const hasAudio = /<audio[\s>]/i.test(html)
  if (!hasImage && !hasAudio) return null
  return (
    <span style={{ display: 'inline-flex', gap: 4 }}>
      {hasImage && <span className="tag" style={{ color: '#2563eb', borderColor: '#93c5fd', background: '#eff6ff', fontSize: 9 }}>IMG</span>}
      {hasAudio && <span className="tag" style={{ color: '#db2777', borderColor: '#f9a8d4', background: '#fdf2f8', fontSize: 9 }}>AUD</span>}
    </span>
  )
}

export default function SubmissionsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [weeks, setWeeks] = useState<any[]>([])
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loadingSubs, setLoadingSubs] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: membership } = await supabase
        .from('group_members').select('*')
        .eq('group_id', params.id).eq('user_id', session.user.id).single()
      if (!membership) { router.push('/dashboard'); return }

      const { data: prof } = await supabase.from('users').select('*').eq('id', session.user.id).single()
      setProfile(prof)

      const { data: allWeeks } = await supabase
        .from('weeks').select('*').eq('group_id', params.id).order('week_num', { ascending: true })
      const w = allWeeks || []
      setWeeks(w)

      // Auto-select the most recently revealed week
      const revealed = w.filter((wk: any) => wk.revealed_at && new Date(wk.revealed_at) < new Date())
      if (revealed.length > 0) {
        const latest = revealed[revealed.length - 1]
        await loadSubmissions(latest, setSelectedLetter, setSubmissions, setLoadingSubs, supabase)
      }

      setLoading(false)
    }
    init()
  }, [])

  const handleLetterClick = async (week: any) => {
    if (!week.revealed_at || new Date(week.revealed_at) > new Date()) return
    setPickerOpen(false)
    await loadSubmissions(week, setSelectedLetter, setSubmissions, setLoadingSubs, supabase)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh' }}>
      <nav className="nav"><Link href="/dashboard" className="nav-brand">[ MY WORD ]</Link></nav>
      <div className="page-container" style={{ paddingTop: 40 }}>Loading...</div>
    </div>
  )

  const memberNumber = profile?.member_number
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav className="nav">
        <Link href="/dashboard" className="nav-brand">[ MY WORD ]</Link>
        <Link href={`/groups/${params.id}`} className="nav-link">← Project</Link>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          <span style={{ padding: '10px 16px', fontSize: 12, color: '#666', borderLeft: '1px solid #aaa' }}>
            #{memberNumber}
          </span>
          <button onClick={async () => {
            await supabase.auth.signOut()
            window.location.href = '/'
          }} className="nav-link" style={{ border: 'none', cursor: 'pointer', background: 'none' }}>
            Sign Out
          </button>
        </div>
      </nav>

      <div className="page-container" style={{ paddingTop: 40, paddingBottom: 60 }}>
        <h1 className="page-title">Submissions</h1>

        {/* Letter picker dropdown */}
        {pickerOpen && (
          <div style={{ position: 'relative', marginBottom: 24 }}>
            <div style={{
              background: '#fff', border: '2px solid #000', padding: 16,
              display: 'flex', flexWrap: 'wrap', gap: 6,
            }}>
              {letters.map(letter => {
                const week = weeks.find(w => w.letter === letter)
                const isRevealed = week?.revealed_at && new Date(week.revealed_at) < new Date()
                const isSelected = selectedLetter === letter
                const isLocked = !week || !isRevealed
                return (
                  <div
                    key={letter}
                    onClick={() => week && handleLetterClick(week)}
                    style={{
                      width: 40, height: 40,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 'bold', fontSize: 15,
                      cursor: isLocked ? 'default' : 'pointer',
                      background: isSelected ? '#000' : 'transparent',
                      color: isSelected ? '#fff' : isLocked ? '#ddd' : '#CC0000',
                      border: isSelected ? '2px solid #000' : '1px solid #eee',
                    }}
                    onMouseEnter={e => { if (!isLocked && !isSelected) e.currentTarget.style.background = '#f5f5f5' }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                  >
                    {letter}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Header: big letter + count + picker toggle */}
        {selectedLetter && !loadingSubs && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 24, borderBottom: '3px solid #000', paddingBottom: 12 }}>
            <span
              onClick={() => setPickerOpen(p => !p)}
              style={{ fontSize: 64, fontWeight: 'bold', color: '#CC0000', lineHeight: 1, cursor: 'pointer', userSelect: 'none' }}
              title="Change letter"
            >
              {selectedLetter}
            </span>
            <span style={{ fontSize: 13, color: '#666' }}>
              {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
            </span>
            <span style={{ fontSize: 12, color: '#999', marginLeft: 4, cursor: 'pointer' }} onClick={() => setPickerOpen(p => !p)}>
              {pickerOpen ? '▲ close' : '▼ change'}
            </span>
          </div>
        )}

        {!selectedLetter && (
          <div className="box-shaded" style={{ textAlign: 'center', padding: 48 }}>
            <p style={{ fontSize: 14, color: '#666' }}>No revealed weeks yet.</p>
          </div>
        )}

        {selectedLetter && loadingSubs && (
          <div style={{ fontSize: 14, color: '#666' }}>Loading...</div>
        )}

        {selectedLetter && !loadingSubs && (
          <>
            {submissions.length === 0 ? (
              <p style={{ fontSize: 14, color: '#666' }}>No submissions for this letter.</p>
            ) : (
              <div style={{ display: 'grid', gap: 16 }}>
                {submissions.map(sub => {
                  const name = sub.is_signed ? sub.signed_name : null
                  return (
                    <div key={sub.id} className="submission-card">
                      <div className="submission-card-header">
                        <span style={{ marginLeft: 'auto' }}><AttachmentTags html={sub.body_html} /></span>
                      </div>
                      <div style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>
                          {sub.word_title}
                        </div>
                        <div style={{ fontSize: 13, color: '#555', lineHeight: 1.7 }}>
                          {textPreview(sub.body_html, 300)}{sub.body_html.replace(/<[^>]*>/g, '').trim().length > 300 ? '…' : ''}
                        </div>
                        <Link href={`/groups/${params.id}/submissions/${sub.week_id}/${sub.id}`}
                          style={{ fontSize: 12, marginTop: 10, display: 'inline-block' }}>
                          Read full piece →
                        </Link>
                        {name && (
                          <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>{name}</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

async function loadSubmissions(
  week: any,
  setSelectedLetter: (l: string) => void,
  setSubmissions: (s: any[]) => void,
  setLoadingSubs: (b: boolean) => void,
  supabase: any
) {
  setSelectedLetter(week.letter)
  setLoadingSubs(true)
  const { data } = await supabase
    .from('submissions')
    .select('*, users(*)')
    .eq('week_id', week.id)
    .eq('is_late_catchup', false)
    .order('submitted_at', { ascending: true })
  setSubmissions(data || [])
  setLoadingSubs(false)
}

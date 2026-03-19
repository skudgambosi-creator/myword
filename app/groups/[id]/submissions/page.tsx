'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function htmlPreview(html: string, maxParas: number): { preview: string; truncated: boolean } {
  const stripped = html
    .replace(/<img[^>]*>/gi, '')
    .replace(/<audio[^>]*>[\s\S]*?<\/audio>/gi, '')
  const grafs = stripped.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || []
  const nonEmpty = grafs.filter(p => p.replace(/<[^>]+>/g, '').trim())
  return {
    preview: nonEmpty.slice(0, maxParas).join(''),
    truncated: nonEmpty.length > maxParas,
  }
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

        {/* Header: ← A → nav */}
        {(() => {
          const revealedWeeks = weeks.filter((w: any) => w.revealed_at && new Date(w.revealed_at) < new Date())
          const currentIndex = revealedWeeks.findIndex((w: any) => w.letter === selectedLetter)
          const prevWeek = currentIndex > 0 ? revealedWeeks[currentIndex - 1] : null
          const nextWeek = currentIndex < revealedWeeks.length - 1 ? revealedWeeks[currentIndex + 1] : null
          return selectedLetter ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24, borderBottom: '3px solid #000', paddingBottom: 12 }}>
              <button
                onClick={() => prevWeek && handleLetterClick(prevWeek)}
                disabled={!prevWeek}
                style={{ fontSize: 22, fontWeight: 'bold', background: 'none', border: 'none', cursor: prevWeek ? 'pointer' : 'default', color: prevWeek ? '#CC0000' : '#ddd', padding: '0 4px' }}
              >
                ←
              </button>
              <span style={{ fontSize: 64, fontWeight: 'bold', color: '#CC0000', lineHeight: 1, minWidth: 48, textAlign: 'center' }}>
                {selectedLetter}
              </span>
              <button
                onClick={() => nextWeek && handleLetterClick(nextWeek)}
                disabled={!nextWeek}
                style={{ fontSize: 22, fontWeight: 'bold', background: 'none', border: 'none', cursor: nextWeek ? 'pointer' : 'default', color: nextWeek ? '#CC0000' : '#ddd', padding: '0 4px' }}
              >
                →
              </button>
              {!loadingSubs && (
                <span style={{ fontSize: 13, color: '#666', marginLeft: 4 }}>
                  {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          ) : null
        })()}

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
                        {(() => {
                          const { preview, truncated } = htmlPreview(sub.body_html, 3)
                          return (
                            <div
                              className="submission-card-body"
                              style={{ padding: '0 16px', fontSize: 13 }}
                              dangerouslySetInnerHTML={{ __html: preview + (truncated ? '<p>…</p>' : '') }}
                            />
                          )
                        })()}
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

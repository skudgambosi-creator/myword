'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function textPreview(html: string, maxChars: number) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxChars)
}

function AttachmentTags({ html }: { html: string }) {
  const hasImage = /<img[\s>]/i.test(html)
  const hasAudio = /<audio[\s>]/i.test(html)
  if (!hasImage && !hasAudio) return null
  return (
    <span style={{ display: 'inline-flex', gap: 4, marginLeft: 6 }}>
      {hasImage && <span className="tag" style={{ color: '#555', borderColor: '#aaa', fontSize: 9 }}>IMG</span>}
      {hasAudio && <span className="tag" style={{ color: '#555', borderColor: '#aaa', fontSize: 9 }}>AUD</span>}
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
      setWeeks(allWeeks || [])

      setLoading(false)
    }
    init()
  }, [])

  const handleLetterClick = async (week: any) => {
    if (!week.revealed_at || new Date(week.revealed_at) > new Date()) return
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32, alignItems: 'start' }}>

          {/* LEFT: A–Z list */}
          <div className="box" style={{ padding: 0, overflow: 'hidden' }}>
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 16px',
                    borderBottom: '1px solid #eee',
                    cursor: isLocked ? 'default' : 'pointer',
                    background: isSelected ? '#000' : 'transparent',
                    color: isSelected ? '#fff' : isLocked ? '#ccc' : '#000',
                  }}
                  onMouseEnter={e => { if (!isLocked && !isSelected) e.currentTarget.style.background = '#f5f5f5' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ fontSize: 20, fontWeight: 'bold', minWidth: 24, color: isSelected ? '#fff' : isLocked ? '#ddd' : '#CC0000' }}>
                    {letter}
                  </span>
                  <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {isLocked ? (week ? 'Not yet revealed' : 'Not started') : `Week ${week.week_num}`}
                  </span>
                  {isLocked && (
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: '#ccc' }}>🔒</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* RIGHT: Submissions for selected letter */}
          <div>
            {!selectedLetter && (
              <div className="box-shaded" style={{ textAlign: 'center', padding: 48 }}>
                <p style={{ fontSize: 14, color: '#666' }}>
                  Select a letter to read that week's submissions.
                </p>
              </div>
            )}

            {selectedLetter && loadingSubs && (
              <div style={{ fontSize: 14, color: '#666' }}>Loading...</div>
            )}

            {selectedLetter && !loadingSubs && (
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 24, borderBottom: '3px solid #000', paddingBottom: 12 }}>
                  <span style={{ fontSize: 64, fontWeight: 'bold', color: '#CC0000', lineHeight: 1 }}>{selectedLetter}</span>
                  <span style={{ fontSize: 13, color: '#666' }}>{submissions.length} submission{submissions.length !== 1 ? 's' : ''}</span>
                </div>

                {submissions.length === 0 ? (
                  <p style={{ fontSize: 14, color: '#666' }}>No submissions for this letter.</p>
                ) : (
                  <div style={{ display: 'grid', gap: 16 }}>
                    {submissions.map(sub => {
                      const name = sub.is_signed
                        ? (sub.signed_name || `Member #${sub.users?.member_number}`) : `Member #${sub.users?.member_number}`
                      return (
                        <div key={sub.id} className="submission-card">
                          <div className="submission-card-header">
                            <span style={{ fontWeight: 'bold', fontSize: 13 }}>{name}</span>
                            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#999' }}>{sub.word_count} words</span>
                          </div>
                          <div style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>
                              {sub.word_title}
                              <AttachmentTags html={sub.body_html} />
                            </div>
                            <div style={{ fontSize: 13, color: '#555', lineHeight: 1.7 }}>
                              {textPreview(sub.body_html, 300)}{sub.body_html.replace(/<[^>]*>/g, ' ').trim().length > 300 ? '…' : ''}
                            </div>
                            <Link href={`/groups/${params.id}/submissions/${sub.week_id}/${sub.id}`}
                              style={{ fontSize: 12, marginTop: 10, display: 'inline-block' }}>
                              Read full piece →
                            </Link>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

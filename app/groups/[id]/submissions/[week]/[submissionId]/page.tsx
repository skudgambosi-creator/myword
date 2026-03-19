import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/layout/Nav'

export default async function SubmissionReadPage({
  params
}: { params: { id: string; week: string; submissionId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('member_number').eq('id', user.id).single()
  const displayName = `Member #${profile?.member_number}`

  const { data: sub } = await supabase
    .from('submissions')
    .select('*, users(*), weeks(*)')
    .eq('id', params.submissionId)
    .single()

  if (!sub) redirect(`/groups/${params.id}/submissions`)

  const { data: membership } = await supabase
    .from('group_members').select('*').eq('group_id', params.id).eq('user_id', user.id).single()
  if (!membership) redirect('/dashboard')

  const isOwn = sub.user_id === user.id
  const isRevealed = sub.weeks?.revealed_at && new Date(sub.weeks.revealed_at) < new Date()
  if (!isOwn && !isRevealed) redirect(`/groups/${params.id}/submissions`)

  const authorName = sub.is_signed ? sub.signed_name : null

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

  const { images, audios } = extractMedia(sub.body_html ?? '')

  return (
    <div style={{ minHeight: '100vh' }}>
      <Nav userName={displayName} />

      <div className="page-container" style={{ paddingTop: 40, paddingBottom: 80, maxWidth: 720 }}>
        <div style={{ marginBottom: 24, fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          <Link href="/dashboard" style={{ color: '#999', textDecoration: 'none' }}>Dashboard</Link>
          {' / '}
          <Link href={`/groups/${params.id}`} style={{ color: '#999', textDecoration: 'none' }}>Group</Link>
          {' / '}
          <Link href={`/groups/${params.id}/submissions`} style={{ color: '#999', textDecoration: 'none' }}>Submissions</Link>
        </div>

        {/* Piece header */}
        <div style={{ borderBottom: '3px solid #000', paddingBottom: 20, marginBottom: 32 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 72, fontWeight: 'bold', color: '#CC0000', lineHeight: 1 }}>
              {sub.weeks?.letter}
            </span>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 8, lineHeight: 1.2 }}>
                {sub.word_title}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {authorName && <span style={{ fontSize: 13, fontWeight: 'bold' }}>{authorName}</span>}
                {authorName && <span style={{ fontSize: 11, color: '#999' }}>·</span>}
                <span style={{ fontSize: 11, color: '#666' }}>
                  Week {sub.weeks?.week_num} of 26
                </span>
                <span style={{ fontSize: 11, color: '#999' }}>·</span>
                <span style={{ fontSize: 11, color: '#666' }}>{sub.word_count} words</span>
                {sub.is_late_catchup && <span className="tag tag-late">LATE</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Piece body — media stripped here, shown separately below */}
        <div
          className="submission-card-body"
          style={{ fontSize: 15, lineHeight: 1.9 }}
          dangerouslySetInnerHTML={{ __html: (sub.body_html ?? '')
            .replace(/<img[^>]*>/gi, '')
            .replace(/<audio[^>]*>[\s\S]*?<\/audio>/gi, '')
          }}
        />

        {(images.length > 0 || audios.length > 0) && (
          <div style={{ marginTop: 40, borderTop: '2px solid #000', paddingTop: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 'bold', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
              Attachments
            </div>
            {images.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: audios.length > 0 ? 20 : 0 }}>
                {images.map((src, i) => (
                  <img key={i} src={src} alt={`Image ${i + 1}`}
                    style={{ width: 140, height: 140, objectFit: 'cover', border: '1px solid #000', display: 'block' }} />
                ))}
              </div>
            )}
            {audios.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {audios.map((src, i) => (
                  <audio key={i} controls src={src} style={{ width: '100%', display: 'block' }} />
                ))}
              </div>
            )}
          </div>
        )}

        <hr className="rule" />
        <Link href={`/groups/${params.id}/submissions`} className="btn btn-ghost">
          ← Back to submissions
        </Link>
      </div>
    </div>
  )
}

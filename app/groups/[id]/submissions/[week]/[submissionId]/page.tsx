import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/layout/Nav'
import ImageGallery from '@/components/ui/ImageGallery'

function Footer() {
  return (
    <footer style={{ textAlign: 'center', padding: '60px 0 32px' }}>
      <svg width="54" height="50" viewBox="0 0 54 50" fill="none" style={{ display: 'block', margin: '0 auto 6px' }}>
        <circle cx="17" cy="16" r="14" stroke="#000" strokeWidth="0.75" />
        <circle cx="37" cy="16" r="14" stroke="#000" strokeWidth="0.75" />
        <circle cx="27" cy="32" r="14" stroke="#000" strokeWidth="0.75" />
      </svg>
      <div style={{ fontSize: 9, letterSpacing: '0.2em' }}>MOUNTFORD-GAMBOSI</div>
    </footer>
  )
}

export default async function SubmissionReadPage({
  params
}: { params: { id: string; week: string; submissionId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: sub } = await supabase
    .from('submissions').select('*, users(*), weeks(*)')
    .eq('id', params.submissionId).single()
  if (!sub) redirect(`/groups/${params.id}/submissions`)

  const { data: membership } = await supabase
    .from('group_members').select('*').eq('group_id', params.id).eq('user_id', user.id).single()
  if (!membership) redirect('/dashboard')

  const isOwn = sub.user_id === user.id
  const isRevealed = sub.weeks?.revealed_at && new Date(sub.weeks.revealed_at) < new Date()
  if (!isOwn && !isRevealed) redirect(`/groups/${params.id}/submissions`)

  // Fetch all submissions + their week info for prev/next navigation
  const { data: allSubs } = await supabase
    .from('submissions')
    .select('id, week_id, word_title, weeks(week_num, revealed_at)')
    .eq('group_id', params.id)
    .eq('is_late_catchup', false)

  const revealedSubs = ((allSubs || []) as any[])
    .filter((s: any) => s.weeks?.revealed_at && new Date(s.weeks.revealed_at) < new Date())
    .sort((a: any, b: any) => {
      if (a.weeks.week_num !== b.weeks.week_num) return a.weeks.week_num - b.weeks.week_num
      return a.word_title.localeCompare(b.word_title)
    })

  const currentIdx = revealedSubs.findIndex((s: any) => s.id === params.submissionId)
  const prevSub = currentIdx > 0 ? revealedSubs[currentIdx - 1] : null
  const nextSub = currentIdx < revealedSubs.length - 1 ? revealedSubs[currentIdx + 1] : null

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
  const authorName = sub.is_signed ? sub.signed_name : null

  const navBtnStyle = {
    display: 'inline-block',
    background: '#000', color: '#fff',
    padding: '10px 24px', fontSize: 12, fontWeight: 700,
    letterSpacing: '0.15em', textTransform: 'uppercase' as const,
    textDecoration: 'none',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />

      <main style={{ flex: 1, padding: '28px 40px 0', maxWidth: 900, width: '100%', margin: '0 auto' }}>

        {/* GO BACK + Letter */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', position: 'relative', marginBottom: 0 }}>
          <Link
            href={`/groups/${params.id}/submissions`}
            style={{ position: 'absolute', left: 0, top: 8, fontSize: 11, color: '#999', letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none' }}
          >
            GO BACK
          </Link>
          <div style={{ fontSize: 80, fontWeight: 900, color: '#C85A5A', lineHeight: 1, textAlign: 'center' }}>
            {sub.weeks?.letter}
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #000', margin: '16px 0' }} />

        {/* Title + Author */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#C85A5A', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {sub.word_title}
          </span>
          {authorName && (
            <span style={{ fontSize: 13, color: '#C85A5A', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {authorName}
            </span>
          )}
        </div>

        {/* Body */}
        <div
          className="submission-card-body"
          style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 40 }}
          dangerouslySetInnerHTML={{ __html: (sub.body_html ?? '')
            .replace(/<img[^>]*>/gi, '')
            .replace(/<audio[^>]*>[\s\S]*?<\/audio>/gi, '')
          }}
        />

        {/* Attachments */}
        {(images.length > 0 || audios.length > 0) && (
          <div style={{ border: '1px solid #ccc', padding: '20px 24px', marginBottom: 32 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#999', marginBottom: 16, textAlign: 'center' }}>
              ATTACHMENTS SHOW IN HERE
            </div>
            {images.length > 0 && (
              <div style={{ marginBottom: audios.length > 0 ? 16 : 0 }}>
                <ImageGallery images={images} />
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

        {(images.length === 0 && audios.length === 0) && (
          <div style={{ border: '1px solid #ccc', padding: '20px 24px', marginBottom: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ccc' }}>
              ATTACHMENTS SHOW IN HERE
            </div>
          </div>
        )}

        {/* PREVIOUS / NEXT */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <div style={{ flex: 1, height: 1, background: '#000' }} />
          {prevSub ? (
            <Link href={`/groups/${params.id}/submissions/${prevSub.week_id}/${prevSub.id}`} style={{ ...navBtnStyle, margin: '0 16px' }}>
              PREVIOUS
            </Link>
          ) : (
            <span style={{ ...navBtnStyle, margin: '0 16px', opacity: 0.25, cursor: 'default', pointerEvents: 'none' }}>PREVIOUS</span>
          )}
          <div style={{ flex: 1, height: 1, background: '#000' }} />
          {nextSub ? (
            <Link href={`/groups/${params.id}/submissions/${nextSub.week_id}/${nextSub.id}`} style={{ ...navBtnStyle, margin: '0 16px' }}>
              NEXT
            </Link>
          ) : (
            <span style={{ ...navBtnStyle, margin: '0 16px', opacity: 0.25, cursor: 'default', pointerEvents: 'none' }}>NEXT</span>
          )}
          <div style={{ flex: 1, height: 1, background: '#000' }} />
        </div>

      </main>

      <Footer />
    </div>
  )
}

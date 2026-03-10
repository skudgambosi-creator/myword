'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SubmissionReadPage({
  params
}: { params: { id: string; week: string; submissionId: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [sub, setSub] = useState<any>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const [{ data: prof }, { data: membership }, { data: submission }] = await Promise.all([
        supabase.from('users').select('*').eq('id', session.user.id).single(),
        supabase.from('group_members').select('*').eq('group_id', params.id).eq('user_id', session.user.id).single(),
        supabase.from('submissions').select('*, users(*), weeks(*)').eq('id', params.submissionId).single(),
      ])

      if (!membership) { router.push('/dashboard'); return }
      if (!submission) { router.push(`/groups/${params.id}/submissions`); return }

      const isOwn = submission.user_id === session.user.id
      const isRevealed = submission.weeks?.revealed_at && new Date(submission.weeks.revealed_at) < new Date()
      if (!isOwn && !isRevealed) { router.push(`/groups/${params.id}/submissions`); return }

      setProfile(prof)
      setSub(submission)
      setLoading(false)
    }
    init()
  }, [params.submissionId])

  if (loading || !sub) return (
    <div style={{ minHeight: '100vh' }}>
      <nav className="nav"><Link href="/dashboard" className="nav-brand">[ MY WORD ]</Link></nav>
      <div className="page-container" style={{ paddingTop: 40 }}>Loading...</div>
    </div>
  )

  const displayName = profile?.identity_mode === 'anonymous'
    ? `No-name ${profile.noname_number}` : profile?.display_name

  const authorName = sub.users?.identity_mode === 'anonymous'
    ? `No-name ${sub.users?.noname_number}` : sub.users?.display_name

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav className="nav">
        <Link href="/dashboard" className="nav-brand">[ MY WORD ]</Link>
        <Link href={`/groups/${params.id}`} className="nav-link">← Project</Link>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          <span style={{ padding: '10px 16px', fontSize: 12, color: '#666', borderLeft: '1px solid #aaa' }}>
            {displayName}
          </span>
          <button onClick={async () => {
            await supabase.auth.signOut()
            window.location.href = '/'
          }} className="nav-link" style={{ border: 'none', cursor: 'pointer', background: 'none' }}>
            Sign Out
          </button>
        </div>
      </nav>

      <div className="page-container" style={{ paddingTop: 40, paddingBottom: 80, maxWidth: 720 }}>
        <div style={{ marginBottom: 24, fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          <Link href="/dashboard" style={{ color: '#999', textDecoration: 'none' }}>Dashboard</Link>
          {' / '}
          <Link href={`/groups/${params.id}`} style={{ color: '#999', textDecoration: 'none' }}>Project</Link>
          {' / '}
          <Link href={`/groups/${params.id}/submissions`} style={{ color: '#999', textDecoration: 'none' }}>Submissions</Link>
        </div>

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
                <span style={{ fontSize: 13, fontWeight: 'bold' }}>{authorName}</span>
                <span style={{ fontSize: 11, color: '#999' }}>·</span>
                <span style={{ fontSize: 11, color: '#666' }}>Week {sub.weeks?.week_num} of 26</span>
                <span style={{ fontSize: 11, color: '#999' }}>·</span>
                <span style={{ fontSize: 11, color: '#666' }}>{sub.word_count} words</span>
                {sub.is_late_catchup && <span className="tag tag-late">LATE</span>}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{ fontSize: 15, lineHeight: 1.9 }}
          dangerouslySetInnerHTML={{ __html: sub.body_html }}
        />

        <hr className="rule" />
        <Link href={`/groups/${params.id}/submissions`} className="btn">
          ← Back to submissions
        </Link>
      </div>
    </div>
  )
}

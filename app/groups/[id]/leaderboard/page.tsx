'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LeaderboardPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [entries, setEntries] = useState<any[]>([])
  const [weeksElapsed, setWeeksElapsed] = useState(0)

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

      const { data: members } = await supabase
        .from('group_members').select('user_id, users(*)')
        .eq('group_id', params.id)

      const { data: scores } = await supabase
        .from('scores').select('*').eq('group_id', params.id)

      const { data: weeks } = await supabase
        .from('weeks').select('*').eq('group_id', params.id)

      const now = new Date()
      const revealedWeeks = (weeks || []).filter((w: any) => w.revealed_at && new Date(w.revealed_at) < now)
      setWeeksElapsed(revealedWeeks.length)

      const sortedWeeks = [...revealedWeeks].sort((a: any, b: any) => b.week_num - a.week_num)

      const leaderboard = (members || []).map((m: any) => {
        const user = m.users
        const userScores = (scores || []).filter((s: any) => s.user_id === m.user_id)
        const total = userScores.reduce((sum: number, s: any) => sum + s.score, 0)

        let streak = 0
        for (const week of sortedWeeks) {
          const s = userScores.find((sc: any) => sc.week_id === week.id)
          if (s && s.score === 1 && !s.is_late) streak++
          else break
        }

        const name = user?.identity_mode === 'anonymous'
          ? `No-name ${user?.noname_number}` : user?.display_name

        return { user, name, total, streak, userId: m.user_id }
      }).sort((a: any, b: any) => b.total - a.total || b.streak - a.streak)

      setEntries(leaderboard)
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh' }}>
      <nav className="nav"><Link href="/dashboard" className="nav-brand">[ MY WORD ]</Link></nav>
      <div className="page-container" style={{ paddingTop: 40 }}>Loading...</div>
    </div>
  )

  const displayName = profile?.identity_mode === 'anonymous'
    ? `No-name ${profile.noname_number}` : profile?.display_name

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

      <div className="page-container" style={{ paddingTop: 40, paddingBottom: 60, maxWidth: 640 }}>
        <h1 className="page-title">Leaderboard</h1>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 24 }}>
          {weeksElapsed} of 26 weeks completed
        </p>

        {weeksElapsed === 0 ? (
          <div className="box-shaded" style={{ textAlign: 'center', padding: 40, fontSize: 14, color: '#666' }}>
            The leaderboard will appear after the first week's reveal on Wednesday.
          </div>
        ) : (
          <div className="box" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="grid-table" style={{ marginBottom: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Member</th>
                  <th style={{ width: 80 }}>Score</th>
                  <th style={{ width: 100 }}>Streak</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => {
                  const isYou = entry.userId === profile?.id
                  return (
                    <tr key={entry.userId} style={{ background: isYou ? '#fff8f8' : undefined }}>
                      <td style={{ fontWeight: 'bold', color: i === 0 ? '#CC0000' : '#999' }}>
                        {i + 1}
                      </td>
                      <td style={{ fontWeight: isYou ? 'bold' : 'normal' }}>
                        {entry.name} {isYou && <span style={{ color: '#CC0000', fontSize: 11 }}>(you)</span>}
                      </td>
                      <td style={{ fontWeight: 'bold' }}>
                        {entry.total}
                        <span style={{ fontSize: 11, color: '#999', fontWeight: 'normal' }}>/{weeksElapsed}</span>
                      </td>
                      <td style={{ fontSize: 12, color: entry.streak > 2 ? '#CC0000' : '#666' }}>
                        {entry.streak > 0 ? `${entry.streak} week${entry.streak !== 1 ? 's' : ''}` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

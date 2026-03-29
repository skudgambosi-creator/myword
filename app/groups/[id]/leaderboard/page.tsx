'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Nav from '@/components/layout/Nav'

function Footer() {
  return (
    <footer style={{ textAlign: 'center', padding: '60px 0 32px' }}>
      <svg width="260" height="100" viewBox="0 0 260 100" fill="none" style={{ display: 'block', margin: '0 auto' }}>
        <circle cx="96" cy="50" r="44" stroke="#000" strokeWidth="0.8" />
        <circle cx="164" cy="50" r="44" stroke="#000" strokeWidth="0.8" />
        <text x="120" y="53" textAnchor="start" fontFamily="Inconsolata, monospace" fontSize="11" fill="#000" letterSpacing="1">MOUNTFORD-GAMBOSI</text>
      </svg>
    </footer>
  )
}

export default function LeaderboardPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
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
        return { name: `Member #${user?.member_number}`, total, streak, userId: m.user_id }
      }).sort((a: any, b: any) => b.total - a.total || b.streak - a.streak)

      setEntries(leaderboard)
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh' }}>
      <Nav />
      <div style={{ padding: '40px', fontSize: 13, color: '#999' }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />

      <main className="page-main">

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <Link href={`/groups/${params.id}`} style={{ fontSize: 11, color: '#999', letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none' }}>
              GO BACK
            </Link>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#C85A5A', letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0, textAlign: 'center' }}>
            LEADERBOARD
          </h1>
          <div />
        </div>

        {weeksElapsed === 0 ? (
          <div style={{ border: '1px solid #ccc', padding: '40px', textAlign: 'center', fontSize: 13, color: '#666', letterSpacing: '0.05em' }}>
            The leaderboard will appear after the first week's reveal on Wednesday.
          </div>
        ) : (
          <div style={{ border: '1px solid #000', overflow: 'hidden' }}>
            {entries.map((entry, i) => (
              <div key={entry.userId} style={{
                display: 'flex', alignItems: 'center',
                padding: '12px 20px', gap: 12,
                borderBottom: i < entries.length - 1 ? '1px solid #e0e0e0' : 'none',
              }}>
                <span style={{ flex: 1, fontSize: 13, letterSpacing: '0.05em' }}>{entry.name}</span>
                <span style={{ border: '1px solid #000', padding: '2px 10px', fontSize: 12, letterSpacing: '0.05em', minWidth: 64, textAlign: 'center' }}>
                  {entry.total}/{weeksElapsed}
                </span>
                {entry.streak > 0 ? (
                  <span style={{ border: '1px solid #000', padding: '2px 10px', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    STREAK
                  </span>
                ) : (
                  <span style={{ border: '1px solid transparent', padding: '2px 10px', fontSize: 11, minWidth: 60 }} />
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

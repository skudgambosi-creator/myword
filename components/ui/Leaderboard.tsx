import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'

export default async function Leaderboard({ groupId, currentUserId }: { groupId: string; currentUserId: string }) {
  const supabase = createClient()

  const { data: members } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId)

  if (!members?.length) return null

  const userIds = members.map(m => m.user_id)

  const { data: users } = await supabase
    .from('users').select('*').in('id', userIds)

  const { data: scores } = await supabase
    .from('scores').select('*')
    .eq('group_id', groupId)
    .in('user_id', userIds)

  const { data: weeks } = await supabase
    .from('weeks').select('*').eq('group_id', groupId)

  const now = new Date()
  const revealedWeeks = weeks?.filter(w => w.revealed_at && new Date(w.revealed_at) < now) || []

  // Build leaderboard entries
  const entries = (users || []).map(user => {
    const userScores = scores?.filter(s => s.user_id === user.id) || []
    const totalScore = userScores.reduce((sum, s) => sum + s.score, 0)

    // Calculate streak
    const sortedWeeks = [...revealedWeeks].sort((a, b) => b.week_num - a.week_num)
    let streak = 0
    for (const week of sortedWeeks) {
      const s = userScores.find(sc => sc.week_id === week.id)
      if (s && s.score === 1 && !s.is_late) streak++
      else break
    }

    return {
      user,
      totalScore,
      weeksElapsed: revealedWeeks.length,
      streak,
    }
  }).sort((a, b) => b.totalScore - a.totalScore || b.streak - a.streak)

  return (
    <div>
      <div className="box-header" style={{ marginBottom: 0, borderBottom: '2px solid #000' }}>
        LEADERBOARD
      </div>
      <div className="box" style={{ borderTop: 'none', padding: 0 }}>
        {entries.map((entry, i) => {
          const { user } = entry
          const isCurrentUser = user.id === currentUserId
          const name = user.identity_mode === 'anonymous'
            ? `No-name ${user.noname_number}` : user.display_name
          return (
            <div key={user.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderBottom: '1px solid #eee',
              background: isCurrentUser ? '#fff8f8' : i % 2 === 0 ? '#fff' : '#fafafa',
            }}>
              {/* Rank */}
              <div style={{ fontSize: 11, fontWeight: 'bold', color: '#999', minWidth: 18, textAlign: 'right' }}>
                {i + 1}
              </div>

              {/* Name */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: isCurrentUser ? 'bold' : 'normal', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {name} {isCurrentUser && <span style={{ color: '#CC0000' }}>(you)</span>}
                </div>
                {entry.streak > 1 && (
                  <div style={{ fontSize: 10, color: '#CC0000' }}>
                    {entry.streak} week streak
                  </div>
                )}
              </div>

              {/* Score */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontWeight: 'bold', fontSize: 14 }}>
                  {entry.totalScore}
                  <span style={{ fontSize: 10, color: '#999', fontWeight: 'normal' }}>
                    /{entry.weeksElapsed}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

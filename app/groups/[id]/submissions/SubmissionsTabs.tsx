'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function SubmissionsTabs({ groupId, userId, weeks, submissions, mySubmissions, currentUserId }: any) {
  const [tab, setTab] = useState<'mine' | 'all'>('mine')
  const [filterLetter, setFilterLetter] = useState<string>('ALL')
  const [filterUser, setFilterUser] = useState<string>('ALL')

  // Get unique users from submissions
  const uniqueUsers = Array.from(
    new Map(submissions.map((s: any) => [s.user_id, s.users])).values()
  ) as any[]

  // Get unique letters
  const letters = Array.from(new Set(weeks.map((w: any) => w.letter))) as string[]

  const filteredAll = submissions.filter((s: any) => {
    if (filterLetter !== 'ALL' && s.weeks?.letter !== filterLetter) return false
    if (filterUser !== 'ALL' && s.user_id !== filterUser) return false
    return true
  })

  return (
    <div>
      {/* Tab headers */}
      <div style={{ display: 'flex', borderBottom: '3px solid #000', marginBottom: 24 }}>
        {[
          { key: 'mine', label: 'My Submissions' },
          { key: 'all', label: 'All Submissions' },
        ].map(t => (
          <button key={t.key}
            onClick={() => setTab(t.key as any)}
            style={{
              fontFamily: 'Courier New', fontSize: 13, fontWeight: 'bold',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              padding: '10px 24px', border: 'none', cursor: 'pointer',
              background: tab === t.key ? '#000' : '#eee',
              color: tab === t.key ? '#fff' : '#333',
              borderRight: '1px solid #ccc',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* MY SUBMISSIONS */}
      {tab === 'mine' && (
        <div>
          {mySubmissions.length === 0 ? (
            <div className="box-shaded" style={{ textAlign: 'center', padding: 40, fontSize: 14, color: '#666' }}>
              You haven't submitted anything yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {mySubmissions.map((sub: any) => {
                const isRevealed = sub.weeks?.revealed_at && new Date(sub.weeks.revealed_at) < new Date()
                const isCurrentWeek = !isRevealed
                return (
                  <div key={sub.id} className="submission-card">
                    <div className="submission-card-header">
                      <span style={{ fontSize: 20, fontWeight: 'bold', marginRight: 8 }}>
                        {sub.weeks?.letter}
                      </span>
                      <span style={{ fontSize: 12, color: '#555' }}>
                        Week {sub.weeks?.week_num} of 26
                        {sub.is_late_catchup && <span className="tag tag-late" style={{ marginLeft: 8 }}>LATE</span>}
                        {sub.users?.identity_mode === 'anonymous' && <span className="tag tag-anon" style={{ marginLeft: 8 }}>ANON</span>}
                      </span>
                      <span style={{ marginLeft: 'auto', fontSize: 12, color: '#999' }}>
                        {sub.word_count} words
                      </span>
                    </div>
                    <div style={{ padding: '10px 12px' }}>
                      {isRevealed ? (
                        <div>
                          <strong style={{ fontSize: 15 }}>{sub.word_title}</strong>
                          <div style={{ marginTop: 6, fontSize: 12, color: '#666' }}
                            dangerouslySetInnerHTML={{ __html: sub.body_html.slice(0, 200) + (sub.body_html.length > 200 ? '...' : '') }}
                          />
                          <Link href={`/groups/${groupId}/submissions/${sub.week_id}/${sub.id}`}
                            style={{ fontSize: 12, marginTop: 8, display: 'inline-block' }}>
                            Read full piece →
                          </Link>
                        </div>
                      ) : (
                        <div style={{ fontSize: 13, color: '#555' }}>
                          <strong>{sub.word_title}</strong>
                          <span style={{ color: '#999', marginLeft: 8 }}>— hidden until Wednesday reveal</span>
                          <div style={{ marginTop: 6 }}>
                            <Link href={`/groups/${groupId}/submit?edit=1`} style={{ fontSize: 12 }}>
                              Edit →
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ALL SUBMISSIONS */}
      {tab === 'all' && (
        <div>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label className="field-label">Filter by Letter</label>
              <select value={filterLetter} onChange={e => { setFilterLetter(e.target.value); setFilterUser('ALL') }}
                style={{ fontFamily: 'Courier New', fontSize: 13, border: '2px solid #000', padding: '4px 8px', background: '#fff' }}>
                <option value="ALL">All Letters</option>
                {letters.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Filter by Member</label>
              <select value={filterUser} onChange={e => { setFilterUser(e.target.value); setFilterLetter('ALL') }}
                style={{ fontFamily: 'Courier New', fontSize: 13, border: '2px solid #000', padding: '4px 8px', background: '#fff' }}>
                <option value="ALL">All Members</option>
                {uniqueUsers.map((u: any) => (
                  <option key={u?.id} value={u?.id}>
                    {u?.identity_mode === 'anonymous' ? `No-name ${u?.noname_number}` : u?.display_name}
                  </option>
                ))}
              </select>
            </div>
            {(filterLetter !== 'ALL' || filterUser !== 'ALL') && (
              <button className="btn btn-ghost" onClick={() => { setFilterLetter('ALL'); setFilterUser('ALL') }}>
                Clear filters
              </button>
            )}
          </div>

          {filteredAll.length === 0 ? (
            <div className="box-shaded" style={{ textAlign: 'center', padding: 40, fontSize: 14, color: '#666' }}>
              {weeks.length === 0
                ? 'No submissions have been revealed yet. Check back after the first Wednesday.'
                : 'No submissions match this filter.'}
            </div>
          ) : (
            <div>
              {/* Group by letter */}
              {(filterLetter !== 'ALL' ? [filterLetter] : letters).map(letter => {
                const letterSubs = filteredAll.filter((s: any) => s.weeks?.letter === letter)
                if (letterSubs.length === 0) return null
                return (
                  <div key={letter} style={{ marginBottom: 40 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 12, borderBottom: '2px solid #000', paddingBottom: 8 }}>
                      <span style={{ fontSize: 36, fontWeight: 'bold', color: '#CC0000' }}>{letter}</span>
                      <span style={{ fontSize: 12, color: '#666' }}>{letterSubs.length} submission{letterSubs.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div style={{ display: 'grid', gap: 12 }}>
                      {letterSubs.map((sub: any) => {
                        const name = sub.users?.identity_mode === 'anonymous'
                          ? `No-name ${sub.users?.noname_number}` : sub.users?.display_name
                        const avatarUrl = sub.users?.avatar_storage_path
                          ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${sub.users.avatar_storage_path}`
                          : null
                        return (
                          <div key={sub.id} className="submission-card">
                            <div className="submission-card-header">
                              {avatarUrl && (
                                <img src={avatarUrl} alt={name} style={{ width: 24, height: 32, objectFit: 'cover', border: '1px solid #000' }} />
                              )}
                              <span style={{ fontSize: 12, fontWeight: 'bold' }}>{name}</span>
                              {sub.is_late_catchup && <span className="tag tag-late">LATE</span>}
                              <span style={{ marginLeft: 'auto', fontSize: 11, color: '#999' }}>
                                {sub.word_count} words
                              </span>
                            </div>
                            <div style={{ padding: '10px 12px' }}>
                              <strong style={{ fontSize: 15 }}>{sub.word_title}</strong>
                              <div style={{ marginTop: 6, fontSize: 12, color: '#666', lineHeight: 1.6 }}
                                dangerouslySetInnerHTML={{ __html: sub.body_html.slice(0, 200) + (sub.body_html.length > 200 ? '...' : '') }}
                              />
                              <Link href={`/groups/${groupId}/submissions/${sub.week_id}/${sub.id}`}
                                style={{ fontSize: 12, marginTop: 8, display: 'inline-block' }}>
                                Read full piece →
                              </Link>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

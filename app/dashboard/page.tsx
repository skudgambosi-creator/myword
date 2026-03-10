import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/layout/Nav'
import type { Group, Week, Submission } from '@/types'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('*').eq('id', user.id).single()

  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', user.id)

  const groupIds = memberships?.map(m => m.group_id) || []

  let groups: Group[] = []
  if (groupIds.length > 0) {
    const { data } = await supabase
      .from('groups').select('*').in('id', groupIds)
    groups = data || []
  }

  const displayName = profile?.identity_mode === 'anonymous'
    ? `No-name ${profile.noname_number}`
    : profile?.display_name

  return (
    <div style={{ minHeight: '100vh' }}>
      <Nav userName={displayName} />

      <div className="page-container" style={{ paddingTop: 40, paddingBottom: 60 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
          <h1 className="page-title" style={{ marginBottom: 0 }}>Dashboard</h1>
          <Link href="/groups/new" className="btn btn-accent">+ New Group</Link>
        </div>

        {groups.length === 0 ? (
          <div className="box" style={{ textAlign: 'center', padding: 48 }}>
            <p style={{ fontSize: 14, color: '#666', marginBottom: 20 }}>
              You haven't joined any groups yet.
            </p>
            <Link href="/groups/new" className="btn btn-accent">Create a Group</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {groups.map(group => (
              <GroupCard key={group.id} group={group} userId={user.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

async function GroupCard({ group, userId }: { group: Group; userId: string }) {
  const supabase = createClient()

  // Get current/most recent week
  const now = new Date().toISOString()
  const { data: currentWeek } = await supabase
    .from('weeks')
    .select('*')
    .eq('group_id', group.id)
    .lte('opens_at', now)
    .order('week_num', { ascending: false })
    .limit(1)
    .single()

  // Check if user has submitted this week
  let hasSubmitted = false
  if (currentWeek) {
    const { data: sub } = await supabase
      .from('submissions')
      .select('id')
      .eq('user_id', userId)
      .eq('week_id', currentWeek.id)
      .eq('is_late_catchup', false)
      .single()
    hasSubmitted = !!sub
  }

  // Get member count
  const { count: memberCount } = await supabase
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', group.id)

  // Get submission count for current week
  let submissionCount = 0
  if (currentWeek) {
    const { count } = await supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .eq('week_id', currentWeek.id)
      .eq('is_late_catchup', false)
    submissionCount = count || 0
  }

  const isCompleted = !!group.completed_at
  const weekClosed = currentWeek ? new Date(currentWeek.closes_at) < new Date() : false

  return (
    <div className="box">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <h2 style={{ fontSize: 18, fontWeight: 'bold' }}>{group.name}</h2>
            {isCompleted && <span className="tag tag-complete">COMPLETED</span>}
            {!isCompleted && group.locked && <span className="tag" style={{ color: '#555', borderColor: '#999' }}>ACTIVE</span>}
            {!group.locked && <span className="tag" style={{ color: '#CC0000', borderColor: '#CC0000' }}>AWAITING START</span>}
          </div>

          {currentWeek && !isCompleted && (
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <span className="section-header" style={{ display: 'block', marginBottom: 2 }}>This Week</span>
                <span style={{ fontSize: 32, fontWeight: 'bold' }}>{currentWeek.letter}</span>
                <span style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>Week {currentWeek.week_num} of 26</span>
              </div>
              <div>
                <span className="section-header" style={{ display: 'block', marginBottom: 2 }}>Submissions</span>
                <span className="submission-counter">
                  <strong>{submissionCount}</strong> / {memberCount}
                </span>
              </div>
              <div>
                <span className="section-header" style={{ display: 'block', marginBottom: 2 }}>Your Status</span>
                {hasSubmitted
                  ? <span className="tag tag-complete">✓ Submitted</span>
                  : weekClosed
                  ? <span className="tag tag-late">Window Closed</span>
                  : <span className="tag" style={{ color: '#CC0000', borderColor: '#CC0000' }}>Not submitted</span>
                }
              </div>
            </div>
          )}

          {!currentWeek && !isCompleted && (
            <p style={{ fontSize: 13, color: '#666' }}>
              Starts {new Date(group.start_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href={`/groups/${group.id}`} className="btn">
            {isCompleted ? 'View Archive' : 'Open →'}
          </Link>
        </div>
      </div>
    </div>
  )
}

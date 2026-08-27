'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Nav from '@/components/layout/Nav'

const CARD: React.CSSProperties = {
  border: '1px solid #000',
  background: '#fff',
  overflow: 'hidden',
}

interface WeekRow {
  id: string
  week_num: number
  letter: string
}

export default function CollectionPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [group, setGroup] = useState<any>(null)
  const [weeks, setWeeks] = useState<WeekRow[]>([])
  const [onTimeByWeek, setOnTimeByWeek] = useState<Record<string, any>>({})
  const [catchupByWeek, setCatchupByWeek] = useState<Record<string, any>>({})

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const userId = session.user.id

      const { data: membership } = await supabase
        .from('group_members').select('*')
        .eq('group_id', params.id).eq('user_id', userId).maybeSingle()
      if (!membership) { router.push('/dashboard'); return }

      const { data: grp } = await supabase.from('groups').select('*').eq('id', params.id).single()
      setGroup(grp)

      const { data: wks } = await supabase
        .from('weeks').select('id, week_num, letter')
        .eq('group_id', params.id).lte('week_num', 26)
        .order('week_num', { ascending: true })
      setWeeks(wks || [])

      const { data: subs } = await supabase
        .from('submissions').select('*')
        .eq('user_id', userId).eq('group_id', params.id)

      const onTime: Record<string, any> = {}
      const catchup: Record<string, any> = {}
      for (const s of subs || []) {
        if (s.is_late_catchup) catchup[s.week_id] = s
        else onTime[s.week_id] = s
      }
      setOnTimeByWeek(onTime)
      setCatchupByWeek(catchup)

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

  const completed = weeks.filter(w => onTimeByWeek[w.id])
  const missed = weeks.filter(w => !onTimeByWeek[w.id])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      <Nav />

      <main style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: 800, width: '100%', margin: '0 auto', boxSizing: 'border-box', background: '#fff' }}>

        {/* Header */}
        <div style={CARD}>
          <div style={{ border: 'none', padding: '20px 24px' }}>
            <div style={{ fontSize: 22, letterSpacing: '0.2em', textTransform: 'uppercase' }}>{group?.name}</div>
            <div style={{ fontSize: 11, color: '#C85A5A', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 6 }}>
              The Collection Week
            </div>
            <div style={{ fontSize: 12, color: '#666', lineHeight: 1.7, marginTop: 12 }}>
              {completed.length} / 26 done on time. Add anything you missed below, no cap — and write your epilogue whenever you're ready.
            </div>
          </div>
        </div>

        {/* Epilogue entry point */}
        <Link
          href={`/groups/${params.id}/submit`}
          style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
        >
          <div
            style={{ ...CARD, padding: '20px 24px', textAlign: 'center', cursor: 'pointer', transition: 'background 0.12s, color 0.12s' }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = '#000'; el.style.color = '#fff' }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = ''; el.style.color = '' }}
          >
            <div style={{ fontSize: 16, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700 }}>
              Write your epilogue →
            </div>
          </div>
        </Link>

        {/* Missed weeks — backfill, no cap */}
        {missed.length > 0 && (
          <div style={CARD}>
            <div style={{ padding: '14px 24px', borderBottom: '1px solid #000', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888' }}>
              Missed — add what you would've written
            </div>
            {missed.map(w => {
              const draft = catchupByWeek[w.id]
              return (
                <Link
                  key={w.id}
                  href={`/groups/${params.id}/submit?catchup=1&week=${w.id}`}
                  className="pill-hover"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', color: 'inherit', padding: '14px 24px', borderTop: '1px solid #eee' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 20, fontWeight: 900, fontFamily: 'monospace', color: '#C85A5A', minWidth: 24 }}>{w.letter}</span>
                    <span style={{ fontSize: 13 }}>{draft ? draft.word_title : 'Not yet added'}</span>
                  </span>
                  <span style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#999' }}>
                    {draft ? 'edit →' : 'add →'}
                  </span>
                </Link>
              )
            })}
          </div>
        )}

        {/* Completed weeks — locked, read-only */}
        {completed.length > 0 && (
          <div style={CARD}>
            <div style={{ padding: '14px 24px', borderBottom: '1px solid #000', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888' }}>
              Yours, on time
            </div>
            {completed.map(w => {
              const sub = onTimeByWeek[w.id]
              return (
                <div key={w.id} style={{ padding: '20px 24px', borderTop: '1px solid #eee' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10 }}>
                    <span style={{ fontSize: 20, fontWeight: 900, fontFamily: 'monospace', color: '#C85A5A' }}>{w.letter}</span>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{sub.word_title}</span>
                  </div>
                  <div
                    className="submission-card-body"
                    style={{ fontSize: 13, lineHeight: 1.8, color: '#333' }}
                    dangerouslySetInnerHTML={{ __html: (sub.body_html ?? '')
                      .replace(/<img[^>]*>/gi, '')
                      .replace(/<audio[^>]*>[\s\S]*?<\/audio>/gi, '')
                    }}
                  />
                </div>
              )
            })}
          </div>
        )}

      </main>
    </div>
  )
}

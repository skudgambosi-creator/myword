'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Nav from '@/components/layout/Nav'
import { getCurrentGroup } from '@/lib/groups/current'

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [currentGroup, setCurrentGroup] = useState<any>(null)
  const [completedSeasons, setCompletedSeasons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [envelopeOpen, setEnvelopeOpen] = useState(false)
  const [mutuals, setMutuals] = useState<any[]>([])
  const [clueInputs, setClueInputs] = useState<Record<string, string>>({})
  const [clueSaved, setClueSaved] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)
      const { data: prof } = await supabase.from('users').select('*').eq('id', session.user.id).single()
      setProfile(prof)

      const group = await getCurrentGroup(supabase)
      setCurrentGroup(group)

      const { data: memberships } = await supabase
        .from('group_members').select('groups(*)').eq('user_id', session.user.id)
      const completed = (memberships || [])
        .map((m: any) => m.groups)
        .filter((g: any) => g && g.completed_at)
      setCompletedSeasons(completed)

      setLoading(false)
    }
    init()
  }, [])

  const fetchMutuals = async () => {
    if (!currentGroup) return
    const res = await fetch(`/api/envelope/mutuals?group_id=${currentGroup.id}`)
    const data = await res.json()
    setMutuals(data)
    const inputs: Record<string, string> = {}
    for (const m of data) inputs[m.id] = m.my_clue || ''
    setClueInputs(inputs)
  }

  const saveClue = async (mutual_id: string) => {
    await fetch('/api/envelope/clue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mutual_id, clue: clueInputs[mutual_id] }),
    })
    setClueSaved(prev => ({ ...prev, [mutual_id]: true }))
    fetchMutuals()
  }

  if (loading) return (
    <div style={{ minHeight: '100vh' }}>
      <Nav />
      <div style={{ padding: '40px', fontSize: 13, color: '#999' }}>Loading...</div>
    </div>
  )

  const memberNum = String(profile?.member_number ?? '00').padStart(2, '0')

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />

      <main className="page-main">

        {/* PROFILE heading — centred, GO BACK absolute left */}
        <div style={{ position: 'relative', textAlign: 'center', marginBottom: 20 }}>
          <Link
            href={currentGroup ? `/groups/${currentGroup.id}` : '/dashboard'}
            className="pill-hover"
            style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}
          >
            GO BACK
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#C85A5A', letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0, fontFamily: 'inherit' }}>
            PROFILE
          </h1>
        </div>

        {/* Profile card — two columns */}
        <div style={{ border: '1px solid #000', padding: '40px 32px', marginBottom: 0, display: 'flex', gap: 0, position: 'relative' }}>

          {/* Vertical divider line — top aligns with email, bottom with ellipses */}
          <div style={{ position: 'absolute', left: '50%', top: 40, bottom: 40, width: 1, background: '#ddd', transform: 'translateX(-0.5px)' }} />

          {/* Left: email / password / member# */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', paddingRight: 32 }}>
            <div style={{ marginBottom: 20 }}>
              <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: 12 }}>YOUR EMAIL:...</span>
              <span style={{ fontSize: 13, borderBottom: '1px solid #000', display: 'inline-block', minWidth: 180, paddingBottom: 2 }}>
                {profile?.email}
              </span>
            </div>

            <div style={{ marginBottom: 32 }}>
              <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: 12 }}>YOUR PASSWORD:</span>
              <span style={{ fontSize: 13, borderBottom: '1px solid #000', display: 'inline-block', minWidth: 180, paddingBottom: 2, letterSpacing: '0.3em' }}>
                ••••••••
              </span>
            </div>

            {/* Member number Venn — wrapper sized to SVG so label centres correctly */}
            <div style={{ margin: '0 auto', width: 220, textAlign: 'center' }}>
              <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>MEMBER #</div>
              <svg width="220" viewBox="0 0 240 110" fill="none">
                <circle cx="96" cy="55" r="48" stroke="#000" strokeWidth="0.75" />
                <circle cx="144" cy="55" r="48" stroke="#000" strokeWidth="0.75" />
                <text x="120" y="62" textAnchor="middle" fill="#C85A5A" fontSize="16" fontFamily="Inconsolata, monospace" fontWeight="400">
                  {memberNum}
                </text>
              </svg>
            </div>
          </div>

          {/* Right: Saturn symbol centred */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: 32 }}>
            <img src="/saturn.svg" alt="Saturn symbol" style={{ width: '55%', height: 'auto', display: 'block' }} />
          </div>
        </div>

        {/* Completed seasons — only reachable from here once a group drops off the dashboard */}
        {completedSeasons.length > 0 && (
          <div style={{ border: '1px solid #000', borderTop: 'none', marginBottom: 0 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888', padding: '14px 20px 10px' }}>
              Completed seasons
            </div>
            {completedSeasons.map((g: any) => (
              <Link
                key={g.id}
                href={`/groups/${g.id}`}
                className="pill-hover"
                style={{ display: 'block', textDecoration: 'none', color: 'inherit', padding: '14px 20px', borderTop: '1px solid #eee', fontSize: 13 }}
              >
                {g.name}
              </Link>
            ))}
          </div>
        )}

        {/* CHANGE PASSWORD button */}
        <Link href="/forgot-password" className="btn-black" style={{ display: 'block', width: '100%', padding: '18px', fontSize: 15 }}>
          CHANGE PASSWORD
        </Link>

        {/* ENVELOPES button */}
        <button
          onClick={() => { setEnvelopeOpen(true); fetchMutuals() }}
          className="btn-black"
          style={{ display: 'block', width: '100%', padding: '18px', fontSize: 15, marginTop: 0, borderTop: 'none', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.1em', textAlign: 'center' }}
        >
          ✉ ENVELOPES
        </button>
      </main>

      {/* Envelope modal */}
      {envelopeOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', border: '1px solid #000', width: '100%', maxWidth: 520, maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #000' }}>
              <span style={{ fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>ENVELOPES</span>
              <button onClick={() => setEnvelopeOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, fontFamily: 'inherit' }}>✕</button>
            </div>

            {mutuals.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', fontSize: 13, color: '#888' }}>
                No mutual envelopes yet. Send ✉ on pieces you admire to start a match.
              </div>
            ) : (
              <div>
                {mutuals.map(m => {
                  const bothResponded = m.my_clue && m.their_clue
                  return (
                    <div key={m.id} style={{ padding: '20px', borderBottom: '1px solid #eee' }}>
                      <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: 12 }}>
                        Member #{String(m.other_member_number ?? '?').padStart(2, '0')}
                      </div>

                      {/* Your clue */}
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#aaa', marginBottom: 6 }}>Your clue</div>
                        {m.my_clue && !clueSaved[m.id] ? (
                          <div style={{ fontSize: 13, color: '#555', borderBottom: '1px solid #ddd', paddingBottom: 4 }}>{m.my_clue}</div>
                        ) : (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <textarea
                              value={clueInputs[m.id] || ''}
                              onChange={e => setClueInputs(prev => ({ ...prev, [m.id]: e.target.value }))}
                              placeholder="Leave a clue about who you are..."
                              rows={2}
                              style={{ flex: 1, border: '1px solid #ddd', padding: '8px', fontSize: 12, fontFamily: 'inherit', resize: 'vertical' }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <button
                                onClick={() => saveClue(m.id)}
                                style={{ border: '1px solid #000', background: '#000', color: '#fff', padding: '6px 12px', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit' }}
                              >
                                Save
                              </button>
                              <button
                                onClick={() => { setClueInputs(prev => ({ ...prev, [m.id]: 'silent' })); saveClue(m.id) }}
                                style={{ border: '1px solid #ddd', background: 'transparent', color: '#aaa', padding: '6px 12px', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit' }}
                              >
                                Silent
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Their clue — only if both responded */}
                      {bothResponded ? (
                        <div>
                          <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#aaa', marginBottom: 6 }}>Their clue</div>
                          <div style={{ fontSize: 13, color: '#555' }}>{m.their_clue === 'silent' ? '(stayed silent)' : m.their_clue}</div>
                        </div>
                      ) : m.my_clue ? (
                        <div style={{ fontSize: 11, color: '#bbb', fontStyle: 'italic' }}>Waiting for their clue...</div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

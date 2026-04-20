'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Nav from '@/components/layout/Nav'

const ALPHABET_PROJECT_ID = '00000000-0000-0000-0000-000000000001'

function Footer() {
  return (
    <footer style={{ textAlign: 'center', padding: '48px 0 28px' }}>
      <span style={{ fontSize: 12, color: '#ccc', letterSpacing: '0.18em' }}>MOUNTFORD-GAMBOSI</span>
    </footer>
  )
}

const RULES = [
  ['One submission per letter', 'You get one entry per week. Everyone is anonymous by default, but you can choose to sign a submission if you like. You can add pictures and music as well.'],
  ['Your word must start with the letter', 'Your title can be any word or phrase — it just has to begin with that week\'s letter. You can write whatever you like, however you like.'],
  ['Edit until Wednesday 23:59', 'You can change your submission at any time before the window closes. After that, it\'s locked.'],
  ['Hidden until midnight Wednesday', 'Nobody can see anyone else\'s submission until the reveal. Not the title, not the content. You will get an email every Wednesday with the week\'s submissions, as well as having them unlocked on here.'],
  ['Scoring', 'You score points by keeping your word. Miss a week, miss a point.'],
]

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [isMember, setIsMember] = useState(false)
  const [registrationOpen, setRegistrationOpen] = useState(true)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: membership } = await supabase
        .from('group_members').select('*')
        .eq('group_id', ALPHABET_PROJECT_ID).eq('user_id', session.user.id).maybeSingle()

      if (membership) {
        setIsMember(true)
        setLoading(false)
        return
      }

      const { data: lastWeek } = await supabase
        .from('weeks').select('closes_at').eq('group_id', ALPHABET_PROJECT_ID)
        .order('week_num', { ascending: false }).limit(1).maybeSingle()
      if (lastWeek) setRegistrationOpen(new Date(lastWeek.closes_at) > new Date())

      setLoading(false)
    }
    load()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.push('/login')
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleJoin = async () => {
    setJoining(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('group_members').insert({
      group_id: ALPHABET_PROJECT_ID,
      user_id: session.user.id,
    })
    setIsMember(true)
    setJoining(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh' }}>
      <Nav />
      <div style={{ padding: '40px', fontSize: 13, color: '#999' }}>Loading...</div>
    </div>
  )

  // Members see the two-card selector
  if (isMember) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />
      <main className="page-main">

        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: '#C85A5A', textTransform: 'uppercase', marginBottom: 16 }}>
          SEASON 1
        </div>

        <Link
          href={`/groups/${ALPHABET_PROJECT_ID}`}
          style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
        >
          <div
            style={{ border: '1px solid #000', padding: '28px 32px', marginBottom: 16, textAlign: 'center', cursor: 'pointer', transition: 'background 0.12s, color 0.12s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#000'; (e.currentTarget as HTMLDivElement).style.color = '#fff' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = ''; (e.currentTarget as HTMLDivElement).style.color = '' }}
          >
            <div style={{ fontSize: 18, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
              THE ALPHABET PROJECT
            </div>
            <div style={{ fontSize: 10, color: 'inherit', letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.5 }}>
              26 LETTERS · IN PROGRESS
            </div>
          </div>
        </Link>

        <Link
          href="/lore/gate"
          style={{ textDecoration: 'none', color: 'inherit', display: 'block', marginBottom: 16 }}
        >
          <div
            style={{ border: '1px solid #000', padding: '28px 32px', textAlign: 'center', cursor: 'pointer', transition: 'background 0.12s, color 0.12s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#000'; (e.currentTarget as HTMLDivElement).style.color = '#fff' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = ''; (e.currentTarget as HTMLDivElement).style.color = '' }}
          >
            <div style={{ fontSize: 18, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
              LORE
            </div>
            <div style={{ fontSize: 10, color: 'inherit', letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.5 }}>
              THE CHRONICLE · PASSWORD REQ.
            </div>
          </div>
        </Link>

        <Link
          href="/tongues"
          style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
        >
          <div
            style={{ border: '1px solid #000', padding: '28px 32px', textAlign: 'center', cursor: 'pointer', transition: 'background 0.12s, color 0.12s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#000'; (e.currentTarget as HTMLDivElement).style.color = '#fff' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = ''; (e.currentTarget as HTMLDivElement).style.color = '' }}
          >
            <div style={{ fontSize: 18, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
              TONGUES
            </div>
            <div style={{ fontSize: 10, color: 'inherit', letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.5 }}>
              LANGUAGE FLASHCARDS · PASSWORD REQ.
            </div>
          </div>
        </Link>

      </main>
      <Footer />
    </div>
  )

  // Non-members see the join page
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />

      <main className="page-main">

        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.15em', color: '#C85A5A', textTransform: 'uppercase', marginBottom: 16 }}>
          SEASON 1
        </div>

        <div style={{ border: '1px solid #000', padding: '24px 32px', marginBottom: 24, textAlign: 'center' }}>
          <span style={{ fontSize: 22, letterSpacing: '0.2em', textTransform: 'uppercase' }}>THE ALPHABET PROJECT</span>
        </div>

        <div style={{ border: '1px solid #000', padding: '28px 32px', marginBottom: 24 }}>
          <div style={{ fontSize: 18, letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'center', marginBottom: 24 }}>RULES</div>
          {RULES.map(([title, desc], i) => (
            <div key={i} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, marginBottom: 4 }}>
                <strong>{i + 1}. {title}</strong>
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.7 }}>{desc}</div>
            </div>
          ))}
        </div>

        {registrationOpen ? (
          <button
            onClick={handleJoin}
            disabled={joining}
            style={{
              display: 'block', width: '100%', background: '#C85A5A', color: '#fff',
              border: 'none', padding: '20px', fontSize: 15, fontWeight: 700,
              letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {joining ? '...' : 'GET AMONGST'}
          </button>
        ) : (
          <div style={{ border: '1px solid #999', padding: '20px', textAlign: 'center', fontSize: 13, color: '#666', letterSpacing: '0.05em' }}>
            Registration is now closed.
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

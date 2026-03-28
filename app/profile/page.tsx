'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Nav from '@/components/layout/Nav'

const ALPHABET_PROJECT_ID = '00000000-0000-0000-0000-000000000001'

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

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: prof } = await supabase.from('users').select('*').eq('id', session.user.id).single()
      setProfile(prof)
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

  const memberNum = String(profile?.member_number ?? '00').padStart(2, '0')

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />

      <main style={{ flex: 1, padding: '28px 40px 0', maxWidth: 900, width: '100%', margin: '0 auto' }}>

        {/* GO BACK + PROFILE heading */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 20, marginBottom: 20 }}>
          <Link
            href={`/groups/${ALPHABET_PROJECT_ID}`}
            style={{ fontSize: 11, color: '#999', letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none' }}
          >
            GO BACK
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#C85A5A', letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0 }}>
            PROFILE
          </h1>
        </div>

        {/* Profile card */}
        <div style={{ border: '1px solid #000', padding: '60px 32px 40px', marginBottom: 0 }}>

          <div style={{ marginBottom: 20 }}>
            <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: 12 }}>YOUR EMAIL:...</span>
            <span style={{ fontSize: 13, borderBottom: '1px solid #000', display: 'inline-block', minWidth: 260, paddingBottom: 2 }}>
              {profile?.email}
            </span>
          </div>

          <div style={{ marginBottom: 48 }}>
            <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: 12 }}>YOUR PASSWORD:</span>
            <span style={{ fontSize: 13, borderBottom: '1px solid #000', display: 'inline-block', minWidth: 260, paddingBottom: 2, letterSpacing: '0.3em' }}>
              ••••••••
            </span>
          </div>

          {/* Member number Venn */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase' }}>MEMBER #</div>
            <svg width="120" height="88" viewBox="0 0 120 88" fill="none">
              <circle cx="40" cy="44" r="34" stroke="#000" strokeWidth="0.75" />
              <circle cx="80" cy="44" r="34" stroke="#000" strokeWidth="0.75" />
              <text x="60" y="50" textAnchor="middle" fill="#C85A5A" fontSize="18" fontFamily="Inconsolata, monospace" fontWeight="400">
                {memberNum}
              </text>
            </svg>
          </div>
        </div>

        {/* CHANGE PASSWORD button */}
        <Link
          href="/forgot-password"
          style={{
            display: 'block', width: '100%', background: '#000', color: '#fff',
            textAlign: 'center', padding: '18px', fontSize: 15, fontWeight: 700,
            letterSpacing: '0.2em', textTransform: 'uppercase', textDecoration: 'none',
          }}
        >
          CHANGE PASSWORD
        </Link>
      </main>

      <Footer />
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Nav from '@/components/layout/Nav'

const ALPHABET_PROJECT_ID = '00000000-0000-0000-0000-000000000001'


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

      <main className="page-main">

        {/* PROFILE heading — centred, GO BACK absolute left */}
        <div style={{ position: 'relative', textAlign: 'center', marginBottom: 20 }}>
          <Link
            href={`/groups/${ALPHABET_PROJECT_ID}`}
            style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#999', letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none' }}
          >
            GO BACK
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#C85A5A', letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0, fontFamily: 'inherit' }}>
            PROFILE
          </h1>
        </div>

        {/* Profile card — two columns */}
        <div style={{ border: '1px solid #000', padding: '40px 32px', marginBottom: 0, display: 'flex', gap: 0 }}>

          {/* Left: email / password / member# */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
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

            {/* Member number Venn — centred, width matches content above */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>MEMBER #</div>
              <svg width="100%" viewBox="0 0 240 110" fill="none" style={{ maxWidth: 300 }}>
                <circle cx="96" cy="55" r="48" stroke="#000" strokeWidth="0.75" />
                <circle cx="144" cy="55" r="48" stroke="#000" strokeWidth="0.75" />
                <text x="120" y="62" textAnchor="middle" fill="#C85A5A" fontSize="16" fontFamily="Inconsolata, monospace" fontWeight="400">
                  {memberNum}
                </text>
              </svg>
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: 1, background: '#eee', margin: '0 32px' }} />

          {/* Right: Saturn symbol centred */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/saturn.svg" alt="Saturn symbol" style={{ width: '55%', height: 'auto', display: 'block' }} />
          </div>
        </div>

        {/* CHANGE PASSWORD button */}
        <Link href="/forgot-password" className="btn-black" style={{ display: 'block', width: '100%', padding: '18px', fontSize: 15 }}>
          CHANGE PASSWORD
        </Link>
      </main>

    </div>
  )
}

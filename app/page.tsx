import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const ALPHABET_PROJECT_ID = '00000000-0000-0000-0000-000000000001'

function PreAuthHeader({ title }: { title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '28px 40px 0', gap: 16 }}>
      <div style={{ flex: 1, height: 1, background: '#000' }} />
      <span style={{ fontSize: 15, letterSpacing: '0.22em', fontWeight: 400, whiteSpace: 'nowrap' }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: '#000' }} />
    </div>
  )
}

function Footer() {
  return (
    <footer style={{ textAlign: 'center', padding: '60px 0 32px' }}>
      <svg width="260" height="100" viewBox="0 0 260 100" fill="none" style={{ display: 'block', margin: '0 auto' }}>
        <circle cx="96" cy="50" r="44" stroke="#000" strokeWidth="0.8" />
        <circle cx="164" cy="50" r="44" stroke="#000" strokeWidth="0.8" />
        <text x="130" y="55" textAnchor="middle" fontFamily="Inconsolata, monospace" fontSize="14" fill="#000" letterSpacing="1">MOUNTFORD-GAMBOSI</text>
      </svg>
    </footer>
  )
}

export default async function LandingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: membership } = await supabase
      .from('group_members').select('group_id')
      .eq('group_id', ALPHABET_PROJECT_ID).eq('user_id', user.id).maybeSingle()
    if (membership) redirect(`/groups/${ALPHABET_PROJECT_ID}`)
    else redirect('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PreAuthHeader title="OH MY WORD" />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 40px 0', maxWidth: 800, width: '100%', margin: '0 auto' }}>
        {/* Saturn symbol card */}
        <div style={{ border: '1px solid #000', width: '100%', height: 'min(55vh, 480px)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <img src="/saturn.svg" alt="Saturn symbol" style={{ height: '65%', width: 'auto', display: 'block' }} />
        </div>

        {/* COME IN button */}
        <Link
          href="/dashboard"
          style={{
            display: 'block', width: '100%', background: '#C85A5A', color: '#fff',
            textAlign: 'center', padding: '18px', fontSize: 15, fontWeight: 700,
            letterSpacing: '0.2em', textTransform: 'uppercase', textDecoration: 'none',
          }}
        >
          COME IN
        </Link>
      </main>

      <Footer />
    </div>
  )
}

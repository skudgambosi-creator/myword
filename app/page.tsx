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
    <footer style={{ textAlign: 'center', padding: '48px 0 28px' }}>
      <span style={{ fontSize: 12, color: '#ccc', letterSpacing: '0.18em' }}>MOUNTFORD-GAMBOSI</span>
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
        <Link href="/dashboard" className="btn-accent" style={{ display: 'block', width: '100%', padding: '18px', fontSize: 15 }}>
          COME IN
        </Link>
      </main>

      <Footer />
    </div>
  )
}

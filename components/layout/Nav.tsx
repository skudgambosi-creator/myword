'use client'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function Nav() {
  const supabase = createClient()
  return (
    <nav style={{
      display: 'flex', alignItems: 'center',
      padding: '20px 40px', gap: 0,
    }}>
      <Link href="/profile" style={{
        fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
        textDecoration: 'none', color: '#000', whiteSpace: 'nowrap',
      }}>
        PROFILE
      </Link>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 20, margin: '0 20px' }}>
        <div style={{ flex: 1, height: 1, background: '#000' }} />
        <Link href="/dashboard" style={{
          fontSize: 18, fontWeight: 700, letterSpacing: '0.2em',
          textDecoration: 'none', color: '#000', textTransform: 'uppercase', whiteSpace: 'nowrap',
        }}>
          MY WORD
        </Link>
        <div style={{ flex: 1, height: 1, background: '#000' }} />
      </div>
      <button
        onClick={async () => { await supabase.auth.signOut(); window.location.href = '/' }}
        style={{
          fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
          background: 'none', border: 'none', cursor: 'pointer', color: '#000',
          whiteSpace: 'nowrap', padding: 0, fontFamily: 'inherit',
        }}
      >
        SIGN OUT
      </button>
    </nav>
  )
}

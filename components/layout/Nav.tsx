'use client'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function Nav() {
  const supabase = createClient()
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <nav className="site-nav" style={{
      display: 'flex', alignItems: 'center', padding: '0 16px', height: 48,
      borderBottom: '1px solid #000', gap: 8,
    }}>
      {/* Left */}
      <div style={{ flexShrink: 0 }}>
        <Link href="/profile" className="pill-hover" style={{
          fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700,
          whiteSpace: 'nowrap',
        }}>
          PROFILE
        </Link>
      </div>

      {/* Centre brand — flex-based, lines shrink on mobile */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 8, minWidth: 0,
      }}>
        <div style={{ flex: 1, height: 1, background: '#000', minWidth: 0 }} />
        <Link href="/dashboard" className="brand-hover" style={{
          flexShrink: 0, fontSize: 15, letterSpacing: '0.22em', fontWeight: 400,
          textDecoration: 'none', color: '#000', whiteSpace: 'nowrap',
        }}>
          MY WORD
        </Link>
        <div style={{ flex: 1, height: 1, background: '#000', minWidth: 0 }} />
      </div>

      {/* Right */}
      <div style={{ flexShrink: 0, display: 'flex', gap: 0 }}>
        <Link href="/about" className="pill-hover" style={{
          fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700,
          whiteSpace: 'nowrap',
        }}>
          ABOUT
        </Link>
        <button
          onClick={handleSignOut}
          className="pill-hover"
          style={{
            fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700,
            background: 'none', border: 'none', fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}
        >
          SIGN OUT
        </button>
      </div>
    </nav>
  )
}

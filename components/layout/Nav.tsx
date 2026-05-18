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
      display: 'flex', alignItems: 'center', position: 'relative', height: 48,
    }}>
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Link href="/profile" className="pill-hover" style={{
          fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700,
          whiteSpace: 'nowrap',
        }}>
          PROFILE
        </Link>
      </div>

      {/* Centre brand — absolutely positioned for true centring */}
      <div style={{
        position: 'absolute', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: 16, pointerEvents: 'none',
      }}>
        <div style={{ height: 1, width: 80, background: '#000', pointerEvents: 'none' }} />
        <Link href="/dashboard" className="brand-hover" style={{
          fontSize: 15, letterSpacing: '0.22em', fontWeight: 400,
          whiteSpace: 'nowrap', pointerEvents: 'auto',
        }}>
          MY WORD
        </Link>
        <div style={{ height: 1, width: 80, background: '#000', pointerEvents: 'none' }} />
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
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

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
        <Link href="/profile" style={{
          fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700,
          textDecoration: 'none', color: '#000', whiteSpace: 'nowrap', padding: '4px 8px',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#000'; (e.currentTarget as HTMLAnchorElement).style.color = '#fff' }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = ''; (e.currentTarget as HTMLAnchorElement).style.color = '#000' }}
        >
          PROFILE
        </Link>
      </div>

      {/* Centre brand — absolutely positioned for true centring */}
      <div style={{
        position: 'absolute', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: 16, pointerEvents: 'none',
      }}>
        <div style={{ height: 1, width: 80, background: '#000', pointerEvents: 'none' }} />
        <Link href="/dashboard" style={{
          fontSize: 15, letterSpacing: '0.22em', fontWeight: 400,
          textDecoration: 'none', color: '#000', background: 'transparent',
          whiteSpace: 'nowrap', pointerEvents: 'auto',
        }}>
          MY WORD
        </Link>
        <div style={{ height: 1, width: 80, background: '#000', pointerEvents: 'none' }} />
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 'auto' }}>
        <Link href="/about" style={{
          fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700,
          textDecoration: 'none', color: '#000', whiteSpace: 'nowrap', padding: '4px 8px',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#000'; (e.currentTarget as HTMLAnchorElement).style.color = '#fff' }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = ''; (e.currentTarget as HTMLAnchorElement).style.color = '#000' }}
        >
          ABOUT
        </Link>
        <button
          onClick={handleSignOut}
          style={{
            fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
            background: 'none', border: 'none', cursor: 'pointer', color: '#000',
            whiteSpace: 'nowrap', padding: 0, fontFamily: 'inherit',
          }}
        >
          SIGN OUT
        </button>
      </div>
    </nav>
  )
}

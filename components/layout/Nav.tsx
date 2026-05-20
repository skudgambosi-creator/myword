'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function Nav() {
  const supabase = createClient()
  const [hasUnresponded, setHasUnresponded] = useState(false)

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/envelope/mutuals')
      if (!res.ok) return
      const mutuals = await res.json()
      setHasUnresponded(mutuals.some((m: any) => !m.my_clue))
    }
    check()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <nav className="site-nav" style={{
      display: 'flex', alignItems: 'center', height: 48, gap: 8,
    }}>
      {/* Left */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
        <Link href="/profile" className="pill-hover" style={{
          fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700,
          whiteSpace: 'nowrap',
        }}>
          PROFILE
        </Link>
        {hasUnresponded && (
          <span style={{ fontSize: 12, color: '#C85A5A', lineHeight: 1 }} title="You have unread envelopes">✉</span>
        )}
      </div>

      {/* Centre brand — flex-based, lines shrink on mobile */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 8, minWidth: 0,
      }}>
        <div style={{ flex: 1, height: 1, background: '#000', minWidth: 0 }} />
        <Link href="/dashboard" className="brand-hover" style={{
          flexShrink: 0, fontSize: 15, letterSpacing: '0.22em', fontWeight: 400,
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

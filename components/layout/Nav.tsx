'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import FeedbackWidget from '@/components/FeedbackWidget'

export default function Nav() {
  const supabase = createClient()
  const [hasUnresponded, setHasUnresponded] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

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

  // Reflect whatever the blocking init script (in app/layout.tsx) already
  // set on <html>, so the icon matches on first paint.
  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme')
    if (current === 'dark' || current === 'light') setTheme(current)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    try { localStorage.setItem('myword-theme', next) } catch {}
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <nav className="site-nav" style={{
      position: 'relative', display: 'flex', alignItems: 'center', height: 48,
    }}>
      {/* Left — mirrors the right cluster: two pills, plus the unread-envelope dot */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 0 }}>
        <Link href="/profile" className="pill-hover" style={{
          fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700,
          whiteSpace: 'nowrap',
        }}>
          PROFILE
        </Link>
        <FeedbackWidget />
        {hasUnresponded && (
          <span style={{ fontSize: 12, color: '#C85A5A', lineHeight: 1, marginLeft: 4 }} title="You have unread envelopes">✉</span>
        )}
      </div>

      {/* Centre brand — absolutely pinned to the nav midpoint */}
      <div style={{
        position: 'absolute', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'none',
      }}>
        <div style={{ width: 32, height: 1, background: '#000' }} />
        <Link href="/dashboard" className="brand-hover" style={{
          pointerEvents: 'auto', flexShrink: 0, fontSize: 15, letterSpacing: '0.22em', fontWeight: 400,
        }}>
          MY WORD
        </Link>
        <div style={{ width: 32, height: 1, background: '#000' }} />
      </div>

      {/* Right */}
      <div style={{ marginLeft: 'auto', flexShrink: 0, display: 'flex', gap: 0 }}>
        <Link href="/about" className="pill-hover pill-hover-accent" style={{
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
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            lineHeight: 1, padding: '0 0 0 12px', color: '#000',
          }}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </div>
    </nav>
  )
}

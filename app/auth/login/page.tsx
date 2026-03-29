'use client'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function Header({ title }: { title: string }) {
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
        <text x="120" y="53" textAnchor="start" fontFamily="Inconsolata, monospace" fontSize="11" fill="#000" letterSpacing="1">MOUNTFORD-GAMBOSI</text>
      </svg>
    </footer>
  )
}

export default function LoginPage() {
  const supabase = createClient()
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    const email = emailRef.current?.value ?? ''
    const password = passwordRef.current?.value ?? ''
    if (!email || !password) { setError('Please enter your email and password'); return }
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    if (!data.session) { setError('Login succeeded but no session was created — contact support.'); setLoading(false); return }
    window.location.href = '/dashboard'
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header title="OH MY WORD" />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 40px 0', maxWidth: 800, width: '100%', margin: '0 auto' }}>

        {/* Saturn symbol card */}
        <div style={{ border: '1px solid #000', width: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <svg viewBox="0 0 200 285" fill="none" style={{ height: '65%', width: 'auto', display: 'block' }} xmlns="http://www.w3.org/2000/svg">
            {/* Crossbar */}
            <rect x="22" y="55" width="122" height="16" rx="3" fill="#C85A5A" />
            {/* Vertical stem */}
            <rect x="64" y="55" width="16" height="88" fill="#C85A5A" />
            {/* Main sickle curve */}
            <path
              d="M 72 143 C 138 140 164 164 161 202 C 158 238 124 262 76 260 C 42 259 18 238 22 214"
              stroke="#C85A5A" strokeWidth="16" strokeLinecap="round" fill="none"
            />
            {/* Bottom curl */}
            <path
              d="M 22 214 C 6 192 14 170 36 177 C 58 184 60 214 44 220"
              stroke="#C85A5A" strokeWidth="15" strokeLinecap="round" fill="none"
            />
          </svg>
        </div>

        {/* Login form card */}
        <div style={{ border: '1px solid #000', width: '100%', padding: '28px 32px', marginBottom: 16 }}>
          {error && (
            <div style={{ color: '#C85A5A', fontSize: 12, marginBottom: 16, letterSpacing: '0.05em' }}>{error}</div>
          )}
          <div style={{ marginBottom: 20 }}>
            <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: 12 }}>YOUR EMAIL:...</span>
            <input
              ref={emailRef}
              type="email"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{ border: 'none', borderBottom: '1px solid #000', outline: 'none', fontSize: 13, width: 'calc(100% - 160px)', fontFamily: 'inherit', background: 'transparent', color: '#C85A5A' }}
            />
          </div>
          <div>
            <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: 12 }}>YOUR PASSWORD:</span>
            <input
              ref={passwordRef}
              type="password"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{ border: 'none', borderBottom: '1px solid #000', outline: 'none', fontSize: 13, width: 'calc(100% - 160px)', fontFamily: 'inherit', background: 'transparent', color: '#C85A5A' }}
            />
          </div>
        </div>

        {/* COME IN button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            display: 'block', width: '100%', background: '#C85A5A', color: '#fff',
            border: 'none', padding: '18px', fontSize: 15, fontWeight: 700,
            letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer',
            fontFamily: 'inherit', marginBottom: 16,
          }}
        >
          {loading ? '...' : 'COME IN'}
        </button>

        <p style={{ fontSize: 11, color: '#999', letterSpacing: '0.05em', textAlign: 'center' }}>
          No account?{' '}
          <Link href="/register" style={{ color: '#000', textDecoration: 'underline' }}>Create one</Link>
          {' · '}
          <Link href="/forgot-password" style={{ color: '#000', textDecoration: 'underline' }}>Forgot password?</Link>
        </p>
      </main>

      <Footer />
    </div>
  )
}

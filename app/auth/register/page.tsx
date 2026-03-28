'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
      <svg width="240" height="120" viewBox="0 0 300 150" fill="none" style={{ display: 'block', margin: '0 auto' }}>
        <circle cx="105" cy="75" r="68" stroke="#000" strokeWidth="0.8" />
        <circle cx="195" cy="75" r="68" stroke="#000" strokeWidth="0.8" />
        <text x="150" y="80" textAnchor="middle" fontFamily="Inconsolata, monospace" fontSize="12" fill="#000" letterSpacing="1">MOUNTFORD-GAMBOSI</text>
      </svg>
    </footer>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!email || !password) return setError('Please fill in both fields')
    if (password.length < 6) return setError('Password must be at least 6 characters')
    setLoading(true)
    setError('')
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
      if (authError) throw authError
      if (!authData.user) throw new Error('No user returned')

      const { error: profileError } = await supabase.from('users').insert({
        id: authData.user.id,
        email,
        display_name: '',
        identity_mode: 'anonymous',
        avatar_storage_path: null,
      })
      if (profileError) throw profileError

      await fetch('/api/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      router.push('/dashboard')
      router.refresh()
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header title="MY WORD" />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 40px 0', maxWidth: 800, width: '100%', margin: '0 auto' }}>

        {/* Form card */}
        <div style={{ border: '1px solid #000', width: '100%', padding: '60px 32px 40px', marginBottom: 0 }}>
          {error && (
            <div style={{ color: '#C85A5A', fontSize: 12, marginBottom: 20, letterSpacing: '0.05em' }}>{error}</div>
          )}

          <div style={{ marginBottom: 20 }}>
            <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: 12 }}>YOUR EMAIL:...</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ border: 'none', borderBottom: '1px solid #000', outline: 'none', fontSize: 13, width: 'calc(100% - 160px)', fontFamily: 'inherit', background: 'transparent' }}
            />
          </div>
          <div style={{ marginBottom: 48 }}>
            <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: 12 }}>YOUR PASSWORD:</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={{ border: 'none', borderBottom: '1px solid #000', outline: 'none', fontSize: 13, width: 'calc(100% - 160px)', fontFamily: 'inherit', background: 'transparent' }}
            />
          </div>

          {/* Venn diagram */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <svg width="100" height="72" viewBox="0 0 100 72" fill="none">
              <circle cx="33" cy="36" r="28" stroke="#000" strokeWidth="0.75" />
              <circle cx="67" cy="36" r="28" stroke="#000" strokeWidth="0.75" />
            </svg>
          </div>
        </div>

        {/* CREATE ACCOUNT button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            display: 'block', width: '100%', background: '#000', color: '#fff',
            border: 'none', padding: '18px', fontSize: 15, fontWeight: 700,
            letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer',
            fontFamily: 'inherit', marginBottom: 16,
          }}
        >
          {loading ? '...' : 'CREATE ACCOUNT'}
        </button>

        <p style={{ fontSize: 11, color: '#999', letterSpacing: '0.05em', textAlign: 'center' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#000', textDecoration: 'underline' }}>Come in</Link>
        </p>
      </main>

      <Footer />
    </div>
  )
}

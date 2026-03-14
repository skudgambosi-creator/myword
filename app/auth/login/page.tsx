'use client'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    const email = emailRef.current?.value ?? ''
    const password = passwordRef.current?.value ?? ''

    if (!email || !password) {
      setError('Please enter your email and password')
      return
    }

    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (!data.session) {
      setError('Login succeeded but no session was created — contact support.')
      setLoading(false)
      return
    }

    window.location.href = '/dashboard'
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav className="nav">
        <Link href="/" className="nav-brand">[ MY WORD ]</Link>
      </nav>

      <div className="page-container" style={{ paddingTop: 48, maxWidth: 480 }}>
        <h1 className="page-title">Log In</h1>

        <div className="box">
          <div className="box-header">SIGN IN TO MY WORD</div>
          <div style={{ padding: '20px 0 0' }}>
            {error && (
              <div style={{ border: '2px solid #CC0000', padding: '8px 12px', marginBottom: 16, fontSize: 13, color: '#CC0000' }}>
                {error}
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label className="field-label">Email Address</label>
              <input ref={emailRef} className="field-input" type="email"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="your@email.com" />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label className="field-label">Password</label>
              <input ref={passwordRef} className="field-input" type="password"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••" />
            </div>
            <button className="btn btn-accent" style={{ width: '100%' }}
              onClick={handleLogin} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </div>
        </div>

        <p style={{ marginTop: 20, fontSize: 13, textAlign: 'center' }}>
          No account? <Link href="/register">Create one</Link> · <Link href="/forgot-password">Forgot password?</Link>
        </p>
      </div>
    </div>
  )
}

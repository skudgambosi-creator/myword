'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!email) return setError('Please enter your email')
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/auth/reset-password`,
    })
    setLoading(false)
    if (err) return setError(err.message)
    setSent(true)
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav className="nav">
        <Link href="/" className="nav-brand">[ MY WORD ]</Link>
      </nav>
      <div className="page-container" style={{ paddingTop: 48, maxWidth: 520 }}>
        <h1 className="page-title">Reset Password</h1>

        {sent ? (
          <div className="box">
            <div className="box-header">CHECK YOUR EMAIL</div>
            <div style={{ padding: '20px 0 0', fontSize: 14, color: '#555', lineHeight: 1.7 }}>
              <p>We've sent a password reset link to <strong>{email}</strong>.</p>
              <p>Check your inbox and follow the link to set a new password.</p>
            </div>
          </div>
        ) : (
          <div className="box">
            <div className="box-header">FORGOT PASSWORD</div>
            <div style={{ padding: '20px 0 0' }}>
              {error && (
                <div style={{ border: '2px solid #CC0000', padding: '8px 12px', marginBottom: 16, fontSize: 13, color: '#CC0000' }}>
                  {error}
                </div>
              )}
              <div style={{ marginBottom: 24 }}>
                <label className="field-label">Email Address</label>
                <input className="field-input" type="email" value={email}
                  onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
              </div>
              <button className="btn btn-accent" style={{ width: '100%' }}
                disabled={loading} onClick={handleSubmit}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>
          </div>
        )}

        <p style={{ marginTop: 20, fontSize: 13, textAlign: 'center' }}>
          <Link href="/login">← Back to login</Link>
        </p>
      </div>
    </div>
  )
}

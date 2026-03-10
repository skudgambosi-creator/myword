'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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

      // Send welcome email
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
    <div style={{ minHeight: '100vh' }}>
      <nav className="nav">
        <Link href="/" className="nav-brand">[ MY WORD ]</Link>
      </nav>

      <div className="page-container" style={{ paddingTop: 48, maxWidth: 520 }}>
        <h1 className="page-title">Create Account</h1>

        {error && (
          <div style={{ border: '2px solid #CC0000', padding: '8px 12px', marginBottom: 16, fontSize: 13, color: '#CC0000' }}>
            {error}
          </div>
        )}

        <div className="box">
          <div className="box-header">JOIN THE ALPHABET PROJECT</div>
          <div style={{ padding: '20px 0 0' }}>
            <div style={{ marginBottom: 16 }}>
              <label className="field-label">Email Address</label>
              <input className="field-input" type="email" value={email}
                onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label className="field-label">Password</label>
              <input className="field-input" type="password" value={password}
                onChange={e => setPassword(e.target.value)} placeholder="minimum 6 characters"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            </div>
            <button className="btn btn-accent" style={{ width: '100%' }}
              disabled={loading}
              onClick={handleSubmit}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </div>
        </div>

        <p style={{ marginTop: 20, fontSize: 13, textAlign: 'center' }}>
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </div>
    </div>
  )
}

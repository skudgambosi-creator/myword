'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!password || !confirm) return setError('Please fill in both fields')
    if (password.length < 6) return setError('Password must be at least 6 characters')
    if (password !== confirm) return setError('Passwords do not match')
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) return setError(err.message)
    router.push('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav className="nav">
        <Link href="/" className="nav-brand">[ MY WORD ]</Link>
      </nav>
      <div className="page-container" style={{ paddingTop: 48, maxWidth: 520 }}>
        <h1 className="page-title">New Password</h1>

        <div className="box">
          <div className="box-header">SET NEW PASSWORD</div>
          <div style={{ padding: '20px 0 0' }}>
            {error && (
              <div style={{ border: '2px solid #CC0000', padding: '8px 12px', marginBottom: 16, fontSize: 13, color: '#CC0000' }}>
                {error}
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label className="field-label">New Password</label>
              <input className="field-input" type="password" value={password}
                onChange={e => setPassword(e.target.value)} placeholder="minimum 6 characters" />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label className="field-label">Confirm Password</label>
              <input className="field-input" type="password" value={confirm}
                onChange={e => setConfirm(e.target.value)} placeholder="repeat your password"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            </div>
            <button className="btn btn-accent" style={{ width: '100%' }}
              disabled={loading} onClick={handleSubmit}>
              {loading ? 'Updating...' : 'Set New Password'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

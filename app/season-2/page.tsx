'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Nav from '@/components/layout/Nav'

export default function Season2Page() {
  const router = useRouter()
  const supabase = createClient()
  const [checking, setChecking] = useState(true)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setChecking(false)
    })
  }, [])

  const handleSubmit = async () => {
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/season-interest', { method: 'POST' })
      if (!res.ok) throw new Error()
      setSent(true)
    } catch {
      setError('Something went wrong. Try again in a bit.')
    } finally {
      setSending(false)
    }
  }

  if (checking) return (
    <div style={{ minHeight: '100vh' }}>
      <Nav />
      <div style={{ padding: '40px', fontSize: 13, color: '#999' }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />
      <main className="page-main">

        <div style={{ position: 'relative', textAlign: 'center', marginBottom: 20 }}>
          <Link
            href="/dashboard"
            className="pill-hover"
            style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}
          >
            GO BACK
          </Link>
        </div>

        <div style={{ border: '1px solid #000', padding: '28px 32px', textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 18, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
            THE ALPHABET PROJECT
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#C85A5A', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
            SEASON 2
          </div>
          <div style={{ fontSize: 13, color: '#000' }}>
            01/01/2027
          </div>
        </div>

        {error && (
          <div style={{ color: '#C85A5A', fontSize: 12, textAlign: 'center', marginBottom: 16 }}>{error}</div>
        )}

        {sent ? (
          <div style={{ border: '1px solid #000', padding: '18px', textAlign: 'center', fontSize: 13 }}>
            You&apos;re on the list.
          </div>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={sending}
            className="btn-black"
            style={{ display: 'block', width: '100%', padding: '18px', fontSize: 15, border: '1px solid #000', background: '#000', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.1em', textTransform: 'uppercase' }}
          >
            {sending ? '...' : 'YOZA'}
          </button>
        )}
      </main>
    </div>
  )
}

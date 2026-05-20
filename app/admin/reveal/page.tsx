'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Nav from '@/components/layout/Nav'

export default function RevealPage() {
  const supabase = createClient()
  const router = useRouter()
  const [authorised, setAuthorised] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email === 'evoelemoyne@gmail.com') {
        setAuthorised(true)
      } else {
        router.replace('/dashboard')
      }
    })
  }, [])

  const triggerReveal = async () => {
    setStatus('loading')
    setMessage('')
    try {
      const res = await fetch('/admin/reveal', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setStatus('success')
        setMessage('Week revealed. Submissions locked, scores set, emails sent.')
      } else {
        setStatus('error')
        setMessage(data?.error || 'Something went wrong. Status: ' + res.status)
      }
    } catch (e: any) {
      setStatus('error')
      setMessage(e.message)
    }
  }

  if (!authorised) return null

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />
      <main className="page-main">

        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.15em', color: '#C85A5A', textTransform: 'uppercase', marginBottom: 16 }}>
          ADMIN
        </div>

        <div style={{ border: '1px solid #000', padding: '28px 32px', marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 20 }}>
            TRIGGER REVEAL
          </div>

          <div style={{
            fontSize: 12,
            lineHeight: 1.8,
            color: '#C85A5A',
            border: '1px solid #C85A5A',
            padding: '14px 18px',
            marginBottom: 24,
          }}>
            Warning: This will lock all submissions for the current week, calculate scores, and send the reveal email to all members. This cannot be undone.
          </div>

          <button
            onClick={triggerReveal}
            disabled={status === 'loading' || status === 'success'}
            style={{
              background: status === 'loading' || status === 'success' ? '#999' : '#C85A5A',
              color: '#fff',
              border: 'none',
              padding: '14px 28px',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: status === 'loading' || status === 'success' ? 'default' : 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.12s',
            }}
          >
            {status === 'loading' ? 'REVEALING...' : 'TRIGGER REVEAL'}
          </button>

          {message && (
            <div style={{
              marginTop: 20,
              fontSize: 12,
              lineHeight: 1.7,
              color: status === 'success' ? '#000' : '#C85A5A',
              border: `1px solid ${status === 'success' ? '#000' : '#C85A5A'}`,
              padding: '12px 16px',
            }}>
              {message}
            </div>
          )}
        </div>

      </main>
    </div>
  )
}

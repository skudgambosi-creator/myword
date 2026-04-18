'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Nav from '@/components/layout/Nav'

function LoreFooter() {
  return (
    <footer style={{ textAlign: 'center', padding: '48px 0 28px' }}>
      <span style={{ fontSize: 11, color: '#ccc', letterSpacing: '0.18em' }}>POGOSI-GAMBOSI</span>
    </footer>
  )
}

export default function LoreWelcomePage() {
  const router = useRouter()
  const mainSupa = createClient()

  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Verify user is logged in, redirect if not
    mainSupa.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login')
      } else {
        setChecking(false)
      }
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Please enter a character name.')
      return
    }

    setError('')
    setLoading(true)

    const res = await fetch('/api/lore/character', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterName: trimmed }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Something went wrong. Try again.')
      return
    }

    router.push('/lore/dashboard')
  }

  if (checking) return null

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 40px 0', maxWidth: 800, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>

        {/* Hero image */}
        <div style={{ border: '1px solid #000', width: '100%', minHeight: 'min(55vh, 420px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="/lore_dashboard_hero_asset.png" alt="Lore" style={{ width: 'min(340px, 75%)', height: 'auto', display: 'block' }} />
        </div>

        {/* Form box */}
        <div style={{ border: '1px solid #000', borderTop: 'none', width: '100%', padding: '20px 24px', boxSizing: 'border-box' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
              CHOOSE YOUR CHARACTER NAME
            </div>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 12, lineHeight: 1.6 }}>
              This is how you will appear throughout Lore. You can change it at any time from your character profile.
            </div>

            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(e as any) } }}
              placeholder="Your character name..."
              autoComplete="off"
              autoFocus
              style={{
                background: 'none', border: 'none', borderBottom: '1px solid #000',
                padding: '10px 0', fontSize: 15, fontFamily: 'inherit', outline: 'none',
                letterSpacing: '0.1em', textTransform: 'uppercase', width: '100%',
                marginBottom: 8,
              }}
            />

            {error && (
              <div style={{ fontSize: 11, color: '#C85A5A', letterSpacing: '0.04em', marginBottom: 12 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 16, width: '100%', padding: '18px', fontSize: 13, fontWeight: 700,
                letterSpacing: '0.2em', textTransform: 'uppercase', cursor: loading ? 'default' : 'pointer',
                fontFamily: 'inherit', background: 'none',
                border: '1px solid #C85A5A', color: '#C85A5A',
              }}
              onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.background = '#C85A5A'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' } }}
              onMouseLeave={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = '#C85A5A' } }}
            >
              {loading ? '...' : 'ENTER LORE'}
            </button>

          </form>
        </div>

      </main>
      <LoreFooter />
    </div>
  )
}

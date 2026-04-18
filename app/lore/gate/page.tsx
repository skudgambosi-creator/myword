'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

function Footer() {
  return (
    <footer style={{ textAlign: 'center', padding: '48px 0 28px' }}>
      <span style={{ fontSize: 11, color: '#ccc', letterSpacing: '0.18em' }}>POGOSI-GAMBOSI</span>
    </footer>
  )
}

export default function LoreGatePage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/lore/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error)
      return
    }

    router.push('/lore/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '28px 40px 0', gap: 16 }}>
        <div style={{ flex: 1, height: 1, background: '#000' }} />
        <span style={{ fontSize: 15, letterSpacing: '0.22em', fontWeight: 400, whiteSpace: 'nowrap' }}>LORE</span>
        <div style={{ flex: 1, height: 1, background: '#000' }} />
      </div>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 40px 0', maxWidth: 800, width: '100%', margin: '0 auto' }}>

        {/* Hero image */}
        <div style={{ border: '1px solid #000', width: '100%', minHeight: 'min(55vh, 480px)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <img src="/lore-hero.png" alt="Lore" style={{ width: 'min(340px, 75%)', height: 'auto', display: 'block' }} />
        </div>

        {/* Password form */}
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="········"
            autoComplete="off"
            style={{
              width: '100%', background: 'none', border: 'none', borderBottom: '1px solid #000',
              padding: '10px 0', fontSize: 15, fontFamily: 'inherit', outline: 'none',
              letterSpacing: '0.2em', textAlign: 'center', boxSizing: 'border-box',
            }}
          />

          {error && (
            <div style={{ fontSize: 12, color: '#C85A5A', textAlign: 'center', letterSpacing: '0.05em' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '18px', fontSize: 13, fontWeight: 700,
              letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer',
              fontFamily: 'inherit', background: 'none',
              border: '1px solid #C85A5A', color: '#C85A5A',
              transition: 'background 0.12s, color 0.12s',
            }}
            onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = '#C85A5A'; (e.target as HTMLButtonElement).style.color = '#fff' }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = 'none'; (e.target as HTMLButtonElement).style.color = '#C85A5A' }}
          >
            {loading ? '...' : 'ENTER LORE'}
          </button>
        </form>

      </main>

      <Footer />
    </div>
  )
}

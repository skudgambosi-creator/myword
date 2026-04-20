'use client'
import { useState } from 'react'
import Link from 'next/link'

interface Props {
  languageId: string
  displayName: string
  nativeName: string
  description: string
  href: string
  isUnlocked: boolean
  onUnlock: (password: string) => Promise<{ error?: string }>
}

export default function LanguageCard({ languageId, displayName, nativeName, description, href, isUnlocked, onUnlock }: Props) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [unlocked, setUnlocked] = useState(isUnlocked)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await onUnlock(password)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      setPassword('')
    } else {
      setUnlocked(true)
    }
  }

  return (
    <div style={{ border: '1px solid #000', padding: '28px 32px' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>
          {displayName}
        </div>
        <div style={{ fontSize: 13, fontStyle: 'italic', color: '#444', marginBottom: 12 }}>
          {nativeName}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.7, color: '#555' }}>
          {description}
        </div>
      </div>

      {unlocked ? (
        <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
          <button
            style={{
              width: '100%', padding: '16px', fontSize: 13, fontWeight: 700,
              letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer',
              fontFamily: 'inherit', background: '#000', border: '1px solid #000', color: '#fff',
              transition: 'background 0.12s, color 0.12s',
            }}
          >
            ENTER
          </button>
        </Link>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="password"
            autoComplete="off"
            style={{
              width: '100%', background: 'none', border: 'none',
              borderBottom: '1px solid #000',
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
            disabled={loading || !password}
            style={{
              width: '100%', padding: '16px', fontSize: 13, fontWeight: 700,
              letterSpacing: '0.2em', textTransform: 'uppercase', cursor: loading || !password ? 'default' : 'pointer',
              fontFamily: 'inherit', background: 'none',
              border: '1px solid #000', color: '#000',
              opacity: loading || !password ? 0.4 : 1,
              transition: 'opacity 0.12s',
            }}
          >
            {loading ? '...' : 'UNLOCK'}
          </button>
        </form>
      )}
    </div>
  )
}

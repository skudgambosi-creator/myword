'use client'
import { useState } from 'react'

export default function SeasonFeedback({ groupId }: { groupId: string }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSend = async () => {
    if (!text.trim()) return
    setSending(true)
    setError('')
    try {
      const res = await fetch(`/api/groups/${groupId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim() }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Failed to send. Try again.')
      setText('')
      setSent(true)
    } catch (e: any) {
      setError(e.message || 'Failed to send.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ borderTop: '4px solid #000', paddingTop: 24, marginTop: 12 }}>
      <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>
        Before you go
      </div>

      <div style={{ fontSize: 13, lineHeight: 1.8, color: '#333', marginBottom: 20 }}>
        <p style={{ margin: '0 0 12px' }}>
          We've loved every week of this, and we're not done. Season 2 starts next year. Tell us what worked, what didn't, what you'd want to see more of.
        </p>
        <p style={{ margin: '0 0 12px' }}>
          We've also been kicking around the idea of individual prints: just yours, the season's favourites, or the whole lot. Nothing decided yet, but once this season closes, your own alphabet is yours to download, free, forever. Tell us what you'd actually use.
        </p>
        <p style={{ margin: 0 }}>
          Got a language you want in Tongues? Would you rather this lived as an app? Say that too, nothing's off the table.
        </p>
      </div>

      {error && (
        <div style={{ color: '#C85A5A', fontSize: 12, marginBottom: 12 }}>{error}</div>
      )}

      {!sent ? (
        <div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Type here..."
            rows={4}
            disabled={sending}
            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #000', fontFamily: 'inherit', fontSize: 13, padding: 12, resize: 'vertical', marginBottom: 10 }}
          />
          <button
            onClick={handleSend}
            disabled={sending || !text.trim()}
            style={{
              fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
              padding: '10px 22px', background: text.trim() ? '#000' : '#ccc', color: '#fff',
              border: 'none', cursor: text.trim() ? 'pointer' : 'default', fontFamily: 'inherit',
            }}
          >
            {sending ? '...' : 'Send'}
          </button>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>Sent, thank you.</div>
          <button
            onClick={() => setSent(false)}
            style={{
              fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
              border: '1px solid #000', borderRadius: 20, padding: '8px 16px',
              background: '#fff', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Anything else you'd like?
          </button>
        </div>
      )}
    </div>
  )
}

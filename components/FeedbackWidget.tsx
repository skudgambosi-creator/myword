'use client'
import { useState } from 'react'

export default function FeedbackWidget() {
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackSent, setFeedbackSent] = useState(false)

  const handleFeedbackSubmit = async () => {
    if (!feedbackMessage.trim()) return
    setFeedbackLoading(true)
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: feedbackMessage }),
    })
    setFeedbackLoading(false)
    setFeedbackSent(true)
    setFeedbackMessage('')
    setTimeout(() => {
      setFeedbackSent(false)
      setFeedbackOpen(false)
    }, 2500)
  }

  return (
    <>
      <button
        onClick={() => setFeedbackOpen(true)}
        className="pill-hover pill-hover-accent"
        style={{
          fontSize: 11,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontWeight: 700,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
        }}
      >
        FEEDBACK
      </button>

      {feedbackOpen && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setFeedbackOpen(false)}
        >
          <div
            style={{
              background: '#fff',
              border: '1px solid #000',
              padding: '32px 28px',
              width: '100%',
              maxWidth: 480,
              margin: '0 20px',
            }}
            onClick={e => e.stopPropagation()}
          >
            <p style={{ fontSize: 13, lineHeight: 1.8, color: '#333', marginBottom: 20 }}>
              If anything looks cooked, or if you&apos;d like something added, give us a buzz!
            </p>
            <textarea
              value={feedbackMessage}
              onChange={e => setFeedbackMessage(e.target.value)}
              placeholder="Your message"
              rows={5}
              style={{
                width: '100%',
                border: '1px solid #000',
                padding: '10px 12px',
                fontSize: 13,
                fontFamily: 'inherit',
                resize: 'vertical',
                marginBottom: 16,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => setFeedbackOpen(false)}
                style={{
                  fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: '#999', fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleFeedbackSubmit}
                disabled={feedbackLoading}
                style={{
                  fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
                  background: '#000', color: '#fff', border: '1px solid #000',
                  padding: '8px 20px', borderRadius: 20, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {feedbackLoading ? 'Sending...' : 'Send'}
              </button>
            </div>
            {feedbackSent && (
              <p style={{ fontSize: 12, color: '#C85A5A', textAlign: 'center', marginTop: 16 }}>
                Churrrr 🤙
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}

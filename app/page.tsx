import Link from 'next/link'

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <nav className="nav">
        <span className="nav-brand">[ MY WORD ]</span>
      </nav>

      {/* Hero */}
      <main className="page-container" style={{ paddingTop: 60, paddingBottom: 60, flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 40, alignItems: 'start' }}>

          {/* Left: Platform title + CTAs */}
          <div>
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontSize: 48, fontWeight: 'bold', marginBottom: 4, letterSpacing: '-0.02em' }}>
                MY WORD
              </h1>
              <p style={{ fontSize: 14, color: '#999', marginBottom: 32, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Private collaborative writing
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <Link href="/register" className="btn btn-accent">
                  Create Account
                </Link>
                <Link href="/login" className="btn">
                  Log In
                </Link>
              </div>
            </div>

            <hr className="rule" />

            {/* Season 1 callout */}
            <div className="box" style={{ borderLeft: '4px solid #CC0000' }}>
              <div style={{ fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#CC0000', marginBottom: 8 }}>
                Season 1
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 12 }}>
                <span style={{ fontSize: 52, fontWeight: 'bold', lineHeight: 1, color: '#CC0000' }}>A</span>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 'bold' }}>The Alphabet Project</div>
                  <div style={{ fontSize: 12, color: '#666' }}>26 letters · 26 weeks · one piece each</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: '#555', lineHeight: 1.7, margin: 0 }}>
                Each week, a letter. Pick a word. Write whatever it brings up —
                no rules on style or subject. Submissions stay hidden until Wednesday,
                when everyone's pieces are revealed at once.
              </p>
            </div>
          </div>

          {/* Right: How it works */}
          <div>
            <div className="box">
              <div className="box-header">HOW THE ALPHABET PROJECT WORKS</div>
              <div style={{ padding: '16px 0 0' }}>
                {[
                  ['01', 'Join a group', 'An admin invites you. Create your account — choose your name or go anonymous.'],
                  ['02', 'Get the letter', 'Every Wednesday, a new letter is revealed. You have until Tuesday to submit.'],
                  ['03', 'Write something', 'Pick a word beginning with the letter. Write whatever it brings up. Any length, any style.'],
                  ['04', 'Wednesday reveal', 'All submissions unlock at once. A PDF lands in your inbox.'],
                  ['05', '26 weeks later', 'You have a complete collection — yours and everyone else\'s. A to Z.'],
                ].map(([num, title, desc]) => (
                  <div key={num} style={{ display: 'flex', gap: 12, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #eee' }}>
                    <div style={{ fontWeight: 'bold', fontSize: 11, color: '#CC0000', minWidth: 24, paddingTop: 2 }}>{num}</div>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 2 }}>{title}</div>
                      <div style={{ fontSize: 12, color: '#555', lineHeight: 1.6 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom rule */}
        <hr className="rule" style={{ marginTop: 60 }} />
        <p style={{ fontSize: 11, color: '#999', textAlign: 'center' }}>
          MY WORD — PRIVATE GROUPS ONLY
        </p>
      </main>
    </div>
  )
}

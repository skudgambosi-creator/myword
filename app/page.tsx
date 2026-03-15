import Link from 'next/link'

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <nav className="nav">
        <span className="nav-brand">[ MY WORD ]</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/register" className="btn btn-accent">
            Create Account
          </Link>
          <Link href="/login" className="btn">
            Log In
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="page-container" style={{ paddingTop: 32, paddingBottom: 60, flex: 1 }}>

        {/* Season 1 callout */}
        <div className="box" style={{ borderLeft: '4px solid #CC0000', marginBottom: 24 }}>
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
            when everyone's pieces are revealed at once. You can add pictures and sounds too.
          </p>
        </div>

        {/* How it works */}
        <div className="box">
          <div className="box-header">HOW THE ALPHABET PROJECT WORKS</div>
          <div style={{ padding: '16px 0 0' }}>
            {[
              ['1', 'One submission per letter', 'You get one entry per week. You can choose to sign a submission or remain anonymous.'],
              ['2', 'Your word must start with the letter', 'Your title can be any word or phrase — it just has to begin with that week\'s letter.'],
              ['3', 'Edit until Tuesday 23:59', 'You can change your submission at any time before the window closes. After that, it\'s locked.'],
              ['4', 'Hidden until Wednesday', 'Nobody can see anyone else\'s submission until the reveal. Not the title, not the content. You will get an email every Wednesday with the week\'s submissions, in no particular order.'],
              ['5', 'Scoring', 'You score points for keeping your word. Miss a week, miss a point.'],
            ].map(([num, title, desc]) => (
              <div key={num} style={{ display: 'flex', gap: 12, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #eee' }}>
                <div style={{ fontWeight: 'bold', fontSize: 11, color: '#CC0000', minWidth: 24, paddingTop: 2 }}>{num}</div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 2 }}>{title}</div>
                  <div style={{ fontSize: 12, color: '#555', lineHeight: 1.6 }}>{desc}</div>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 12, marginBottom: 4, paddingBottom: 4 }}>
              <div style={{ fontWeight: 'bold', fontSize: 11, color: '#CC0000', minWidth: 24 }}>—</div>
              <div style={{ fontSize: 12, color: '#555', lineHeight: 1.6 }}>
                One last thing. The project will lock on week C. No-one can join after this time. A good secret should stay secret after all.
              </div>
            </div>
          </div>
        </div>

        {/* Bottom rule */}
        <hr className="rule" style={{ marginTop: 60 }} />
        <p style={{ fontSize: 11, color: '#999', textAlign: 'center' }}>
          MOUNTFORD - GAMBOSI
        </p>
      </main>
    </div>
  )
}

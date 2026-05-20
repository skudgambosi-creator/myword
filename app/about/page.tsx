import Nav from '@/components/layout/Nav'

function Footer() {
  return (
    <footer style={{ textAlign: 'center', padding: '48px 0 28px' }}>
      <span style={{ fontSize: 12, color: '#ccc', letterSpacing: '0.18em' }}>GAMBOSI</span>
    </footer>
  )
}

const sectionTitle = {
  textAlign: 'center' as const,
  fontSize: 22,
  letterSpacing: '0.2em',
  textTransform: 'uppercase' as const,
  fontWeight: 700,
  marginBottom: 20,
  marginTop: 48,
}

const signature = {
  textAlign: 'center' as const,
  fontSize: 12,
  letterSpacing: '0.18em',
  color: '#ccc',
  marginTop: 32,
  marginBottom: 8,
}

const para = {
  fontSize: 14,
  lineHeight: 1.9,
  color: '#333',
  marginBottom: 16,
}

const rule = {
  border: 'none' as const,
  borderTop: '1px solid #eee' as const,
  margin: '40px 0',
}

export default function AboutPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />

      <main className="page-main">

        <div style={{ textAlign: 'center', margin: '32px auto 40px' }}>
          <img src="/saturn.svg" alt="My Word" style={{ width: 80, height: 'auto', display: 'inline-block' }} />
        </div>

        <hr style={rule} />

        <h2 style={{ ...sectionTitle, marginTop: 0 }}>SEASONS</h2>

        <p style={para}>The Alphabet Project is a creative writing and word game, running one letter at a time.</p>

        <p style={para}>Once a week, submit a piece of writing, anything you like, as long as you like. You can attach pictures and music too. The only rule: your title has to start with the letter of the week.</p>

        <p style={para}>Everyone is anonymous by default, but you can choose to sign your entry if you like. Once you have submitted, you can't delete it, but you can edit it right up until the weekly cutoff. After that, it locks.</p>

        <p style={para}>You get points for keeping your word. Miss a week, miss a point.</p>

        <p style={para}>On the cutoff date, an email goes out with all of that week's entries, and they unlock here on the submissions view. After 26 weeks, you have got half a year of yourself. Then the next season begins.</p>

        <p style={para}>Something like social media, but with none of the love numbers chubbing up the ego. Just a little honour for a little commitment. Put whatever you like to words, pictures, or sound. Get cheeky, get frank, get whatever. And a small score for your trouble.</p>

        <p style={signature}>MOUNTFORD-GAMBOSI</p>

        <hr style={rule} />

        <h2 style={sectionTitle}>LORE</h2>

        <p style={para}>A shared record of people, moments, and stories, told from inside the timeline by those who lived them.</p>

        <p style={para}>Write what you know. A night out, a festival, a falling out, a thing that happened on a Tuesday. Anchor it to a place and a time and add it to the record. If you were there with someone, they can add their version, or write about what led up to it.</p>

        <p style={para}>Taboo tags let you write about anything you like without it being visible to everyone. A story tagged "drugs" can only be read by people who have either written one with that tag or appear in one. The world takes care of itself.</p>

        <p style={para}>No chats. You can heart as many stories as you like. Whatever has the most hearts at any given moment becomes the golden yarn. Anyone can hit "cap" if they think a story is capping. People referenced in a story can verify the yarn or add their own account of events.</p>

        <p style={para}>Search by map or by tag. You are already anonymous on the website. On Lore you can choose and change your Lore identity at any time. Thrice anonymised.</p>

        <p style={signature}>POGOSI-GAMBOSI</p>

        <hr style={rule} />

        <h2 style={sectionTitle}>TONGUES</h2>

        <p style={para}>Tongues is built for the people.</p>

        <p style={para}>The principle is simple: if you can understand and commit the most commonly used words, sentences, and patterns of a language, you have got the weaponry you need to become fluent. Currently these are flashcard games built on that principle, with more on the way. Conversation games, lessons, and whatever comes next.</p>

        <p style={signature}>GAMBOSI</p>

      </main>

      <Footer />
    </div>
  )
}

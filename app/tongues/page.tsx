'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/layout/Nav'
import LanguageCard from '@/components/tongues/LanguageCard'
import { createClient } from '@/lib/supabase/client'

function Footer() {
  return (
    <footer style={{ textAlign: 'center', padding: '48px 0 28px' }}>
      <span style={{ fontSize: 12, color: '#ccc', letterSpacing: '0.18em' }}>MOUNTFORD-GAMBOSI</span>
    </footer>
  )
}

export default function TonguesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setLoading(false)
    }
    load()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.push('/login')
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh' }}>
      <Nav />
      <div style={{ padding: '40px', fontSize: 13, color: '#999' }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />
      <main className="page-main">

        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: '#555', textTransform: 'uppercase', marginBottom: 16 }}>
          TONGUES
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
            Languages
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: '#555' }}>
            Each language is a standalone flashcard deck — spaced repetition, audio pronunciation, and a full reference guide.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <LanguageCard
            languageId="te-reo"
            displayName="Te Reo Māori"
            nativeName="Te reo o Aotearoa"
            description="The indigenous language of Aotearoa New Zealand. ~200 flashcards covering greetings, pronouns, verbs, nouns, numbers, colours, and full sentence patterns — plus a reference guide with the pronoun system and sentence structure."
            href="/tongues/te-reo"
          />

          <LanguageCard
            languageId="italiano"
            displayName="Italiano"
            nativeName="Lingua italiana"
            description="Italian for everyday use. 250+ flashcards covering greetings, pronouns, verbs, nouns, numbers, colours, days, months, body parts, and full sentence templates — with Google Translate audio on every card."
            href="/tongues/italiano"
          />
        </div>

      </main>
      <Footer />
    </div>
  )
}

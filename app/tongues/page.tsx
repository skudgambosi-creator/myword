'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/layout/Nav'
import LanguageCard from '@/components/tongues/LanguageCard'
import { createClient } from '@/lib/supabase/client'

function Footer() {
  return (
    <footer style={{ textAlign: 'center', padding: '48px 0 28px' }}>
      <span style={{ fontSize: 12, color: '#ccc', letterSpacing: '0.18em' }}>GAMBOSI</span>
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

        <div style={{ position: 'relative', textAlign: 'center', marginBottom: 20 }}>
          <Link
            href="/dashboard"
            className="pill-hover"
            style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}
          >
            GO BACK
          </Link>
          <div style={{ fontSize: 22, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            TONGUES
          </div>
        </div>

        <div style={{ marginBottom: 24, fontSize: 13, lineHeight: 1.7, color: '#555' }}>
          <p style={{ margin: '0 0 12px' }}>Words of the world - language learning games.</p>
          <p style={{ margin: 0 }}>If you can understand and commit the most commonly used words, sentences, and patterns of a language, you have got the weaponry you need to become fluent. Each language has a flashcard deck with audio pronunciation, and a guide to get you chewing the fat with that silver tongue of yours ASAP.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <LanguageCard
            languageId="te-reo"
            displayName="Te Reo Māori"
            nativeName="Te reo o Aotearoa"
            description="The indigenous language of Aotearoa New Zealand. 800+ flashcards covering greetings, pronouns, verbs, nouns, numbers, colours, days, months, tikanga and marae vocabulary, and full sentence patterns, plus a reference guide with the pronoun system, sentence structure, and grammar, and an interactive Converse mode for practicing real back-and-forth exchanges across everyday scenarios."
            href="/tongues/te-reo"
          />

          <LanguageCard
            languageId="italiano"
            displayName="Italiano"
            nativeName="Lingua italiana"
            description="Italian for everyday use. 250+ flashcards covering greetings, pronouns, verbs, nouns, numbers, colours, days, months, body parts, and full sentence templates, with Google Translate audio on every card."
            href="/tongues/italiano"
          />

          <LanguageCard
            languageId="magyar"
            displayName="Magyar"
            nativeName="Magyar nyelv"
            description="Hungarian, a language unrelated to English or Italian, with no grammatical gender but an extensive case system. 270+ flashcards covering greetings, pronouns, verbs, nouns, numbers, colours, days, months, body parts, and full sentence templates, plus a reference guide covering vowel harmony, cases, and sentence structure."
            href="/tongues/magyar"
          />
        </div>

      </main>
      <Footer />
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/layout/Nav'
import TeReoFlashcards from '@/components/tongues/TeReoFlashcards'
import { createClient } from '@/lib/supabase/client'

export default function TeReoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setReady(true)
    }
    check()
  }, [])

  if (!ready) return (
    <div style={{ minHeight: '100vh' }}>
      <Nav />
      <div style={{ padding: '40px', fontSize: 13, color: '#999' }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 600, width: '100%', margin: '0 auto' }}>
        <TeReoFlashcards />
        <div style={{ padding: '24px 20px 32px', fontSize: 12, lineHeight: 1.6, color: '#555', fontFamily: 'Georgia, serif', textAlign: 'center' }}>
          Audio streams from <a href="https://maoridictionary.co.nz" target="_blank" rel="noopener noreferrer" style={{ color: '#111' }}>Te Aka Māori Dictionary</a>, voiced by Te Wharehuia Milroy and Te Haumihiata Mason. Tēnā rawa atu kōrua.
        </div>
      </div>
    </div>
  )
}

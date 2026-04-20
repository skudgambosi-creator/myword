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

      const { data } = await supabase
        .from('tongues_unlocks')
        .select('language_id')
        .eq('user_id', session.user.id)
        .eq('language_id', 'te-reo')
        .maybeSingle()

      if (!data) { router.push('/tongues'); return }
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
      </div>
    </div>
  )
}

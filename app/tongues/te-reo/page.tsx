'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import TeReoApp from '@/components/tongues/TeReoApp'
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

  // Full-screen app: its home screen links back to Tongues.
  if (!ready) return <div style={{ minHeight: '100dvh', background: '#0b0a0d' }} />
  return <TeReoApp />
}

'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function Nav({ userName }: { userName?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="nav">
      <Link href="/dashboard" className="nav-brand">[ MY WORD ]</Link>
      <Link href="/dashboard" className={`nav-link ${pathname === '/dashboard' ? 'active' : ''}`}>
        Dashboard
      </Link>
      <Link href="/profile" className={`nav-link ${pathname === '/profile' ? 'active' : ''}`}>
        Profile
      </Link>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
        {userName && (
          <span style={{ padding: '10px 16px', fontSize: 12, color: '#666', borderLeft: '1px solid #aaa' }}>
            {userName}
          </span>
        )}
        <button
          onClick={handleSignOut}
          className="nav-link"
          style={{ border: 'none', cursor: 'pointer', background: 'none' }}
        >
          Sign Out
        </button>
      </div>
    </nav>
  )
}

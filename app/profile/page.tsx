'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: prof } = await supabase.from('users').select('*').eq('id', session.user.id).single()
      setProfile(prof)
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh' }}>
      <nav className="nav"><Link href="/dashboard" className="nav-brand">[ MY WORD ]</Link></nav>
      <div className="page-container" style={{ paddingTop: 40 }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav className="nav">
        <Link href="/dashboard" className="nav-brand">[ MY WORD ]</Link>
        <Link href="/dashboard" className="nav-link">Dashboard</Link>
        <Link href="/profile" className="nav-link active">Profile</Link>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          <button onClick={async () => {
            await supabase.auth.signOut()
            window.location.href = '/'
          }} className="nav-link" style={{ border: 'none', cursor: 'pointer', background: 'none' }}>
            Sign Out
          </button>
        </div>
      </nav>

      <div className="page-container" style={{ paddingTop: 48, maxWidth: 600 }}>
        <h1 className="page-title">Profile</h1>

        <div className="box" style={{ marginBottom: 24 }}>
          <div className="box-header">YOUR DETAILS</div>
          <div style={{ padding: '20px 0 0' }}>
            {[
              ['Member', `#${profile?.member_number}`],
              ['Email', profile?.email],
              ['Member since', profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric'
              }) : '—'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', gap: 16, padding: '10px 0', borderBottom: '1px solid #eee' }}>
                <div style={{ fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#666', minWidth: 120 }}>{label}</div>
                <div style={{ fontSize: 14 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="box">
          <div className="box-header">PASSWORD</div>
          <div style={{ padding: '20px 0 0' }}>
            <p style={{ fontSize: 13, color: '#555', marginBottom: 16 }}>
              Need to change your password? We'll send a reset link to your email.
            </p>
            <Link href="/forgot-password" className="btn">Reset Password</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)

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

  const displayName = profile?.identity_mode === 'anonymous'
    ? `No-name ${profile.noname_number}` : profile?.display_name

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav className="nav">
        <Link href="/dashboard" className="nav-brand">[ MY WORD ]</Link>
        <Link href="/dashboard" className="nav-link">Dashboard</Link>
        <Link href="/profile" className="nav-link active">Profile</Link>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          <span style={{ padding: '10px 16px', fontSize: 12, color: '#666', borderLeft: '1px solid #aaa' }}>
            {displayName}
          </span>
          <button onClick={async () => {
            await supabase.auth.signOut()
            window.location.href = '/'
          }} className="nav-link" style={{ border: 'none', cursor: 'pointer', background: 'none' }}>
            Sign Out
          </button>
        </div>
      </nav>

      <div className="page-container" style={{ paddingTop: 40, paddingBottom: 60, maxWidth: 580 }}>
        <h1 className="page-title">Profile</h1>

        <div className="box" style={{ marginBottom: 20 }}>
          <div className="box-header">YOUR IDENTITY</div>
          <div style={{ padding: '20px 0 0' }}>
            <table className="grid-table">
              <tbody>
                <tr>
                  <td style={{ fontWeight: 'bold', width: '40%' }}>Display name</td>
                  <td>{displayName}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold' }}>Identity mode</td>
                  <td style={{ textTransform: 'capitalize' }}>{profile?.identity_mode}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold' }}>Email</td>
                  <td>{profile?.email}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 'bold' }}>Member since</td>
                  <td>{new Date(profile?.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="box-shaded" style={{ fontSize: 13, color: '#666' }}>
          <strong>Note:</strong> Your display name and identity mode are permanent choices made at registration. They cannot be changed.
        </div>
      </div>
    </div>
  )
}

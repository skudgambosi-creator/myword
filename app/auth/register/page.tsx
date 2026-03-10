'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ReactCrop, { type Crop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Step 1: credentials
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Step 2: identity
  const [identityMode, setIdentityMode] = useState<'named' | 'anonymous'>('named')
  const [displayName, setDisplayName] = useState('')

  // Step 3: avatar
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>('')
  const [crop, setCrop] = useState<Crop>({ unit: '%', width: 75, height: 100, x: 12.5, y: 0 })
  const imgRef = useRef<HTMLImageElement>(null)

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setAvatarPreview(reader.result as string)
    reader.readAsDataURL(file)
    setAvatarFile(file)
  }

  const getCroppedBlob = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const image = imgRef.current
      if (!image) return reject('No image')
      const canvas = document.createElement('canvas')
      const scaleX = image.naturalWidth / image.width
      const scaleY = image.naturalHeight / image.height
      const pixelCrop = {
        x: (crop.x / 100) * image.width * scaleX,
        y: (crop.y / 100) * image.height * scaleY,
        width: (crop.width / 100) * image.width * scaleX,
        height: (crop.height / 100) * image.height * scaleY,
      }
      canvas.width = pixelCrop.width
      canvas.height = pixelCrop.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height)
      canvas.toBlob((blob) => blob ? resolve(blob) : reject('Failed'), 'image/jpeg', 0.9)
    })
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })
      if (authError) throw authError
      if (!authData.user) throw new Error('No user returned')

      const userId = authData.user.id

      // 2. Upload avatar if provided
      let avatarPath: string | null = null
      if (avatarFile && avatarPreview) {
        const blob = await getCroppedBlob()
        const fileName = `${userId}/avatar.jpg`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true })
        if (!uploadError) avatarPath = fileName
      }

      // 3. Insert user profile
      const { error: profileError } = await supabase.from('users').insert({
        id: userId,
        email,
        display_name: identityMode === 'named' ? displayName : '',
        identity_mode: identityMode,
        avatar_storage_path: avatarPath,
      })
      if (profileError) throw profileError

      router.push('/dashboard')
      router.refresh()
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav className="nav">
        <Link href="/" className="nav-brand">[ MY WORD ]</Link>
      </nav>

      <div className="page-container" style={{ paddingTop: 48, maxWidth: 520 }}>
        <h1 className="page-title">Create Account</h1>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 32 }}>
          {['Credentials', 'Identity', 'Profile Picture'].map((label, i) => (
            <div key={i} style={{
              flex: 1,
              padding: '6px 12px',
              fontSize: 11,
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              background: step === i + 1 ? '#000' : step > i + 1 ? '#CC0000' : '#eee',
              color: step >= i + 1 ? '#fff' : '#666',
              border: '1px solid #aaa',
              textAlign: 'center',
            }}>
              {i + 1}. {label}
            </div>
          ))}
        </div>

        {error && (
          <div style={{ border: '2px solid #CC0000', padding: '8px 12px', marginBottom: 16, fontSize: 13, color: '#CC0000' }}>
            {error}
          </div>
        )}

        {/* STEP 1: Credentials */}
        {step === 1 && (
          <div className="box">
            <div className="box-header">STEP 1 — CREDENTIALS</div>
            <div style={{ padding: '20px 0 0' }}>
              <div style={{ marginBottom: 16 }}>
                <label className="field-label">Email Address</label>
                <input className="field-input" type="email" value={email}
                  onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label className="field-label">Password</label>
                <input className="field-input" type="password" value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="minimum 6 characters" />
              </div>
              <button className="btn btn-accent" style={{ width: '100%' }}
                onClick={() => {
                  if (!email || !password) return setError('Please fill in both fields')
                  if (password.length < 6) return setError('Password must be at least 6 characters')
                  setError('')
                  setStep(2)
                }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Identity */}
        {step === 2 && (
          <div className="box">
            <div className="box-header">STEP 2 — IDENTITY</div>
            <div style={{ padding: '20px 0 0' }}>
              <p style={{ fontSize: 13, color: '#555', marginBottom: 20, lineHeight: 1.7 }}>
                This is a permanent choice. It cannot be changed after account creation.
              </p>

              <div style={{ marginBottom: 16 }}>
                {[
                  { value: 'named', label: 'Use my name', desc: 'Your chosen name is shown on the leaderboard and archive.' },
                  { value: 'anonymous', label: 'Stay anonymous', desc: 'You\'ll be assigned a permanent alias: No-name 1, No-name 2, etc.' },
                ].map(opt => (
                  <div key={opt.value}
                    onClick={() => setIdentityMode(opt.value as any)}
                    style={{
                      border: `2px solid ${identityMode === opt.value ? '#000' : '#aaa'}`,
                      padding: '12px 16px',
                      marginBottom: 10,
                      cursor: 'pointer',
                      background: identityMode === opt.value ? '#f5f5f5' : '#fff',
                    }}>
                    <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 4 }}>
                      {identityMode === opt.value ? '▶ ' : '○ '}{opt.label}
                    </div>
                    <div style={{ fontSize: 12, color: '#666' }}>{opt.desc}</div>
                  </div>
                ))}
              </div>

              {identityMode === 'named' && (
                <div style={{ marginBottom: 20 }}>
                  <label className="field-label">Your Display Name</label>
                  <input className="field-input" type="text" value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="How you'll appear to the group" />
                </div>
              )}

              {identityMode === 'anonymous' && (
                <div className="box-shaded" style={{ marginBottom: 20, fontSize: 13 }}>
                  You'll be assigned your No-name number when your account is created.
                  Your writing will still be published — only your identity is hidden.
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
                <button className="btn btn-accent" style={{ flex: 1 }}
                  onClick={() => {
                    if (identityMode === 'named' && !displayName.trim()) return setError('Please enter your display name')
                    setError('')
                    setStep(3)
                  }}>
                  Continue →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Avatar */}
        {step === 3 && (
          <div className="box">
            <div className="box-header">STEP 3 — PROFILE PICTURE</div>
            <div style={{ padding: '20px 0 0' }}>
              <p style={{ fontSize: 13, color: '#555', marginBottom: 16, lineHeight: 1.7 }}>
                Upload a photo. It will be cropped to 3:4 portrait format.
                This is permanent — it cannot be changed later.
              </p>

              {!avatarPreview ? (
                <div>
                  <label style={{
                    display: 'block',
                    border: '2px dashed #aaa',
                    padding: '32px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    fontSize: 13,
                    color: '#666',
                  }}>
                    <input type="file" accept="image/jpeg,image/png,image/webp"
                      onChange={handleAvatarSelect} style={{ display: 'none' }} />
                    Click to upload (JPG, PNG, WEBP — max 5MB)
                  </label>
                </div>
              ) : (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, color: '#666', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Drag to adjust crop:
                  </p>
                  <ReactCrop crop={crop} onChange={c => setCrop(c)} aspect={3 / 4}>
                    <img ref={imgRef} src={avatarPreview} alt="avatar preview"
                      style={{ maxWidth: '100%', maxHeight: 400 }} />
                  </ReactCrop>
                </div>
              )}

              <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                <button className="btn btn-ghost" onClick={() => setStep(2)}>← Back</button>
                <button className="btn btn-accent" style={{ flex: 1 }}
                  disabled={loading} onClick={handleSubmit}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </div>
              {!avatarPreview && (
                <button style={{ marginTop: 8, width: '100%', fontSize: 12, color: '#999', border: 'none', background: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                  disabled={loading} onClick={handleSubmit}>
                  {loading ? 'Creating...' : 'Skip for now'}
                </button>
              )}
            </div>
          </div>
        )}

        <p style={{ marginTop: 20, fontSize: 13, textAlign: 'center' }}>
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </div>
    </div>
  )
}

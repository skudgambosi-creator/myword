'use client'
import Link from 'next/link'

interface Props {
  languageId: string
  displayName: string
  nativeName: string
  description: string
  href: string
}

export default function LanguageCard({ languageId, displayName, nativeName, description, href }: Props) {
  return (
    <div style={{ border: '1px solid #000', padding: '28px 32px' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>
          {displayName}
        </div>
        <div style={{ fontSize: 13, fontStyle: 'italic', color: '#444', marginBottom: 12 }}>
          {nativeName}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.7, color: '#555' }}>
          {description}
        </div>
      </div>

      <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
        <button
          style={{
            width: '100%', padding: '16px', fontSize: 13, fontWeight: 700,
            letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer',
            fontFamily: 'inherit', background: '#000', border: '1px solid #000', color: '#fff',
            transition: 'background 0.12s, color 0.12s',
          }}
        >
          ENTER
        </button>
      </Link>
    </div>
  )
}

'use client'
import { useState } from 'react'

export default function ImageGallery({ images }: { images: string[] }) {
  const [lightbox, setLightbox] = useState<string | null>(null)

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {images.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`Image ${i + 1}`}
            onClick={() => setLightbox(src)}
            style={{ width: 140, height: 140, objectFit: 'cover', border: '1px solid #000', display: 'block', cursor: 'zoom-in' }}
          />
        ))}
      </div>

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <img
            src={lightbox}
            alt="Full size"
            style={{ maxWidth: '92vw', maxHeight: '92vh', objectFit: 'contain', display: 'block' }}
          />
        </div>
      )}
    </>
  )
}

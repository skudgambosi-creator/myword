import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'My Word',
  description: 'A collaborative writing project. 26 letters. 26 weeks.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

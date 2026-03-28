import type { Metadata } from 'next'
import { Inconsolata } from 'next/font/google'
import './globals.css'

const inconsolata = Inconsolata({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '900'],
})

export const metadata: Metadata = {
  title: 'My Word',
  description: 'A collaborative writing project. 26 letters. 26 weeks.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inconsolata.className}>{children}</body>
    </html>
  )
}

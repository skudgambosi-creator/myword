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
  icons: { icon: '/saturn.svg' },
}

// Sets data-theme from localStorage before paint, so there's no
// flash of the wrong theme on load. Runs as an inline blocking
// script since it has to happen before hydration.
const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('myword-theme');
    var theme = stored === 'dark' || stored === 'light'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inconsolata.className}>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/* #theme-root only becomes a fixed, internally-scrolling box when
            dark mode is on (see globals.css) -- see the comment there for
            why. In light mode it's a plain, unstyled wrapper, identical to
            not having it there at all. */}
        <div id="theme-root">
          {children}
        </div>
      </body>
    </html>
  )
}

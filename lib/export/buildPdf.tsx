import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import React from 'react'
import path from 'path'
import { renderBodyHtml, extractImageUrls, resolveImages, type ResolvedImage } from './richText'

export interface ExportPiece {
  weekLabel: string // e.g. 'A', or 'Epilogue' for the letter-less week
  title: string
  bodyHtml: string
  attribution?: string // e.g. 'Member #14' — omitted entirely for a personal export
}

export interface CompletionGrid {
  // A–Z only, matching the site's own progress grid (app/groups/[id]/page.tsx,
  // Card 4) — it doesn't factor in the letter-less week either.
  submittedLetters: Set<string>
}

// Matches the site's own font exactly (app/layout.tsx / globals.css both use
// Inconsolata as the base font-family everywhere). Only regular and bold are
// registered — Inconsolata has no italic face on Google Fonts, so
// fontStyle: 'italic' degrades to normal rather than a fake slant.
//
// Bundled locally rather than fetched from Google Fonts at render time — a
// live "all" export job failed in production with "Could not resolve font
// for Inconsolata" (react-pdf's own remote font fetch, not the image-fetch
// path), almost certainly a transient network hiccup, but a real-world
// failure mode we don't get a second chance at on the actual season close.
// Shipping the font as part of the deployment removes that dependency
// entirely.
Font.register({
  family: 'Inconsolata',
  fonts: [
    { src: path.join(process.cwd(), 'lib/export/fonts/Inconsolata-Regular.ttf'), fontWeight: 400 },
    { src: path.join(process.cwd(), 'lib/export/fonts/Inconsolata-Bold.ttf'), fontWeight: 700 },
  ],
})

const ACCENT = '#C85A5A'
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

const styles = StyleSheet.create({
  page: { padding: 48, fontFamily: 'Inconsolata' },
  coverTitle: { fontSize: 26, fontWeight: 700, textAlign: 'center', marginBottom: 12, letterSpacing: 1 },
  coverSubtitle: { fontSize: 12, textAlign: 'center', color: '#666', textTransform: 'uppercase', letterSpacing: 2 },
  coverNote: { fontSize: 9, textAlign: 'center', color: '#999', position: 'absolute', bottom: 48, left: 48, right: 48 },
  weekLabel: { fontSize: 11, letterSpacing: 2, color: ACCENT, marginBottom: 4, textTransform: 'uppercase' },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  attribution: { fontSize: 9, color: '#999', marginBottom: 16 },
  titleSpacer: { marginBottom: 16 },
  dividerLetter: { fontSize: 140, fontWeight: 700, color: '#000' },
  gridTitle: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: '#666', marginBottom: 20 },
  gridCount: { fontSize: 13, fontWeight: 700, marginBottom: 28 },
  gridRow: { flexDirection: 'row', marginBottom: 10 },
  gridCircle: {
    width: 30, height: 30, borderRadius: 15, marginHorizontal: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  gridCircleText: { fontSize: 12, fontWeight: 700, color: '#fff' },
})

function CoverPage({ coverTitle, coverSubtitle }: { coverTitle: string; coverSubtitle: string }) {
  return (
    <Page size="A4" style={styles.page}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={styles.coverTitle}>{coverTitle}</Text>
        <Text style={styles.coverSubtitle}>{coverSubtitle}</Text>
      </View>
      <Text style={styles.coverNote}>my-word.co.uk</Text>
    </Page>
  )
}

function LetterDividerPage({ letter }: { letter: string }) {
  return (
    <Page size="A4" style={styles.page}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={styles.dividerLetter}>{letter}</Text>
      </View>
    </Page>
  )
}

// The site's own A–Z progress grid (red = submitted on time, black = missed),
// reproduced as the opening page of a "Mine" export.
function CompletionGridPage({ submittedLetters }: CompletionGrid) {
  const submittedCount = ALPHABET.filter(l => submittedLetters.has(l)).length
  const rows = [ALPHABET.slice(0, 13), ALPHABET.slice(13, 26)]
  return (
    <Page size="A4" style={styles.page}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={styles.gridTitle}>Your Progress</Text>
        <Text style={styles.gridCount}>{submittedCount} / 26</Text>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.gridRow}>
            {row.map(letter => {
              const submitted = submittedLetters.has(letter)
              return (
                <View key={letter} style={{ ...styles.gridCircle, backgroundColor: submitted ? ACCENT : '#000' }}>
                  <Text style={styles.gridCircleText}>{letter}</Text>
                </View>
              )
            })}
          </View>
        ))}
      </View>
    </Page>
  )
}

function PiecePage({ piece, showWeekLabel, images }: { piece: ExportPiece; showWeekLabel: boolean; images: Map<string, ResolvedImage> }) {
  return (
    <Page size="A4" style={styles.page} wrap>
      {showWeekLabel && <Text style={styles.weekLabel}>{piece.weekLabel}</Text>}
      <View style={piece.attribution || !showWeekLabel ? undefined : styles.titleSpacer}>
        <Text style={styles.title}>{piece.title}</Text>
      </View>
      {piece.attribution && <Text style={styles.attribution}>{piece.attribution}</Text>}
      {renderBodyHtml(piece.bodyHtml, images)}
    </Page>
  )
}

async function resolveImagesForPieces(pieces: ExportPiece[]): Promise<Map<string, ResolvedImage>> {
  const urls = pieces.flatMap(p => extractImageUrls(p.bodyHtml))
  return resolveImages(urls)
}

// Mine / Season Favourites: cover, an optional extra page (the completion
// grid, Mine only), then every piece on its own page with its week letter
// shown above the title — no letter-divider pages for these two.
export async function buildFlatDocument({
  docTitle,
  coverTitle,
  coverSubtitle,
  pieces,
  completionGrid,
}: {
  docTitle: string
  coverTitle: string
  coverSubtitle: string
  pieces: ExportPiece[]
  completionGrid?: CompletionGrid
}) {
  const images = await resolveImagesForPieces(pieces)
  return (
    <Document title={docTitle}>
      <CoverPage coverTitle={coverTitle} coverSubtitle={coverSubtitle} />
      {completionGrid && <CompletionGridPage {...completionGrid} />}
      {pieces.map((p, i) => (
        <PiecePage key={i} piece={p} showWeekLabel images={images} />
      ))}
    </Document>
  )
}

// "All", one batch. Groups pieces by weekLabel (they arrive in week order
// already) and inserts a standalone divider page before each new letter —
// except the batch's very first letter, if it's a continuation of whatever
// letter the previous batch ended on (leadingLetterCarry). Returns the
// trailing letter so the caller can persist it for the next batch.
export async function buildAllBatchDocument({
  docTitle,
  coverTitle,
  coverSubtitle,
  pieces,
  withCover,
  leadingLetterCarry,
}: {
  docTitle: string
  coverTitle: string
  coverSubtitle: string
  pieces: ExportPiece[]
  withCover: boolean
  leadingLetterCarry: string | null
}): Promise<{ document: React.ReactElement; lastLetter: string | null }> {
  const images = await resolveImagesForPieces(pieces)

  const groups: { letter: string; items: ExportPiece[] }[] = []
  for (const piece of pieces) {
    const last = groups[groups.length - 1]
    if (last && last.letter === piece.weekLabel) last.items.push(piece)
    else groups.push({ letter: piece.weekLabel, items: [piece] })
  }

  const document = (
    <Document title={docTitle}>
      {withCover && <CoverPage coverTitle={coverTitle} coverSubtitle={coverSubtitle} />}
      {groups.map((group, gi) => {
        const skipDivider = gi === 0 && group.letter === leadingLetterCarry
        return (
          <React.Fragment key={gi}>
            {!skipDivider && <LetterDividerPage letter={group.letter} />}
            {group.items.map((p, pi) => (
              <PiecePage key={`${gi}-${pi}`} piece={p} showWeekLabel={false} images={images} />
            ))}
          </React.Fragment>
        )
      })}
    </Document>
  )

  return { document, lastLetter: pieces.length > 0 ? pieces[pieces.length - 1].weekLabel : leadingLetterCarry }
}

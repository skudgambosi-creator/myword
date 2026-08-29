import { Document, Page, Text, View, StyleSheet, Font, renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { renderBodyHtml, extractImageUrls, resolveImages, type ResolvedImage } from './richText'
import { INCONSOLATA_REGULAR_BASE64, INCONSOLATA_BOLD_BASE64 } from './fontData'

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
// Embedded as base64 data URIs — a remote URL and a locally-bundled file
// path (confirmed present in the actual build's file trace) both failed in
// production with the identical "Could not resolve font for Inconsolata"
// error, which is thrown by react-pdf's own FontStore.resolve() when no
// source is registered for the requested family/weight. Root cause not yet
// pinned down with certainty despite three different loading strategies —
// see the diagnostic logging below and renderWithFontFallback, which
// guarantees a real user's export still succeeds (via a standard font that
// needs no registration at all) even if this keeps failing.
//
// ROOT CAUSE FOUND: none of the above was ever the problem. Reproduced
// directly — react-pdf's FontStore.resolve() filters registered sources by
// fontStyle *before* it does any weight matching, and does NOT fall back
// from 'italic' to 'normal' when no italic source is registered. Since
// Inconsolata was only ever registered for fontStyle: 'normal', any
// submission with real italic text (an <em>, which richText.tsx turns into
// a Text run requesting fontStyle: 'italic') hits exactly this error —
// data-dependent, which is why it wasn't reproducible with simple test
// content and why it failed inconsistently in production (whichever batch
// happened to contain italicised text). Fix: register italic sources too,
// reusing the same regular/bold files — Inconsolata has no true italic
// glyphs, so this renders upright, but it makes the request resolvable,
// which is what "degrades to normal" was always meant to do.
let fontsRegistered = false
function registerFonts() {
  console.log('[export/font] registerFonts() called, already registered:', fontsRegistered,
    'regular b64 length:', INCONSOLATA_REGULAR_BASE64.length, 'bold b64 length:', INCONSOLATA_BOLD_BASE64.length)
  if (fontsRegistered) return
  Font.register({
    family: 'Inconsolata',
    fonts: [
      { src: `data:font/ttf;base64,${INCONSOLATA_REGULAR_BASE64}`, fontWeight: 400, fontStyle: 'normal' },
      { src: `data:font/ttf;base64,${INCONSOLATA_BOLD_BASE64}`, fontWeight: 700, fontStyle: 'normal' },
      { src: `data:font/ttf;base64,${INCONSOLATA_REGULAR_BASE64}`, fontWeight: 400, fontStyle: 'italic' },
      { src: `data:font/ttf;base64,${INCONSOLATA_BOLD_BASE64}`, fontWeight: 700, fontStyle: 'italic' },
    ],
  })
  fontsRegistered = true
  console.log('[export/font] after register, families known to Font store:', Font.getRegisteredFontFamilies())
}

const ACCENT = '#C85A5A'
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

// A function rather than a module-level constant so renderWithFontFallback
// can rebuild the whole style tree against a different fontFamily (the
// standard, registration-free 'Courier') on retry — StyleSheet.create bakes
// the family into every style object at call time, so swapping fonts means
// rebuilding, not just re-rendering the same styles.
function makeStyles(fontFamily: string) {
  return StyleSheet.create({
    page: { padding: 48, fontFamily },
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
}

type Styles = ReturnType<typeof makeStyles>

function CoverPage({ coverTitle, coverSubtitle, styles }: { coverTitle: string; coverSubtitle: string; styles: Styles }) {
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

function LetterDividerPage({ letter, styles }: { letter: string; styles: Styles }) {
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
function CompletionGridPage({ submittedLetters, styles }: CompletionGrid & { styles: Styles }) {
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

function PiecePage({ piece, showWeekLabel, images, styles }: { piece: ExportPiece; showWeekLabel: boolean; images: Map<string, ResolvedImage>; styles: Styles }) {
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

interface FlatDocInput {
  docTitle: string
  coverTitle: string
  coverSubtitle: string
  pieces: ExportPiece[]
  completionGrid?: CompletionGrid
}

// Mine / Season Favourites: cover, an optional extra page (the completion
// grid, Mine only), then every piece on its own page with its week letter
// shown above the title — no letter-divider pages for these two.
function buildFlatDocumentJsx(input: FlatDocInput, images: Map<string, ResolvedImage>, fontFamily: string) {
  const styles = makeStyles(fontFamily)
  const { docTitle, coverTitle, coverSubtitle, pieces, completionGrid } = input
  return (
    <Document title={docTitle}>
      <CoverPage coverTitle={coverTitle} coverSubtitle={coverSubtitle} styles={styles} />
      {completionGrid && <CompletionGridPage {...completionGrid} styles={styles} />}
      {pieces.map((p, i) => (
        <PiecePage key={i} piece={p} showWeekLabel images={images} styles={styles} />
      ))}
    </Document>
  )
}

export async function buildFlatDocument(input: FlatDocInput): Promise<Buffer> {
  const images = await resolveImagesForPieces(input.pieces)
  return renderWithFontFallback(fontFamily => buildFlatDocumentJsx(input, images, fontFamily))
}

interface AllBatchInput {
  docTitle: string
  coverTitle: string
  coverSubtitle: string
  pieces: ExportPiece[]
  withCover: boolean
  leadingLetterCarry: string | null
}

function groupByLetter(pieces: ExportPiece[]) {
  const groups: { letter: string; items: ExportPiece[] }[] = []
  for (const piece of pieces) {
    const last = groups[groups.length - 1]
    if (last && last.letter === piece.weekLabel) last.items.push(piece)
    else groups.push({ letter: piece.weekLabel, items: [piece] })
  }
  return groups
}

// "All", one batch. Groups pieces by weekLabel (they arrive in week order
// already) and inserts a standalone divider page before each new letter —
// except the batch's very first letter, if it's a continuation of whatever
// letter the previous batch ended on (leadingLetterCarry).
function buildAllBatchDocumentJsx(input: AllBatchInput, images: Map<string, ResolvedImage>, fontFamily: string) {
  const styles = makeStyles(fontFamily)
  const { docTitle, coverTitle, coverSubtitle, pieces, withCover, leadingLetterCarry } = input
  const groups = groupByLetter(pieces)
  return (
    <Document title={docTitle}>
      {withCover && <CoverPage coverTitle={coverTitle} coverSubtitle={coverSubtitle} styles={styles} />}
      {groups.map((group, gi) => {
        const skipDivider = gi === 0 && group.letter === leadingLetterCarry
        return (
          <React.Fragment key={gi}>
            {!skipDivider && <LetterDividerPage letter={group.letter} styles={styles} />}
            {group.items.map((p, pi) => (
              <PiecePage key={`${gi}-${pi}`} piece={p} showWeekLabel={false} images={images} styles={styles} />
            ))}
          </React.Fragment>
        )
      })}
    </Document>
  )
}

// Returns the rendered PDF buffer plus the trailing letter, so the caller
// can persist it for the next batch's divider-skip logic.
export async function buildAllBatchDocument(input: AllBatchInput): Promise<{ buffer: Buffer; lastLetter: string | null }> {
  const images = await resolveImagesForPieces(input.pieces)
  const buffer = await renderWithFontFallback(fontFamily => buildAllBatchDocumentJsx(input, images, fontFamily))
  const lastLetter = input.pieces.length > 0 ? input.pieces[input.pieces.length - 1].weekLabel : input.leadingLetterCarry
  return { buffer, lastLetter }
}

// Renders with Inconsolata; if that specifically fails on font resolution
// (not some other rendering error, which still propagates normally),
// rebuilds the same document against Courier — a react-pdf standard font
// that needs no registration and can't hit this failure mode — and renders
// that instead, so a real download still arrives even while the underlying
// Inconsolata issue is unresolved.
async function renderWithFontFallback(buildJsx: (fontFamily: string) => React.ReactElement): Promise<Buffer> {
  registerFonts()
  console.log('[export/font] registered families immediately before render:', Font.getRegisteredFontFamilies())
  try {
    return await renderToBuffer(buildJsx('Inconsolata'))
  } catch (e: any) {
    const message = e?.message || ''
    if (!message.includes('Could not resolve font')) throw e
    console.error('[export/font] Inconsolata render failed, falling back to Courier:', message,
      'registered families at failure:', Font.getRegisteredFontFamilies())
    return await renderToBuffer(buildJsx('Courier'))
  }
}

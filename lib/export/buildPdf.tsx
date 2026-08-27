import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import React from 'react'
import { renderBodyHtml } from './richText'

export interface ExportPiece {
  weekLabel: string // e.g. 'A', or 'Epilogue' for the letter-less week
  title: string
  bodyHtml: string
  attribution?: string // e.g. 'Member #14' — omitted entirely for a personal export
}

const styles = StyleSheet.create({
  page: { padding: 48, fontFamily: 'Helvetica' },
  coverTitle: { fontSize: 28, fontWeight: 700, textAlign: 'center', marginBottom: 12 },
  coverSubtitle: { fontSize: 13, textAlign: 'center', color: '#666' },
  coverNote: { fontSize: 9, textAlign: 'center', color: '#999', position: 'absolute', bottom: 48, left: 48, right: 48 },
  weekLabel: { fontSize: 11, letterSpacing: 2, color: '#C85A5A', marginBottom: 4, textTransform: 'uppercase' },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  attribution: { fontSize: 9, color: '#999', marginBottom: 16 },
  titleSpacer: { marginBottom: 16 },
})

// One page per piece — simplest way to get correct, automatic pagination
// for pieces of very different lengths without hand-computing page breaks.
// withCover: false is for batch 2+ of a chunked "all" export, where the
// cover page was already produced by batch 1 and the batches get merged
// afterward — without this, every batch would carry its own cover page.
export function buildAlphabetDocument({
  docTitle,
  coverTitle,
  coverSubtitle,
  pieces,
  withCover = true,
}: {
  docTitle: string
  coverTitle: string
  coverSubtitle: string
  pieces: ExportPiece[]
  withCover?: boolean
}) {
  return (
    <Document title={docTitle}>
      {withCover && (
        <Page size="A4" style={styles.page}>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={styles.coverTitle}>{coverTitle}</Text>
            <Text style={styles.coverSubtitle}>{coverSubtitle}</Text>
          </View>
          <Text style={styles.coverNote}>my-word.co.uk</Text>
        </Page>
      )}

      {pieces.map((p, i) => (
        <Page key={i} size="A4" style={styles.page} wrap>
          <Text style={styles.weekLabel}>{p.weekLabel}</Text>
          <View style={p.attribution ? undefined : styles.titleSpacer}>
            <Text style={styles.title}>{p.title}</Text>
          </View>
          {p.attribution && <Text style={styles.attribution}>{p.attribution}</Text>}
          {renderBodyHtml(p.bodyHtml)}
        </Page>
      ))}
    </Document>
  )
}

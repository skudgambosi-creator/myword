import { parse, type HTMLElement as ParsedElement, type Node as ParsedNode } from 'node-html-parser'
import { Text, View, Image } from '@react-pdf/renderer'
import React from 'react'

// Converts submission body_html (TipTap output) into react-pdf primitives.
// Scoped to exactly what the editor toolbar can actually produce — bold,
// italic, underline, strikethrough, one accent colour, text-align,
// paragraphs, bullet lists, inline images, and the block-level audio node.
// Not a general HTML-to-PDF engine; anything outside that set falls through
// to a plain paragraph rather than being dropped silently.

const TEXT_NODE = 3
const ELEMENT_NODE = 1

interface InlineStyle {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  color?: string
}

export interface ResolvedImage {
  data: Buffer
  format: 'png' | 'jpg'
}

function parseColor(styleAttr: string | undefined): string | undefined {
  if (!styleAttr) return undefined
  const m = styleAttr.match(/color:\s*([^;]+)/i)
  return m ? m[1].trim() : undefined
}

function parseTextAlign(styleAttr: string | undefined): 'left' | 'center' | 'right' | undefined {
  if (!styleAttr) return undefined
  const m = styleAttr.match(/text-align:\s*(left|center|right)/i)
  return m ? (m[1].toLowerCase() as 'left' | 'center' | 'right') : undefined
}

function runStyle(s: InlineStyle): any {
  const decorations = [s.underline ? 'underline' : null, s.strike ? 'line-through' : null].filter(Boolean)
  return {
    // Inconsolata (registered in buildPdf.tsx to match the site's own
    // font) only ships regular/bold — no italic face exists for it, so
    // fontStyle: 'italic' is a graceful no-op rather than a real slant.
    fontWeight: s.bold ? 700 : 400,
    fontStyle: s.italic ? 'italic' : 'normal',
    textDecoration: decorations.length ? decorations.join(' ') : 'none',
    color: s.color || undefined,
  }
}

// Every <img src="..."> in a batch of pieces, in document order. Collected
// up front so all the images for a batch can be fetched in parallel before
// rendering starts, rather than react-pdf attempting its own per-image
// network fetch mid-render (unreliable in practice — this is what caused
// the image to silently vanish in the first real test of this pipeline).
export function extractImageUrls(html: string): string[] {
  const root = parse(html || '')
  return root.querySelectorAll('img').map(el => el.getAttribute('src')).filter(Boolean) as string[]
}

function guessFormat(url: string, contentType: string | null): 'png' | 'jpg' {
  if (contentType?.includes('png')) return 'png'
  if (contentType?.includes('jpeg') || contentType?.includes('jpg')) return 'jpg'
  return url.toLowerCase().endsWith('.png') ? 'png' : 'jpg'
}

// Fetches every URL once, in parallel, tolerating individual failures —
// one broken image link shouldn't take down the whole export.
export async function resolveImages(urls: string[]): Promise<Map<string, ResolvedImage>> {
  const unique = Array.from(new Set(urls))
  const map = new Map<string, ResolvedImage>()
  await Promise.all(unique.map(async url => {
    try {
      const res = await fetch(url)
      if (!res.ok) return
      const buffer = Buffer.from(await res.arrayBuffer())
      map.set(url, { data: buffer, format: guessFormat(url, res.headers.get('content-type')) })
    } catch {
      // Skipped — renderBodyHtml falls back to a placeholder note for it.
    }
  }))
  return map
}

function renderImage(src: string, key: string, images: Map<string, ResolvedImage>): React.ReactNode {
  const resolved = images.get(src)
  if (!resolved) {
    return (
      <View key={key} style={{ marginTop: 4, marginBottom: 4, padding: 6, border: '1pt solid #ccc' }}>
        <Text style={{ fontSize: 9, color: '#888' }}>[image could not be loaded]</Text>
      </View>
    )
  }
  return <Image key={key} src={resolved} style={{ maxWidth: 260, marginTop: 6, marginBottom: 6 }} />
}

// Walks a block element's children, collecting styled inline text runs plus
// any images found along the way (rendered as their own block afterward —
// react-pdf doesn't flow images mid-paragraph the way a browser does).
function collectInline(nodes: ParsedNode[], style: InlineStyle, keyPrefix: string, imgSrcs: string[]): React.ReactNode[] {
  const out: React.ReactNode[] = []
  nodes.forEach((node, i) => {
    const key = `${keyPrefix}-${i}`
    if (node.nodeType === TEXT_NODE) {
      const text = (node as any).text as string
      if (text) out.push(<Text key={key} style={runStyle(style)}>{text}</Text>)
      return
    }
    if (node.nodeType !== ELEMENT_NODE) return
    const el = node as ParsedElement
    const tag = el.tagName?.toLowerCase()

    if (tag === 'img') {
      const src = el.getAttribute('src')
      if (src) imgSrcs.push(src)
      return
    }
    if (tag === 'br') { out.push(<Text key={key}>{'\n'}</Text>); return }

    const next: InlineStyle = { ...style }
    if (tag === 'strong' || tag === 'b') next.bold = true
    if (tag === 'em' || tag === 'i') next.italic = true
    if (tag === 'u') next.underline = true
    if (tag === 's' || tag === 'strike' || tag === 'del') next.strike = true
    const color = parseColor(el.getAttribute('style'))
    if (color) next.color = color

    out.push(...collectInline(el.childNodes, next, key, imgSrcs))
  })
  return out
}

function renderParagraph(el: ParsedElement, key: string, images: Map<string, ResolvedImage>): React.ReactNode {
  const imgSrcs: string[] = []
  const align = parseTextAlign(el.getAttribute('style'))
  const runs = collectInline(el.childNodes, {}, key, imgSrcs)
  return (
    <View key={key} style={{ marginBottom: 8 }} wrap>
      {runs.length > 0 && (
        <Text style={{ fontSize: 11, lineHeight: 1.6, textAlign: align || 'left' }}>{runs}</Text>
      )}
      {imgSrcs.map((src, i) => renderImage(src, `${key}-img-${i}`, images))}
    </View>
  )
}

function renderList(el: ParsedElement, key: string, images: Map<string, ResolvedImage>): React.ReactNode {
  const items = el.childNodes.filter(n => n.nodeType === ELEMENT_NODE && (n as ParsedElement).tagName?.toLowerCase() === 'li') as ParsedElement[]
  return (
    <View key={key} style={{ marginBottom: 8 }}>
      {items.map((li, i) => {
        const imgSrcs: string[] = []
        const runs = collectInline(li.childNodes, {}, `${key}-li-${i}`, imgSrcs)
        return (
          <View key={`${key}-li-${i}`}>
            <View style={{ flexDirection: 'row', marginBottom: 3 }}>
              <Text style={{ fontSize: 11, width: 14 }}>{'•'}</Text>
              <Text style={{ fontSize: 11, lineHeight: 1.6, flex: 1 }}>{runs}</Text>
            </View>
            {imgSrcs.map((src, j) => renderImage(src, `${key}-li-${i}-img-${j}`, images))}
          </View>
        )
      })}
    </View>
  )
}

function renderAudioPlaceholder(key: string): React.ReactNode {
  return (
    <View key={key} style={{ marginBottom: 8, padding: 8, border: '1pt solid #ccc' }}>
      <Text style={{ fontSize: 9, color: '#888' }}>
        [audio attached to this piece, still on the site]
      </Text>
    </View>
  )
}

export function renderBodyHtml(html: string, images: Map<string, ResolvedImage>): React.ReactNode[] {
  const root = parse(html || '')
  const out: React.ReactNode[] = []
  let i = 0
  for (const node of root.childNodes) {
    if (node.nodeType !== ELEMENT_NODE) continue
    const el = node as ParsedElement
    const tag = el.tagName?.toLowerCase()
    const key = `blk-${i++}`
    if (tag === 'audio') { out.push(renderAudioPlaceholder(key)); continue }
    if (tag === 'ul') { out.push(renderList(el, key, images)); continue }
    // p, and anything else block-level the editor could theoretically emit —
    // rendered as a plain paragraph rather than dropped.
    out.push(renderParagraph(el, key, images))
  }
  return out
}

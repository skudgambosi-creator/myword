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
    fontWeight: s.bold ? 700 : 400,
    fontStyle: s.italic ? 'italic' : 'normal',
    textDecoration: decorations.length ? decorations.join(' ') : 'none',
    color: s.color || undefined,
  }
}

// Walks a block element's children, collecting styled inline text runs plus
// any images found along the way (rendered as their own block afterward —
// react-pdf doesn't flow images mid-paragraph the way a browser does).
function collectInline(nodes: ParsedNode[], style: InlineStyle, keyPrefix: string, images: string[]): React.ReactNode[] {
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
      if (src) images.push(src)
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

    out.push(...collectInline(el.childNodes, next, key, images))
  })
  return out
}

function renderParagraph(el: ParsedElement, key: string): React.ReactNode {
  const images: string[] = []
  const align = parseTextAlign(el.getAttribute('style'))
  const runs = collectInline(el.childNodes, {}, key, images)
  return (
    <View key={key} style={{ marginBottom: 8 }} wrap>
      {runs.length > 0 && (
        <Text style={{ fontSize: 11, lineHeight: 1.6, textAlign: align || 'left' }}>{runs}</Text>
      )}
      {images.map((src, i) => (
        <Image key={`${key}-img-${i}`} src={src} style={{ maxWidth: 260, marginTop: 6, marginBottom: 6 }} />
      ))}
    </View>
  )
}

function renderList(el: ParsedElement, key: string): React.ReactNode {
  const items = el.childNodes.filter(n => n.nodeType === ELEMENT_NODE && (n as ParsedElement).tagName?.toLowerCase() === 'li') as ParsedElement[]
  return (
    <View key={key} style={{ marginBottom: 8 }}>
      {items.map((li, i) => {
        const images: string[] = []
        const runs = collectInline(li.childNodes, {}, `${key}-li-${i}`, images)
        return (
          <View key={`${key}-li-${i}`}>
            <View style={{ flexDirection: 'row', marginBottom: 3 }}>
              <Text style={{ fontSize: 11, width: 14 }}>{'•'}</Text>
              <Text style={{ fontSize: 11, lineHeight: 1.6, flex: 1 }}>{runs}</Text>
            </View>
            {images.map((src, j) => (
              <Image key={`${key}-li-${i}-img-${j}`} src={src} style={{ maxWidth: 260, marginTop: 4, marginBottom: 4 }} />
            ))}
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
        [audio attached to this piece — still on the site]
      </Text>
    </View>
  )
}

export function renderBodyHtml(html: string): React.ReactNode[] {
  const root = parse(html || '')
  const out: React.ReactNode[] = []
  let i = 0
  for (const node of root.childNodes) {
    if (node.nodeType !== ELEMENT_NODE) continue
    const el = node as ParsedElement
    const tag = el.tagName?.toLowerCase()
    const key = `blk-${i++}`
    if (tag === 'audio') { out.push(renderAudioPlaceholder(key)); continue }
    if (tag === 'ul') { out.push(renderList(el, key)); continue }
    // p, and anything else block-level the editor could theoretically emit —
    // rendered as a plain paragraph rather than dropped.
    out.push(renderParagraph(el, key))
  }
  return out
}

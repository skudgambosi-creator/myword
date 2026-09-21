'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { FRENCH_CARDS, CATS, CAT_LABELS, REF_NOTES, getAudioUrl, type FrenchCard } from '@/lib/tongues/french-data'

type Mode = 'en-fr' | 'fr-en'
type Cat = string

interface Scores { knew: number; unsure: number; miss: number }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const s = {
  root: { fontFamily: "Georgia,'Times New Roman',serif", background: '#fff', color: '#000', display: 'flex', flexDirection: 'column' as const, flex: 1 },
  statsBar: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderBottom: '1px solid #ccc' },
  stat: { padding: '10px 8px', textAlign: 'center' as const, borderRight: '1px solid #ccc' },
  statLast: { padding: '10px 8px', textAlign: 'center' as const },
  statN: { fontSize: 24, fontWeight: 'bold' },
  statL: { fontSize: 11, color: '#444', marginTop: 1, letterSpacing: '0.04em' },
  progressWrap: { height: 6, background: '#f0f0f0' },
  deckWrap: { padding: '12px 16px', borderBottom: '1px solid #ccc', display: 'flex', gap: 8, flexWrap: 'wrap' as const },
  deckBtn: (active: boolean): React.CSSProperties => ({
    fontSize: 13, padding: '7px 14px', borderRadius: 20,
    border: active ? '1.5px solid #000' : '1.5px solid #ccc',
    background: active ? '#000' : '#fff',
    color: active ? '#fff' : '#444',
    cursor: 'pointer', fontFamily: "Georgia,serif", minHeight: 36,
  }),
  modeWrap: { display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #ccc' },
  modeBtn: (active: boolean): React.CSSProperties => ({
    padding: '10px 8px', fontSize: 13,
    border: 'none', borderRight: '1px solid #ccc',
    background: active ? '#000' : '#fff',
    color: active ? '#fff' : '#444',
    cursor: 'pointer', fontFamily: "Georgia,serif",
    fontWeight: active ? 'bold' : 'normal',
  }),
  modeBtnLast: (active: boolean): React.CSSProperties => ({
    padding: '10px 8px', fontSize: 13,
    border: 'none',
    background: active ? '#000' : '#fff',
    color: active ? '#fff' : '#444',
    cursor: 'pointer', fontFamily: "Georgia,serif",
    fontWeight: active ? 'bold' : 'normal',
  }),
  cardArea: { flex: 1, display: 'flex', flexDirection: 'column' as const, padding: '20px 16px 16px' },
  card: (revealed: boolean): React.CSSProperties => ({
    flex: 1, border: '2px solid #000', borderRadius: 12,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '32px 24px', textAlign: 'center', cursor: 'pointer',
    minHeight: 240, marginBottom: 16, position: 'relative',
    background: revealed ? '#f0f0f0' : '#fff', userSelect: 'none',
  }),
  cardHint: { fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#444', marginBottom: 20, fontStyle: 'italic' },
  cardEn: { fontSize: 22, lineHeight: 1.4, marginBottom: 8, color: '#444' },
  cardFr: { fontSize: 32, fontWeight: 'bold', lineHeight: 1.3, color: '#000', marginBottom: 12 },
  cardCat: { fontSize: 12, border: '1px solid #ccc', borderRadius: 20, padding: '3px 12px', color: '#444', fontStyle: 'italic', position: 'absolute' as const, bottom: 16 },
  audioBtn: (playing: boolean): React.CSSProperties => ({
    position: 'absolute', top: 14, right: 14, width: 44, height: 44,
    borderRadius: '50%', border: playing ? '1.5px solid #000' : '1.5px solid #ccc',
    background: playing ? '#f0f0f0' : '#fff', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
  }),
  tapPrompt: { fontSize: 13, color: '#444', textAlign: 'center' as const, marginBottom: 12, fontStyle: 'italic', minHeight: 20 },
  ratingRow: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 4 },
  rBtn: (variant: 'miss' | 'unsure' | 'knew'): React.CSSProperties => ({
    minHeight: 64, borderRadius: 12,
    border: variant === 'miss' ? '2px dashed #000' : '2px solid #000',
    background: variant === 'knew' ? '#000' : '#fff',
    color: variant === 'knew' ? '#fff' : '#000',
    cursor: 'pointer', fontFamily: "Georgia,serif",
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 4, padding: '12px 6px',
  }),
  rLabel: { fontSize: 15, fontWeight: 'bold' },
  rSub: (knew: boolean): React.CSSProperties => ({ fontSize: 10, color: knew ? '#ccc' : '#444', letterSpacing: '0.03em' }),
  doneScreen: { flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center' as const },
  donePct: { fontSize: 72, fontWeight: 'bold', lineHeight: 1, marginBottom: 8 },
  doneMsg: { fontSize: 18, fontStyle: 'italic', color: '#444', marginBottom: 32, lineHeight: 1.5 },
  doneGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, width: '100%', marginBottom: 32 },
  doneStat: { border: '1.5px solid #000', borderRadius: 12, padding: '16px 8px', textAlign: 'center' as const },
  doneStatN: { fontSize: 28, fontWeight: 'bold' },
  doneStatL: { fontSize: 11, color: '#444', marginTop: 4, letterSpacing: '0.04em' },
  restartBtn: { width: '100%', minHeight: 64, border: '2px solid #000', borderRadius: 12, background: '#000', color: '#fff', fontSize: 18, fontFamily: "Georgia,serif", cursor: 'pointer', fontWeight: 'bold' },
  tabNav: { display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '2px solid #000' },
  tabBtn: (active: boolean): React.CSSProperties => ({
    padding: '12px 8px', fontSize: 14, fontWeight: 'bold',
    border: 'none', borderRight: '2px solid #000',
    background: active ? '#000' : '#f0f0f0',
    color: active ? '#fff' : '#444',
    cursor: 'pointer', fontFamily: "Georgia,serif",
  }),
  tabBtnLast: (active: boolean): React.CSSProperties => ({
    padding: '12px 8px', fontSize: 14, fontWeight: 'bold',
    border: 'none',
    background: active ? '#000' : '#f0f0f0',
    color: active ? '#fff' : '#444',
    cursor: 'pointer', fontFamily: "Georgia,serif",
  }),
  refView: { flex: 1, overflowY: 'auto' as const, padding: '12px 16px 40px' },
}

const doneMessages: [number, string][] = [
  [80, 'Excellent travail ! Outstanding.'],
  [60, 'Très bien ! Keep going.'],
  [40, 'Continue ! Progress.'],
  [0, 'Entraîne-toi ! Practice makes perfect.'],
]

export default function FrenchFlashcards() {
  const [tab, setTab] = useState<'drill' | 'ref'>('drill')
  const [activeCat, setActiveCat] = useState<Cat>('All')
  const [deck, setDeck] = useState<FrenchCard[]>([])
  const [queue, setQueue] = useState<FrenchCard[]>([])
  const [current, setCurrent] = useState<FrenchCard | null>(null)
  const [flipped, setFlipped] = useState(false)
  const [scores, setScores] = useState<Scores>({ knew: 0, unsure: 0, miss: 0 })
  const [firstMisses, setFirstMisses] = useState<FrenchCard[]>([])
  const [seenThisRound, setSeenThisRound] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState<Mode>('en-fr')
  const [done, setDone] = useState(false)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setAudioPlaying(false)
  }, [])

  const playAudio = useCallback((fr: string) => {
    stopAudio()
    const url = getAudioUrl(fr)
    if (!url) return
    const a = new Audio(url)
    audioRef.current = a
    setAudioPlaying(true)
    a.onended = () => { setAudioPlaying(false); audioRef.current = null }
    a.onerror = () => { setAudioPlaying(false); audioRef.current = null }
    a.play().catch(() => setAudioPlaying(false))
  }, [stopAudio])

  const startDeck = useCallback((cat: Cat, currentMode: Mode = mode) => {
    stopAudio()
    const filtered = cat === 'All' ? FRENCH_CARDS : FRENCH_CARDS.filter(c => c.cat === cat)
    const cards = shuffle(filtered)
    setActiveCat(cat)
    setDeck(cards)
    setScores({ knew: 0, unsure: 0, miss: 0 })
    setFirstMisses([])
    setSeenThisRound(new Set())
    setFlipped(false)
    setDone(false)
    const first = cards[0] || null
    setCurrent(first)
    setQueue(cards.slice(1))
    if (first && currentMode === 'fr-en') {
      setTimeout(() => playAudio(first.fr), 100)
    }
  }, [mode, stopAudio, playAudio])

  useEffect(() => {
    startDeck('All')
  }, [])

  const progress = deck.length > 0 ? Math.round((scores.knew / deck.length) * 100) : 0

  const handleFlip = () => {
    if (flipped || !current) return
    setFlipped(true)
    if (mode === 'en-fr') {
      playAudio(current.fr)
    }
  }

  const handleRate = (r: 'knew' | 'unsure' | 'miss') => {
    if (!current) return
    stopAudio()
    setScores(prev => ({ ...prev, [r]: prev[r] + 1 }))

    let newFirstMisses = firstMisses
    if (!seenThisRound.has(current.id)) {
      setSeenThisRound(prev => { const s = new Set(Array.from(prev)); s.add(current.id); return s })
      if (r !== 'knew') newFirstMisses = [...firstMisses, current]
      setFirstMisses(newFirstMisses)
    }

    setQueue(prev => {
      const next = [...prev]
      if (r === 'miss') next.push(current)
      else if (r === 'unsure') next.splice(Math.min(4, next.length), 0, current)

      if (next.length === 0) {
        setDone(true)
        setCurrent(null)
        return []
      }
      const nextCard = next.shift()!
      setCurrent(nextCard)
      setFlipped(false)
      if (mode === 'fr-en') {
        setTimeout(() => playAudio(nextCard.fr), 50)
      }
      return next
    })
  }

  const handleChangeMode = (m: Mode) => {
    setMode(m)
    startDeck(activeCat, m)
  }

  const remaining = queue.length + (current ? 1 : 0)
  const total = scores.knew + scores.unsure + scores.miss
  const donePct = total > 0 ? Math.round((scores.knew / total) * 100) : 0
  const doneMsg = doneMessages.find(([n]) => donePct >= n)![1]

  return (
    <div style={s.root}>
      {/* Tab nav */}
      <div style={s.tabNav}>
        <button style={s.tabBtn(tab === 'drill')} onClick={() => setTab('drill')}>Drill</button>
        <button style={s.tabBtnLast(tab === 'ref')} onClick={() => setTab('ref')}>Reference</button>
      </div>

      {/* Drill view */}
      {tab === 'drill' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* Stats */}
          <div style={s.statsBar}>
            <div style={s.stat}><div style={s.statN}>{scores.knew}</div><div style={s.statL}>Knew it</div></div>
            <div style={s.stat}><div style={s.statN}>{scores.unsure}</div><div style={s.statL}>Unsure</div></div>
            <div style={s.statLast}><div style={s.statN}>{scores.miss}</div><div style={s.statL}>Missed</div></div>
          </div>

          {/* Progress bar */}
          <div style={s.progressWrap}>
            <div style={{ height: '100%', background: '#000', width: `${progress}%`, transition: 'width 0.2s' }} />
          </div>

          {/* Category buttons */}
          <div style={s.deckWrap}>
            <button style={s.deckBtn(activeCat === 'All')} onClick={() => startDeck('All')}>All</button>
            {CATS.map(cat => (
              <button key={cat} style={s.deckBtn(activeCat === cat)} onClick={() => startDeck(cat)}>
                {CAT_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Mode buttons */}
          <div style={s.modeWrap}>
            <button style={s.modeBtn(mode === 'en-fr')} onClick={() => handleChangeMode('en-fr')}>English → Français</button>
            <button style={s.modeBtnLast(mode === 'fr-en')} onClick={() => handleChangeMode('fr-en')}>Français → English</button>
          </div>

          {/* Queue count */}
          <div style={{ padding: '6px 16px 0', fontSize: 12, color: '#999', fontStyle: 'italic', textAlign: 'right' }}>
            {remaining} remaining
          </div>

          {/* Card area */}
          {!done ? (
            <div style={s.cardArea}>
              {current && (
                <div style={s.card(flipped)} onClick={handleFlip}>
                  <button
                    style={s.audioBtn(audioPlaying)}
                    onClick={e => { e.stopPropagation(); if (current) playAudio(current.fr) }}
                  >
                    ▶
                  </button>
                  <div style={s.cardHint}>
                    {!flipped
                      ? (mode === 'en-fr' ? 'what is this in French?' : 'what does this mean?')
                      : (mode === 'en-fr' ? 'français' : 'english meaning')}
                  </div>
                  {mode === 'en-fr' && !flipped && <div style={s.cardEn}>{current.en}</div>}
                  {mode === 'en-fr' && flipped && <div style={s.cardFr}>{current.fr}</div>}
                  {mode === 'fr-en' && !flipped && <div style={s.cardFr}>{current.fr}</div>}
                  {mode === 'fr-en' && flipped && <div style={s.cardEn}>{current.en}</div>}
                  <div style={s.cardCat}>{CAT_LABELS[current.cat] || current.cat}</div>
                </div>
              )}

              <div style={s.tapPrompt}>{!flipped ? 'tap card to reveal' : ''}</div>

              <div style={{ ...s.ratingRow, visibility: flipped ? 'visible' : 'hidden' }}>
                <button style={s.rBtn('miss')} onClick={() => handleRate('miss')}>
                  <span style={s.rLabel}>Miss</span>
                  <span style={s.rSub(false)}>comes back</span>
                </button>
                <button style={s.rBtn('unsure')} onClick={() => handleRate('unsure')}>
                  <span style={s.rLabel}>Unsure</span>
                  <span style={s.rSub(false)}>soon again</span>
                </button>
                <button style={s.rBtn('knew')} onClick={() => handleRate('knew')}>
                  <span style={s.rLabel}>Knew it</span>
                  <span style={s.rSub(true)}>spaced out</span>
                </button>
              </div>
            </div>
          ) : (
            <div style={s.cardArea}>
              <div style={s.doneScreen}>
                <div style={s.donePct}>{donePct}%</div>
                <div style={s.doneMsg}>{doneMsg}</div>
                <div style={s.doneGrid}>
                  <div style={s.doneStat}><div style={s.doneStatN}>{scores.knew}</div><div style={s.doneStatL}>Knew it</div></div>
                  <div style={s.doneStat}><div style={s.doneStatN}>{scores.unsure}</div><div style={s.doneStatL}>Unsure</div></div>
                  <div style={s.doneStat}><div style={s.doneStatN}>{scores.miss}</div><div style={s.doneStatL}>Missed it</div></div>
                </div>
                <div style={{ width: '100%', textAlign: 'left', marginBottom: 24 }}>
                  <div style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#444', marginBottom: 10, fontFamily: 'Georgia,serif' }}>
                    First attempt misses
                  </div>
                  {firstMisses.length === 0 ? (
                    <div style={{ fontStyle: 'italic', color: '#444', fontSize: 14 }}>Parfait ! Pas une seule erreur !</div>
                  ) : (
                    firstMisses.map((c, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '9px 0', borderBottom: '1px solid #ccc' }}>
                        <span style={{ fontWeight: 'bold', fontSize: 16 }}>{c.fr}</span>
                        <span style={{ color: '#444', fontSize: 14 }}>{c.en}</span>
                      </div>
                    ))
                  )}
                </div>
                <button style={s.restartBtn} onClick={() => startDeck(activeCat)}>
                  Recommencer · drill again
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reference view */}
      {tab === 'ref' && (
        <div style={s.refView}>
          {CATS.map(cat => (
            <RefSection key={cat} title={CAT_LABELS[cat]} note={REF_NOTES[cat]}>
              <RefTable
                cols={['French', 'English', 'Note']}
                rows={FRENCH_CARDS.filter(c => c.cat === cat).map(c => [c.fr, c.en, c.note || ''])}
              />
            </RefSection>
          ))}
        </div>
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = {
  fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#444',
  padding: '6px 8px', borderBottom: '1.5px solid #000', textAlign: 'left', fontWeight: 'normal',
}
const tdStyle: React.CSSProperties = {
  padding: '9px 8px', borderBottom: '1px solid #ccc', fontSize: 15, verticalAlign: 'top',
}
const tdAltStyle: React.CSSProperties = { ...tdStyle, background: '#f0f0f0' }

function RefSection({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontSize: 16, fontWeight: 'bold', borderBottom: '2px solid #000', paddingBottom: 6, marginBottom: 4 }}>{title}</div>
      {note && <div style={{ fontSize: 13, color: '#444', fontStyle: 'italic', marginBottom: 12, lineHeight: 1.6, padding: '8px 0' }} dangerouslySetInnerHTML={{ __html: note }} />}
      {children}
    </div>
  )
}

function RefTable({ cols, rows }: { cols: string[]; rows: string[][] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>{cols.map((c, i) => <th key={i} style={thStyle}>{c}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j} style={{ ...(i % 2 === 0 ? tdStyle : tdAltStyle), fontWeight: j === 0 ? 'bold' : 'normal' }}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

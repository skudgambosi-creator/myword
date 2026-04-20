'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { ALL_CARDS, DECKS, getAudioUrl, type Card } from '@/lib/tongues/te-reo-data'

type DeckName = 'all' | 'vocab' | 'sentences' | 'particles' | 'pronouns' | 'numbers' | 'possessives' | 'colours' | 'shapes' | 'body'
type Mode = 'en' | 'tr'

interface Scores { knew: number; unsure: number; miss: number }

const DECK_BUTTONS: { name: DeckName; label: string }[] = [
  { name: 'all', label: 'All' },
  { name: 'vocab', label: 'Vocab' },
  { name: 'sentences', label: 'Sentences' },
  { name: 'particles', label: 'Particles' },
  { name: 'pronouns', label: 'Pronouns' },
  { name: 'numbers', label: 'Numbers' },
  { name: 'possessives', label: 'Possessives' },
  { name: 'colours', label: 'Colours' },
  { name: 'shapes', label: 'Shapes' },
  { name: 'body', label: 'Body' },
]

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
  cardTr: { fontSize: 36, fontWeight: 'bold', lineHeight: 1.3, color: '#000', marginBottom: 12 },
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
  refSection: { marginBottom: 32 },
  refTitle: { fontSize: 16, fontWeight: 'bold', borderBottom: '2px solid #000', paddingBottom: 6, marginBottom: 4 },
  refNote: { fontSize: 13, color: '#444', fontStyle: 'italic', marginBottom: 12, lineHeight: 1.6, padding: '8px 0' },
}

const doneMessages: [number, string][] = [
  [80, 'Ka pai rawa atu! Outstanding.'],
  [60, 'Ka pai! Keep going.'],
  [40, 'Kia kaha — progress!'],
  [0, 'Ka mutu. Practice makes perfect!'],
]

export default function TeReoFlashcards() {
  const [tab, setTab] = useState<'drill' | 'ref'>('drill')
  const [activeDeck, setActiveDeck] = useState<DeckName>('all')
  const [deck, setDeck] = useState<Card[]>([])
  const [queue, setQueue] = useState<Card[]>([])
  const [current, setCurrent] = useState<Card | null>(null)
  const [flipped, setFlipped] = useState(false)
  const [scores, setScores] = useState<Scores>({ knew: 0, unsure: 0, miss: 0 })
  const [firstMisses, setFirstMisses] = useState<Card[]>([])
  const [seenThisRound, setSeenThisRound] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState<Mode>('en')
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

  const playAudio = useCallback((tr: string) => {
    stopAudio()
    const url = getAudioUrl(tr)
    if (!url) return
    const a = new Audio(url)
    audioRef.current = a
    setAudioPlaying(true)
    a.onended = () => { setAudioPlaying(false); audioRef.current = null }
    a.onerror = () => { setAudioPlaying(false); audioRef.current = null }
    a.play().catch(() => setAudioPlaying(false))
  }, [stopAudio])

  const startDeck = useCallback((name: DeckName, currentMode: Mode = mode) => {
    stopAudio()
    const cards = shuffle(DECKS[name] || ALL_CARDS)
    setActiveDeck(name)
    setDeck(cards)
    setQueue([...cards])
    setScores({ knew: 0, unsure: 0, miss: 0 })
    setFirstMisses([])
    setSeenThisRound(new Set())
    setFlipped(false)
    setDone(false)
    const first = cards[0] || null
    setCurrent(cards[0] || null)
    setQueue(cards.slice(1))
    if (first && currentMode === 'tr') {
      setTimeout(() => playAudio(first.tr), 100)
    }
  }, [mode, stopAudio, playAudio])

  useEffect(() => {
    startDeck('all')
  }, [])

  const progress = deck.length > 0 ? Math.round((scores.knew / deck.length) * 100) : 0

  const handleFlip = () => {
    if (flipped || !current) return
    setFlipped(true)
    if (mode === 'en') {
      playAudio(current.tr)
    }
  }

  const handleRate = (r: 'knew' | 'unsure' | 'miss') => {
    if (!current) return
    stopAudio()
    setScores(prev => ({ ...prev, [r]: prev[r] + 1 }))

    let newFirstMisses = firstMisses
    if (!seenThisRound.has(current.tr)) {
      setSeenThisRound(prev => { const s = new Set(Array.from(prev)); s.add(current.tr); return s })
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
      if (mode === 'tr') {
        setTimeout(() => playAudio(nextCard.tr), 50)
      }
      return next
    })
  }

  const handleChangeMode = (m: Mode) => {
    setMode(m)
    startDeck(activeDeck, m)
  }

  const remaining = queue.length + (current ? 1 : 0)
  const hasAudio = current ? !!getAudioUrl(current.tr) : false
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

          {/* Deck buttons */}
          <div style={s.deckWrap}>
            {DECK_BUTTONS.map(({ name, label }) => (
              <button key={name} style={s.deckBtn(activeDeck === name)} onClick={() => startDeck(name)}>
                {label}
              </button>
            ))}
          </div>

          {/* Mode buttons */}
          <div style={s.modeWrap}>
            <button style={s.modeBtn(mode === 'en')} onClick={() => handleChangeMode('en')}>English → te reo</button>
            <button style={s.modeBtnLast(mode === 'tr')} onClick={() => handleChangeMode('tr')}>Te reo → English</button>
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
                  {hasAudio && (
                    <button
                      style={s.audioBtn(audioPlaying)}
                      onClick={e => { e.stopPropagation(); if (current) playAudio(current.tr) }}
                    >
                      ▶
                    </button>
                  )}
                  <div style={s.cardHint}>
                    {!flipped
                      ? (mode === 'en' ? 'what is this in te reo?' : 'what does this mean?')
                      : (mode === 'en' ? 'te reo māori' : 'english meaning')}
                  </div>
                  {mode === 'en' && !flipped && <div style={s.cardEn}>{current.en}</div>}
                  {mode === 'en' && flipped && <div style={s.cardTr}>{current.tr}</div>}
                  {mode === 'tr' && !flipped && <div style={s.cardTr}>{current.tr}</div>}
                  {mode === 'tr' && flipped && <div style={s.cardEn}>{current.en}</div>}
                  <div style={s.cardCat}>{current.cat}</div>
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
                    <div style={{ fontStyle: 'italic', color: '#444', fontSize: 14 }}>Ka pai — no misses on first attempt!</div>
                  ) : (
                    firstMisses.map((c, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '9px 0', borderBottom: '1px solid #ccc' }}>
                        <span style={{ fontWeight: 'bold', fontSize: 16 }}>{c.tr}</span>
                        <span style={{ color: '#444', fontSize: 14 }}>{c.en}</span>
                      </div>
                    ))
                  )}
                </div>
                <button style={s.restartBtn} onClick={() => startDeck(activeDeck)}>
                  Ka haere anō — go again
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reference view */}
      {tab === 'ref' && (
        <div style={s.refView}>

          <RefSection title="Greetings & basics" note="Use tēnā koe / kōrua / koutou for formal settings depending on how many people you're addressing. Kia ora works everywhere, any number.">
            <RefTable rows={[
              ['kia ora', 'hello / thank you'],
              ['tēnā koe', 'greetings (to one)'],
              ['tēnā kōrua', 'greetings (to two)'],
              ['tēnā koutou', 'greetings (to three+)'],
              ['nau mai', 'welcome'],
              ['haere rā', 'goodbye (to someone leaving)'],
              ['e noho rā', 'goodbye (said by the one leaving)'],
              ['āe', 'yes'],
              ['kāo', 'no'],
            ]} />
          </RefSection>

          <RefSection title="Pronouns" note="Te reo has singular, dual (two people), and plural (three+) — plus inclusive vs exclusive 'we'. Green = speaker, blue = listener, gray = others.">
            <PronounSVG />
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
              <thead><tr><th style={thStyle}>Te Reo</th><th style={thStyle}>English</th><th style={thStyle}>Type</th></tr></thead>
              <tbody>
                {[['au','I / me','singular'],['koe','you (one)','singular'],['ia','he/she/they (one)','singular'],
                  ['tāua','we two — incl you','dual'],['māua','we two — excl you','dual'],
                  ['kōrua','you two','dual'],['rāua','they two','dual'],
                  ['tātou','we all — incl you','plural'],['mātou','we (3+) — excl you','plural'],
                  ['koutou','you all (3+)','plural'],['rātou','they (3+)','plural'],
                ].map(([tr,en,type],i) => (
                  <tr key={i}><td style={i%2===0?tdStyle:tdAltStyle}>{tr}</td><td style={i%2===0?tdStyle:tdAltStyle}>{en}</td><td style={{...(i%2===0?tdStyle:tdAltStyle),fontSize:13,color:'#555'}}>{type}</td></tr>
                ))}
              </tbody>
            </table>
          </RefSection>

          <RefSection title="Question words" note="Questions are formed by putting these at the start of a sentence. He aha = what, Ko wai = who (using ko for identity).">
            <RefTable rows={[['aha','what'],['wai','who'],['hea','where'],['āhea','when (future)'],['nōnahea','when (past)'],['pēhea','how / what like'],['hia','how many']]} />
          </RefSection>

          <RefSection title="Verbs" note="Verbs don't change form in te reo — tense is carried by the particle before them (kei te, i, ka). The verb always comes first in a sentence.">
            <RefTable rows={[['kai','eat (also: food)'],['moe','sleep'],['haere','go / travel'],['hoki','return / also'],['noho','sit / stay / live'],['kōrero','speak / talk'],['whakarongo','listen'],['titiro','look'],['mahi','work / do'],['ako','learn / teach'],['aroha','love / care'],['tū','stand'],['oma','run'],['huri','turn'],['homai','give (to me)'],['mōhio','know / understand']]} />
          </RefSection>

          <RefSection title="Nouns" note="Some words carry layered meanings — marama means moon, month, and understanding. Whenua means both land and placenta. These double meanings are culturally significant, not coincidental.">
            <RefTable rows={[['whare','house / building'],['kāinga','home / village'],['wāhi','place'],['whenua','land / placenta'],['moana','sea / ocean'],['awa','river'],['maunga','mountain'],['ngahere','forest'],['rangi','sky / day'],['rā','sun / day / sail'],['marama','moon / month / understanding'],['wai','water'],['ahi','fire'],['tangata','person'],['tāne','man'],['wahine','woman'],['tamariki','children'],['tamaiti','child'],['whānau','family'],['iwi','tribe / people / bones'],['hapū','subtribe / pregnant'],['ingoa','name'],['reo','language / voice'],['waka','canoe / vehicle'],['pō','night'],['atarau','moonlit / reflected moonlight'],['katoa','all / everyone / everything']]} />
          </RefSection>

          <RefSection title="Body parts" note="Manawa (breath/heart/lungs) is a rich word — it carries the sense of vitality and life force. Kanohi technically means face but is also used for eye. Ringa covers both hand and arm.">
            <RefTable rows={[['tinana','body'],['upoko','head'],['kanohi','face / eye'],['taringa','ear'],['ihu','nose'],['waha','mouth'],['ringa','hand / arm'],['waewae','foot / leg'],['manawa','breath / heart / lungs'],['ngākau','heart / innermost feelings']]} />
          </RefSection>

          <RefSection title="Descriptors" note="Descriptors follow the noun they describe — he tangata pai ia (he is a good person). Pai is probably the most useful single word in the language.">
            <RefTable rows={[['pai','good'],['kino','bad'],['nui','big / many'],['iti','small'],['roa','long / tall'],['poto','short'],['hou','new'],['tawhito','old'],['ataahua','beautiful'],['kaha','strong'],['ngenge','tired'],['hiakai','hungry'],['hiainu','thirsty'],['hari','happy'],['pōuri','sad'],['tika','correct / right'],['hē','wrong'],['whakatoi','cheeky / playfully mischievous'],['rawe','awesome / excellent / fantastic'],['pōkarekare','rippling / agitated (as water)']]} />
          </RefSection>

          <RefSection title="Numbers" note="Beyond 10 the system is logical: tekau mā tahi = 11, rua tekau = 20. Kore (zero) also means void and nothingness — it appears in the Māori creation narrative as the primordial state before existence.">
            <RefTable rows={[['kore','zero / void / nothingness'],['tahi','one'],['rua','two'],['toru','three'],['whā','four'],['rima','five'],['ono','six'],['whitu','seven'],['waru','eight'],['iwa','nine'],['tekau','ten'],['tekau mā tahi','eleven'],['rua tekau','twenty'],['kotahi rau','one hundred'],['kotahi mano','one thousand']]} />
          </RefSection>

          <RefSection title="Time" note="Te reo expresses time through context and particles rather than verb tenses. These words combine with kei te / i / ka to anchor when something happens.">
            <RefTable rows={[['ata','morning / dawn'],['ao','daytime / world / dawn'],['ahiahi','afternoon / evening'],['pō','night'],['ināianei','now'],['āpōpō','tomorrow'],['inanahi','yesterday'],['i tēnei rā','today']]} />
          </RefSection>

          <RefSection title="Directional particles" note="These four particles attach to verbs to show direction relative to the speaker. Haere mai = come towards me, haere atu = go away. Whakarongo mai means listen here!">
            <RefTable rows={[['mai','towards the speaker'],['atu','away from the speaker'],['ake','upward'],['iho','downward']]} />
          </RefSection>

          <RefSection title="Core particles" note="Te reo is VSO (verb-subject-object) — the particle always opens the sentence and signals what kind of sentence it is.">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={thStyle}>Particle</th><th style={thStyle}>Function</th></tr></thead>
              <tbody>
                {[['kei te','present action — kei te kai au (I am eating)'],['i','past action — i haere au (I went)'],['ka','narrative / sequence — ka haere ia (she went)'],['e...ana','emphatic present — e kai ana au (I am eating right now)'],['me','should — me haere tāua (we should go)'],['ko','identity — ko Mere tōku ingoa (my name is Mere)'],['he','a / an — he tangata pai ia (he is a good person)'],['kei','present location — kei te kāinga au (I am at home)'],['te','the (singular)'],['ngā','the (plural)'],['ki','to / towards'],['nō','from / origin'],['nā','by / belonging to (recent)'],['kāore','no / not'],['ehara','is not'],
                ].map(([tr,fn],i) => (
                  <tr key={i}><td style={{...(i%2===0?tdStyle:tdAltStyle),fontWeight:'bold',width:'35%'}}>{tr}</td><td style={i%2===0?tdStyle:tdAltStyle}>{fn}</td></tr>
                ))}
              </tbody>
            </table>
          </RefSection>

          <RefSection title="Possessives" note="Ō class = things you inhabit or are subordinate to (family, body, feelings, home). Ā class = things you control or act upon (objects you make, food you eat). Tō- for people/places, tā- for things you do.">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={thStyle}>Te Reo</th><th style={thStyle}>English</th><th style={thStyle}>Class</th></tr></thead>
              <tbody>
                {[['tōku','my','ō — people, places, feelings'],['tōu','your (one person)','ō'],['tāku','my','ā — actions, objects'],['tāu','your (one person)','ā'],
                ].map(([tr,en,cls],i) => (
                  <tr key={i}><td style={i%2===0?tdStyle:tdAltStyle}>{tr}</td><td style={i%2===0?tdStyle:tdAltStyle}>{en}</td><td style={{...(i%2===0?tdStyle:tdAltStyle),fontSize:13,color:'#555'}}>{cls}</td></tr>
                ))}
              </tbody>
            </table>
          </RefSection>

          <RefSection title="Shapes">
            <RefTable rows={[['tapatoru','triangle'],['tapawhā','square / rectangle'],['porohīta','circle'],['whetu','star'],['porotītaha','oval / ellipse']]} />
          </RefSection>

          <RefSection title="Colours" note="Colours in te reo often have natural world origins — kākāriki is both green and a native parakeet, kōwhai is both yellow and the native flowering tree.">
            <RefTable rows={[['whero','red'],['kōwhai','yellow'],['kākāriki','green'],['kikorangi','blue'],['mā','white'],['mangu','black'],['karaka','orange'],['kākaka','brown'],['māwhero','pink'],['pāpura','purple']]} />
          </RefSection>

          <RefSection title="Sentence templates" note="The core pattern: [particle] + [verb] + [subject] + [location/object]. Kei te is your most useful particle — put it before almost any verb for a present tense sentence.">
            <RefTable rows={[['kei te kai au','I am eating'],['kei te pai','it\'s good / that\'s fine'],['kei te ngenge au','I\'m tired'],['kei te hiakai au','I\'m hungry'],['i haere au','I went'],['ka haere ia','she / he went'],['me haere tāua','we two should go'],['ko ___ tōku ingoa','my name is ___'],['ko wai tōu ingoa?','what is your name?'],['nō hea koe?','where are you from?'],['he aha tāu mahi?','what are you doing?'],['kāore au e mōhio ana','I don\'t know'],['whakarongo mai!','listen here!'],['kia kaha','be strong / keep going'],['ka kite anō','see you again'],['ka nui te hari o tōku ngākau','my heart is very happy']]} />
          </RefSection>

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
const tdAltStyle: React.CSSProperties = {
  ...tdStyle, background: '#f0f0f0',
}

function RefSection({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontSize: 16, fontWeight: 'bold', borderBottom: '2px solid #000', paddingBottom: 6, marginBottom: 4 }}>{title}</div>
      {note && <div style={{ fontSize: 13, color: '#444', fontStyle: 'italic', marginBottom: 12, lineHeight: 1.6, padding: '8px 0' }}>{note}</div>}
      {children}
    </div>
  )
}

function RefTable({ rows }: { rows: [string, string][] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr><th style={thStyle}>Te Reo</th><th style={thStyle}>English</th></tr></thead>
      <tbody>
        {rows.map(([tr, en], i) => (
          <tr key={i}>
            <td style={{ ...(i % 2 === 0 ? tdStyle : tdAltStyle), fontWeight: 'bold', width: '45%' }}>{tr}</td>
            <td style={i % 2 === 0 ? tdStyle : tdAltStyle}>{en}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function PronounSVG() {
  return (
    <svg viewBox="0 0 340 440" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 340, display: 'block', margin: '8px auto 12px' }}>
      <defs><style>{`.pl{font-family:Georgia,serif;font-size:13px;font-weight:bold;fill:#000}.ps{font-family:Georgia,serif;font-size:10px;fill:#555;font-style:italic}`}</style></defs>
      <text x="170" y="14" textAnchor="middle" className="ps">singular</text>
      <rect x="8" y="20" width="62" height="46" rx="7" fill="none" stroke="#000" strokeWidth="2"/>
      <circle cx="26" cy="36" r="8" fill="#1a7a4a"/><path d="M18 50 Q26 45 34 50" stroke="#1a7a4a" strokeWidth="1.5" fill="none"/>
      <circle cx="52" cy="36" r="8" fill="#bbb"/><path d="M44 50 Q52 45 60 50" stroke="#bbb" strokeWidth="1.5" fill="none"/>
      <text x="39" y="78" textAnchor="middle" className="pl">au</text>
      <text x="39" y="89" textAnchor="middle" className="ps">I / me</text>
      <rect x="139" y="20" width="62" height="46" rx="7" fill="none" stroke="#000" strokeWidth="2"/>
      <circle cx="157" cy="36" r="8" fill="#1a7a4a"/><path d="M149 50 Q157 45 165 50" stroke="#1a7a4a" strokeWidth="1.5" fill="none"/>
      <circle cx="183" cy="36" r="8" fill="#1a6aaa"/><path d="M175 50 Q183 45 191 50" stroke="#1a6aaa" strokeWidth="1.5" fill="none"/>
      <text x="170" y="78" textAnchor="middle" className="pl">koe</text>
      <text x="170" y="89" textAnchor="middle" className="ps">you (one)</text>
      <rect x="260" y="20" width="62" height="46" rx="7" fill="none" stroke="#000" strokeWidth="2"/>
      <circle cx="279" cy="36" r="8" fill="#1a7a4a"/><path d="M271 50 Q279 45 287 50" stroke="#1a7a4a" strokeWidth="1.5" fill="none"/>
      <circle cx="304" cy="36" r="8" fill="#888"/><path d="M296 50 Q304 45 312 50" stroke="#888" strokeWidth="1.5" fill="none"/>
      <text x="291" y="78" textAnchor="middle" className="pl">ia</text>
      <text x="291" y="89" textAnchor="middle" className="ps">he/she/they</text>
      <text x="170" y="108" textAnchor="middle" className="ps">dual (two people)</text>
      <rect x="2" y="114" width="72" height="64" rx="7" fill="none" stroke="#000" strokeWidth="2"/>
      <circle cx="22" cy="128" r="8" fill="#1a7a4a"/><path d="M14 142 Q22 137 30 142" stroke="#1a7a4a" strokeWidth="1.5" fill="none"/>
      <circle cx="52" cy="128" r="8" fill="#1a6aaa"/><path d="M44 142 Q52 137 60 142" stroke="#1a6aaa" strokeWidth="1.5" fill="none"/>
      <circle cx="37" cy="154" r="8" fill="#bbb"/><path d="M29 168 Q37 163 45 168" stroke="#bbb" strokeWidth="1.5" fill="none"/>
      <text x="38" y="190" textAnchor="middle" className="pl">tāua</text>
      <text x="38" y="201" textAnchor="middle" className="ps">we two (incl)</text>
      <rect x="94" y="130" width="72" height="46" rx="7" fill="none" stroke="#000" strokeWidth="2"/>
      <circle cx="114" cy="130" r="8" fill="#1a7a4a"/><path d="M106 144 Q114 139 122 144" stroke="#1a7a4a" strokeWidth="1.5" fill="none"/>
      <circle cx="152" cy="114" r="8" fill="#1a6aaa"/><path d="M144 128 Q152 123 160 128" stroke="#1a6aaa" strokeWidth="1.5" fill="none"/>
      <circle cx="144" cy="154" r="8" fill="#888"/><path d="M136 168 Q144 163 152 168" stroke="#888" strokeWidth="1.5" fill="none"/>
      <text x="130" y="190" textAnchor="middle" className="pl">māua</text>
      <text x="130" y="201" textAnchor="middle" className="ps">we two (excl)</text>
      <circle cx="210" cy="114" r="8" fill="#1a7a4a"/><path d="M202 128 Q210 123 218 128" stroke="#1a7a4a" strokeWidth="1.5" fill="none"/>
      <rect x="196" y="124" width="72" height="46" rx="7" fill="none" stroke="#000" strokeWidth="2"/>
      <circle cx="216" cy="140" r="8" fill="#1a6aaa"/><path d="M208 154 Q216 149 224 154" stroke="#1a6aaa" strokeWidth="1.5" fill="none"/>
      <circle cx="248" cy="140" r="8" fill="#1a6aaa"/><path d="M240 154 Q248 149 256 154" stroke="#1a6aaa" strokeWidth="1.5" fill="none"/>
      <text x="232" y="190" textAnchor="middle" className="pl">kōrua</text>
      <text x="232" y="201" textAnchor="middle" className="ps">you two</text>
      <circle cx="305" cy="114" r="8" fill="#1a7a4a"/><path d="M297 128 Q305 123 313 128" stroke="#1a7a4a" strokeWidth="1.5" fill="none"/>
      <rect x="286" y="124" width="52" height="46" rx="7" fill="none" stroke="#000" strokeWidth="2"/>
      <circle cx="300" cy="140" r="8" fill="#888"/><path d="M292 154 Q300 149 308 154" stroke="#888" strokeWidth="1.5" fill="none"/>
      <circle cx="324" cy="140" r="8" fill="#888"/><path d="M316 154 Q324 149 332 154" stroke="#888" strokeWidth="1.5" fill="none"/>
      <text x="312" y="190" textAnchor="middle" className="pl">rāua</text>
      <text x="312" y="201" textAnchor="middle" className="ps">they two</text>
      <text x="170" y="220" textAnchor="middle" className="ps">plural (three or more)</text>
      <rect x="2" y="226" width="72" height="80" rx="7" fill="none" stroke="#000" strokeWidth="2"/>
      <circle cx="22" cy="242" r="8" fill="#1a7a4a"/><path d="M14 256 Q22 251 30 256" stroke="#1a7a4a" strokeWidth="1.5" fill="none"/>
      <circle cx="52" cy="242" r="8" fill="#1a6aaa"/><path d="M44 256 Q52 251 60 256" stroke="#1a6aaa" strokeWidth="1.5" fill="none"/>
      <circle cx="22" cy="270" r="8" fill="#888"/><path d="M14 284 Q22 279 30 284" stroke="#888" strokeWidth="1.5" fill="none"/>
      <circle cx="52" cy="270" r="8" fill="#888"/><path d="M44 284 Q52 279 60 284" stroke="#888" strokeWidth="1.5" fill="none"/>
      <text x="38" y="320" textAnchor="middle" className="pl">tātou</text>
      <text x="38" y="331" textAnchor="middle" className="ps">we all (incl)</text>
      <rect x="94" y="242" width="72" height="64" rx="7" fill="none" stroke="#000" strokeWidth="2"/>
      <circle cx="114" cy="242" r="8" fill="#1a7a4a"/><path d="M106 256 Q114 251 122 256" stroke="#1a7a4a" strokeWidth="1.5" fill="none"/>
      <circle cx="152" cy="226" r="8" fill="#1a6aaa"/><path d="M144 240 Q152 235 160 240" stroke="#1a6aaa" strokeWidth="1.5" fill="none"/>
      <circle cx="114" cy="270" r="8" fill="#888"/><path d="M106 284 Q114 279 122 284" stroke="#888" strokeWidth="1.5" fill="none"/>
      <circle cx="144" cy="270" r="8" fill="#888"/><path d="M136 284 Q144 279 152 284" stroke="#888" strokeWidth="1.5" fill="none"/>
      <text x="130" y="320" textAnchor="middle" className="pl">mātou</text>
      <text x="130" y="331" textAnchor="middle" className="ps">we (excl)</text>
      <circle cx="210" cy="226" r="8" fill="#1a7a4a"/><path d="M202 240 Q210 235 218 240" stroke="#1a7a4a" strokeWidth="1.5" fill="none"/>
      <rect x="196" y="236" width="72" height="70" rx="7" fill="none" stroke="#000" strokeWidth="2"/>
      <circle cx="216" cy="252" r="8" fill="#1a6aaa"/><path d="M208 266 Q216 261 224 266" stroke="#1a6aaa" strokeWidth="1.5" fill="none"/>
      <circle cx="248" cy="252" r="8" fill="#1a6aaa"/><path d="M240 266 Q248 261 256 266" stroke="#1a6aaa" strokeWidth="1.5" fill="none"/>
      <circle cx="232" cy="278" r="8" fill="#1a6aaa"/><path d="M224 292 Q232 287 240 292" stroke="#1a6aaa" strokeWidth="1.5" fill="none"/>
      <text x="232" y="320" textAnchor="middle" className="pl">koutou</text>
      <text x="232" y="331" textAnchor="middle" className="ps">you all</text>
      <circle cx="305" cy="226" r="8" fill="#1a7a4a"/><path d="M297 240 Q305 235 313 240" stroke="#1a7a4a" strokeWidth="1.5" fill="none"/>
      <rect x="284" y="236" width="54" height="70" rx="7" fill="none" stroke="#000" strokeWidth="2"/>
      <circle cx="298" cy="252" r="8" fill="#888"/><path d="M290 266 Q298 261 306 266" stroke="#888" strokeWidth="1.5" fill="none"/>
      <circle cx="326" cy="252" r="8" fill="#888"/><path d="M318 266 Q326 261 334 266" stroke="#888" strokeWidth="1.5" fill="none"/>
      <circle cx="312" cy="278" r="8" fill="#888"/><path d="M304 292 Q312 287 320 292" stroke="#888" strokeWidth="1.5" fill="none"/>
      <text x="311" y="320" textAnchor="middle" className="pl">rātou</text>
      <text x="311" y="331" textAnchor="middle" className="ps">they (3+)</text>
      <rect x="4" y="348" width="332" height="38" rx="6" fill="#f0f0f0"/>
      <circle cx="22" cy="367" r="6" fill="#1a7a4a"/><text x="32" y="371" className="ps">speaker</text>
      <circle cx="90" cy="367" r="6" fill="#1a6aaa"/><text x="100" y="371" className="ps">listener</text>
      <circle cx="160" cy="367" r="6" fill="#888"/><text x="170" y="371" className="ps">other(s)</text>
      <rect x="228" y="360" width="18" height="14" rx="3" fill="none" stroke="#000" strokeWidth="2"/>
      <text x="250" y="371" className="ps">= included</text>
      <text x="170" y="410" textAnchor="middle" className="ps">incl = listener included · excl = listener excluded</text>
    </svg>
  )
}

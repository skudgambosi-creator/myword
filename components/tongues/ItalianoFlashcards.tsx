'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { ITALIANO_CARDS, ITALIANO_CATS, type ItalianoCard } from '@/lib/tongues/italiano-data'

type Mode = 'en-it' | 'it-en'
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
  cardIt: { fontSize: 36, fontWeight: 'bold', lineHeight: 1.3, color: '#000', marginBottom: 12 },
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
  [80, 'Ottimo lavoro! Outstanding.'],
  [60, 'Molto bene! Keep going.'],
  [40, 'Continua — progress!'],
  [0, 'Prattica! Practice makes perfect.'],
]

function playTTS(text: string) {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=it&client=tw-ob`
  const audio = new Audio(url)
  audio.play().catch(() => {})
}

export default function ItalianoFlashcards() {
  const [tab, setTab] = useState<'drill' | 'ref'>('drill')
  const [activeCat, setActiveCat] = useState<Cat>('All')
  const [deck, setDeck] = useState<ItalianoCard[]>([])
  const [queue, setQueue] = useState<ItalianoCard[]>([])
  const [current, setCurrent] = useState<ItalianoCard | null>(null)
  const [flipped, setFlipped] = useState(false)
  const [scores, setScores] = useState<Scores>({ knew: 0, unsure: 0, miss: 0 })
  const [firstMisses, setFirstMisses] = useState<ItalianoCard[]>([])
  const [seenThisRound, setSeenThisRound] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState<Mode>('en-it')
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

  const playAudio = useCallback((text: string) => {
    stopAudio()
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=it&client=tw-ob`
    const a = new Audio(url)
    audioRef.current = a
    setAudioPlaying(true)
    a.onended = () => { setAudioPlaying(false); audioRef.current = null }
    a.onerror = () => { setAudioPlaying(false); audioRef.current = null }
    a.play().catch(() => setAudioPlaying(false))
  }, [stopAudio])

  const startDeck = useCallback((cat: Cat, currentMode: Mode = mode) => {
    stopAudio()
    const filtered = cat === 'All' ? ITALIANO_CARDS : ITALIANO_CARDS.filter(c => c.cat === cat)
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
    if (first && currentMode === 'it-en') {
      setTimeout(() => playAudio(first.it), 100)
    }
  }, [mode, stopAudio, playAudio])

  useEffect(() => {
    startDeck('All')
  }, [])

  const progress = deck.length > 0 ? Math.round((scores.knew / deck.length) * 100) : 0

  const handleFlip = () => {
    if (flipped || !current) return
    setFlipped(true)
    if (mode === 'en-it') {
      playAudio(current.it)
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
      if (mode === 'it-en') {
        setTimeout(() => playAudio(nextCard.it), 50)
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
            {ITALIANO_CATS.map(cat => (
              <button key={cat} style={s.deckBtn(activeCat === cat)} onClick={() => startDeck(cat)}>
                {cat}
              </button>
            ))}
          </div>

          {/* Mode buttons */}
          <div style={s.modeWrap}>
            <button style={s.modeBtn(mode === 'en-it')} onClick={() => handleChangeMode('en-it')}>English → Italian</button>
            <button style={s.modeBtnLast(mode === 'it-en')} onClick={() => handleChangeMode('it-en')}>Italian → English</button>
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
                    onClick={e => { e.stopPropagation(); if (current) playAudio(current.it) }}
                  >
                    ▶
                  </button>
                  <div style={s.cardHint}>
                    {!flipped
                      ? (mode === 'en-it' ? 'what is this in Italian?' : 'what does this mean?')
                      : (mode === 'en-it' ? 'italiano' : 'english meaning')}
                  </div>
                  {mode === 'en-it' && !flipped && <div style={s.cardEn}>{current.en}</div>}
                  {mode === 'en-it' && flipped && <div style={s.cardIt}>{current.it}</div>}
                  {mode === 'it-en' && !flipped && <div style={s.cardIt}>{current.it}</div>}
                  {mode === 'it-en' && flipped && <div style={s.cardEn}>{current.en}</div>}
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
                    <div style={{ fontStyle: 'italic', color: '#444', fontSize: 14 }}>Ottimo — nessun errore!</div>
                  ) : (
                    firstMisses.map((c, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '9px 0', borderBottom: '1px solid #ccc' }}>
                        <span style={{ fontWeight: 'bold', fontSize: 16 }}>{c.it}</span>
                        <span style={{ color: '#444', fontSize: 14 }}>{c.en}</span>
                      </div>
                    ))
                  )}
                </div>
                <button style={s.restartBtn} onClick={() => startDeck(activeCat)}>
                  Ancora — drill again
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reference view */}
      {tab === 'ref' && (
        <div style={s.refView}>

          <RefSection title="Greetings & basics" note="Use buongiorno until around 5pm; buonasera after. Ciao is informal — don't use with strangers or elders. Lei (capital L) is the formal 'you' — used with strangers, professionals, people older than you.">
            <RefTable cols={['Italiano', 'English', 'Note']} rows={[
              ['ciao', 'hello / bye', 'informal only'],
              ['buongiorno', 'good morning / good day', 'formal; til ~5pm'],
              ['buonasera', 'good evening', 'formal; from ~5pm'],
              ['buonanotte', 'good night', 'when parting at night'],
              ['arrivederci', 'goodbye', 'formal'],
              ['addio', 'farewell', 'permanent / emotional'],
              ['prego', "you're welcome / please / go ahead", 'very versatile'],
              ['grazie', 'thank you', ''],
              ['grazie mille', 'thank you very much', 'lit. "a thousand thanks"'],
              ['per favore / per piacere', 'please', ''],
              ['scusa / scusi', 'excuse me / sorry', 'scusa informal, scusi formal'],
              ['mi dispiace', "I'm sorry", 'for condolences / apologies'],
              ['sì / no', 'yes / no', ''],
              ['come stai?', 'how are you?', 'informal'],
              ['come sta?', 'how are you?', 'formal'],
              ['bene, grazie', 'fine, thanks', ''],
              ['come ti chiami?', "what's your name?", 'informal'],
              ['mi chiamo…', 'my name is…', ''],
              ['piacere', 'pleased to meet you', ''],
            ]} />
          </RefSection>

          <RefSection title="Pronouns" note="Italian verbs conjugate per person, so subject pronouns are often dropped — the verb ending makes the subject clear. Lei (capital L) = formal singular 'you'; same conjugation as third person she/he. Voi is both 'you all' and used as formal plural.">
            <RefTable cols={['Pronoun', 'English', 'Note']} rows={[
              ['io', 'I', ''],
              ['tu', 'you (singular, informal)', ''],
              ['Lei', 'you (singular, formal)', 'capital L; uses 3rd person verb'],
              ['lui', 'he', ''],
              ['lei', 'she', 'lowercase; same verb as formal Lei'],
              ['noi', 'we', ''],
              ['voi', 'you (plural / formal plural)', ''],
              ['loro', 'they', ''],
            ]} />
          </RefSection>

          <RefSection title="Sentence structure" note="Italian word order is generally Subject–Verb–Object, like English. But adjectives usually follow nouns. Negation: put non before the verb. Questions: use rising intonation, or start with a question word.">
            <div style={{ fontSize: 14, fontWeight: 'bold', margin: '12px 0 8px' }}>Negation</div>
            <RefTable cols={['Positive', 'Negative']} rows={[
              ['Parlo italiano.', 'Non parlo italiano.'],
              ['Ho fame.', 'Non ho fame.'],
              ['Capisco.', 'Non capisco.'],
            ]} />
            <div style={{ fontSize: 14, fontWeight: 'bold', margin: '16px 0 8px' }}>Verb conjugation — essere (to be)</div>
            <RefTable cols={['Person', 'Present']} rows={[
              ['io', 'sono'], ['tu', 'sei'], ['lui/lei/Lei', 'è'],
              ['noi', 'siamo'], ['voi', 'siete'], ['loro', 'sono'],
            ]} />
            <div style={{ fontSize: 14, fontWeight: 'bold', margin: '16px 0 8px' }}>Verb conjugation — avere (to have)</div>
            <RefTable cols={['Person', 'Present']} rows={[
              ['io', 'ho'], ['tu', 'hai'], ['lui/lei/Lei', 'ha'],
              ['noi', 'abbiamo'], ['voi', 'avete'], ['loro', 'hanno'],
            ]} />
            <div style={{ fontSize: 14, fontWeight: 'bold', margin: '16px 0 8px' }}>Regular -are verbs (e.g. parlare)</div>
            <RefTable cols={['Person', 'Ending', 'parlare']} rows={[
              ['io', '-o', 'parlo'], ['tu', '-i', 'parli'], ['lui/lei', '-a', 'parla'],
              ['noi', '-iamo', 'parliamo'], ['voi', '-ate', 'parlate'], ['loro', '-ano', 'parlano'],
            ]} />
          </RefSection>

          <RefSection title="Question words">
            <RefTable cols={['Italiano', 'English']} rows={[
              ['chi', 'who'],
              ['cosa / che cosa', 'what'],
              ['dove', 'where'],
              ['quando', 'when'],
              ['come', 'how'],
              ['perché', 'why / because'],
              ['quanto / quanta', 'how much (m/f)'],
              ['quanti / quante', 'how many (m/f)'],
              ['quale / quali', 'which (sing/pl)'],
            ]} />
          </RefSection>

          <RefSection title="Verbs" note="All infinitive forms. Italian verbs end in -are, -ere, or -ire. Essere and avere are irregular and essential — see conjugations in Sentence Structure above.">
            <RefTable cols={['Italiano', 'English', 'Note']} rows={[
              ['essere', 'to be', 'irreg; permanent state'],
              ['stare', 'to be / to stay', 'irreg; temp state/health'],
              ['avere', 'to have', 'irreg'],
              ['fare', 'to do / to make', 'irreg'],
              ['dire', 'to say / to tell', 'irreg'],
              ['andare', 'to go', 'irreg'],
              ['venire', 'to come', 'irreg'],
              ['sapere', 'to know (a fact)', 'vs conoscere (a person)'],
              ['conoscere', 'to know (a person/place)', ''],
              ['volere', 'to want', 'irreg'],
              ['potere', 'to be able to / can', 'irreg'],
              ['dovere', 'to have to / must', 'irreg'],
              ['dare', 'to give', 'irreg'],
              ['vedere', 'to see', ''],
              ['sentire', 'to hear / to feel', ''],
              ['parlare', 'to speak / to talk', 'regular -are'],
              ['mangiare', 'to eat', 'regular -are'],
              ['bere', 'to drink', 'irreg'],
              ['capire', 'to understand', 'regular -ire'],
              ['leggere', 'to read', 'regular -ere'],
              ['scrivere', 'to write', 'regular -ere'],
              ['dormire', 'to sleep', ''],
              ['lavorare', 'to work', 'regular -are'],
              ['abitare', 'to live (reside)', 'regular -are'],
              ['prendere', 'to take', ''],
            ]} />
          </RefSection>

          <RefSection title="Nouns" note="Gender matters in Italian — it affects articles, adjectives, and agreement. Nouns ending in -o are usually masculine; -a usually feminine; -e can be either. Always learn a noun with its article.">
            <RefTable cols={['Italiano', 'English', 'Gender']} rows={[
              ['la casa', 'house / home', 'f'],
              ['il tempo', 'time / weather', 'm'],
              ['la persona', 'person', 'f'],
              ["l'uomo", 'man', 'm (pl. gli uomini)'],
              ['la donna', 'woman', 'f'],
              ['il bambino / la bambina', 'child (m/f)', 'm/f'],
              ['il giorno', 'day', 'm'],
              ["l'anno", 'year', 'm'],
              ['la cosa', 'thing', 'f'],
              ['il paese', 'country / village', 'm'],
              ['la città', 'city', 'f (invariable pl)'],
              ['il lavoro', 'work / job', 'm'],
              ['il libro', 'book', 'm'],
              ['la parola', 'word', 'f'],
              ['il problema', 'problem', 'm (despite -a ending)'],
              ['la vita', 'life', 'f'],
              ['il mondo', 'world', 'm'],
              ['il cibo', 'food', 'm'],
              ["l'acqua", 'water', 'f'],
              ['il vino', 'wine', 'm'],
              ["l'amico / l'amica", 'friend (m/f)', 'm/f'],
              ['la famiglia', 'family', 'f'],
              ['il posto', 'place / seat', 'm'],
            ]} />
          </RefSection>

          <RefSection title="Body parts">
            <RefTable cols={['Italiano', 'English', 'Gender']} rows={[
              ['la testa', 'head', 'f'],
              ['il viso / la faccia', 'face', 'm / f'],
              ["l'occhio", 'eye', 'm (pl. gli occhi)'],
              ['il naso', 'nose', 'm'],
              ['la bocca', 'mouth', 'f'],
              ["l'orecchio", 'ear', 'm (pl. le orecchie)'],
              ['il collo', 'neck', 'm'],
              ['la spalla', 'shoulder', 'f'],
              ['il braccio', 'arm', 'm (pl. le braccia)'],
              ['la mano', 'hand', 'f (pl. le mani)'],
              ['il dito', 'finger', 'm (pl. le dita)'],
              ['il petto', 'chest', 'm'],
              ['lo stomaco', 'stomach', 'm'],
              ['la schiena', 'back', 'f'],
              ['la gamba', 'leg', 'f'],
              ['il ginocchio', 'knee', 'm'],
              ['il piede', 'foot', 'm'],
              ['il cuore', 'heart', 'm'],
            ]} />
          </RefSection>

          <RefSection title="Descriptors" note="Adjectives agree with the noun in gender and number. Most end in -o (m) / -a (f) / -i (m pl) / -e (f pl). Adjectives ending in -e are the same for m and f, changing only in plural (-i).">
            <RefTable cols={['Masc.', 'Fem.', 'English']} rows={[
              ['grande', 'grande', 'big / great'],
              ['piccolo', 'piccola', 'small'],
              ['bello', 'bella', 'beautiful / nice'],
              ['brutto', 'brutta', 'ugly / bad'],
              ['buono', 'buona', 'good'],
              ['cattivo', 'cattiva', 'bad / naughty'],
              ['nuovo', 'nuova', 'new'],
              ['vecchio', 'vecchia', 'old'],
              ['lungo', 'lunga', 'long'],
              ['corto', 'corta', 'short'],
              ['alto', 'alta', 'tall / high'],
              ['caldo', 'calda', 'hot / warm'],
              ['freddo', 'fredda', 'cold'],
              ['forte', 'forte', 'strong / loud'],
              ['difficile', 'difficile', 'difficult'],
              ['facile', 'facile', 'easy'],
              ['stanco', 'stanca', 'tired'],
              ['felice', 'felice', 'happy'],
              ['triste', 'triste', 'sad'],
            ]} />
          </RefSection>

          <RefSection title="Numbers">
            <RefTable cols={['Italiano', '#']} rows={[
              ['zero','0'],['uno','1'],['due','2'],['tre','3'],['quattro','4'],
              ['cinque','5'],['sei','6'],['sette','7'],['otto','8'],['nove','9'],
              ['dieci','10'],['undici','11'],['dodici','12'],['tredici','13'],
              ['quattordici','14'],['quindici','15'],['sedici','16'],
              ['diciassette','17'],['diciotto','18'],['diciannove','19'],
              ['venti','20'],['trenta','30'],['quaranta','40'],['cinquanta','50'],
              ['cento','100'],['mille','1000'],
            ]} />
          </RefSection>

          <RefSection title="Days of the week" note="Days are masculine and not capitalised in Italian. The week starts on Monday. Use il lunedì for 'every Monday'.">
            <RefTable cols={['Italiano', 'English']} rows={[
              ['lunedì','Monday'],['martedì','Tuesday'],['mercoledì','Wednesday'],
              ['giovedì','Thursday'],['venerdì','Friday'],['sabato','Saturday'],['domenica','Sunday'],
            ]} />
          </RefSection>

          <RefSection title="Months" note="Months are masculine and not capitalised. Use in + month for 'in January' etc. — no article needed: in gennaio.">
            <RefTable cols={['Italiano', 'English']} rows={[
              ['gennaio','January'],['febbraio','February'],['marzo','March'],
              ['aprile','April'],['maggio','May'],['giugno','June'],
              ['luglio','July'],['agosto','August'],['settembre','September'],
              ['ottobre','October'],['novembre','November'],['dicembre','December'],
            ]} />
          </RefSection>

          <RefSection title="Time words">
            <RefTable cols={['Italiano', 'English']} rows={[
              ['adesso / ora','now'],['oggi','today'],['ieri','yesterday'],
              ['domani','tomorrow'],['dopodomani','the day after tomorrow'],
              ['la mattina','morning'],['il pomeriggio','afternoon'],
              ['la sera','evening'],['la notte','night'],
              ['presto','early / soon'],['tardi','late'],
              ['sempre','always'],['mai','never'],['spesso','often'],
              ['a volte','sometimes'],['già','already'],
              ['ancora','still / again / yet'],['subito','immediately / right away'],
            ]} />
          </RefSection>

          <RefSection title="Particles & prepositions" note="Italian prepositions combine with definite articles: di + il = del, a + il = al, da + il = dal, in + il = nel, su + il = sul. This is called articolo preposizionale.">
            <RefTable cols={['Italiano', 'English / usage']} rows={[
              ['di','of, from, about'],['a','to, at, in (city)'],
              ['da','from, by, since, at (someone\'s place)'],
              ['in','in, into, to (country/region)'],['con','with'],
              ['su','on, over, about'],['per','for, in order to, through'],
              ['tra / fra','between, among, in (time)'],
              ['che','that, which, who (relative)'],['non','not'],
              ['e / ed','and (ed before vowels)'],['o','or'],
              ['ma','but'],['però','however / but'],['anche','also / too'],
              ['molto','very / much / many'],['poco','a little / few'],
              ['più','more'],['meno','less'],['qui / qua','here'],['lì / là','there'],
            ]} />
          </RefSection>

          <RefSection title="Colours" note="Colours agree with the noun they modify. Most follow -o/-a pattern. Some are invariable: blu, rosa, viola, arancione (do not change).">
            <RefTable cols={['Masc.', 'Fem.', 'English', 'Note']} rows={[
              ['rosso','rossa','red',''],['blu','blu','blue','invariable'],
              ['azzurro','azzurra','light blue / sky blue',''],
              ['verde','verde','green','same m/f'],
              ['giallo','gialla','yellow',''],
              ['arancione','arancione','orange','invariable'],
              ['viola','viola','purple / violet','invariable'],
              ['rosa','rosa','pink','invariable'],
              ['bianco','bianca','white',''],['nero','nera','black',''],
              ['grigio','grigia','grey',''],['marrone','marrone','brown','same m/f'],
            ]} />
          </RefSection>

          <RefSection title="Shapes">
            <RefTable cols={['Italiano', 'English', 'Gender']} rows={[
              ['il cerchio','circle','m'],['il quadrato','square','m'],
              ['il rettangolo','rectangle','m'],['il triangolo','triangle','m'],
              ["l'ovale",'oval','m'],['la stella','star','f'],
              ['il cuore','heart','m'],['il diamante','diamond','m'],['la spirale','spiral','f'],
            ]} />
          </RefSection>

          <RefSection title="Sentence templates" note="50 high-frequency conversational phrases. Learn these and you'll cover a huge range of real situations.">
            <RefTable cols={['Italiano', 'English']} rows={[
              ['Non capisco.', "I don't understand."],
              ['Non lo so.', "I don't know."],
              ['Puoi ripetere?', 'Can you repeat?'],
              ['Puoi parlare più lentamente?', 'Can you speak more slowly?'],
              ['Come si dice… in italiano?', 'How do you say… in Italian?'],
              ['Cosa vuol dire…?', 'What does… mean?'],
              ['Parli inglese?', 'Do you speak English?'],
              ["Sto imparando l'italiano.", "I'm learning Italian."],
              ['Vorrei…', 'I would like…'],
              ['Ho fame.', "I'm hungry."],
              ['Ho sete.', "I'm thirsty."],
              ['Ho caldo.', "I'm hot."],
              ['Ho freddo.', "I'm cold."],
              ['Ho bisogno di aiuto.', 'I need help.'],
              ['Sto bene.', "I'm fine / I'm well."],
              ['Non mi sento bene.', "I don't feel well."],
              ["Dov'è il bagno?", 'Where is the bathroom?'],
              ['A che ora…?', 'At what time…?'],
              ['Posso avere il conto?', 'Can I have the bill?'],
              ['È incluso il servizio?', 'Is service included?'],
              ['Sono allergico/a a…', "I'm allergic to…"],
              ['Sono vegetariano/a.', "I'm vegetarian."],
              ['Che ore sono?', 'What time is it?'],
              ['Sono di…', "I'm from…"],
              ['Abito a…', 'I live in…'],
              ['Lavoro come…', 'I work as…'],
              ['Quanti anni hai?', 'How old are you?'],
              ['Ho… anni.', 'I am… years old.'],
              ['Ti piace…?', 'Do you like…?'],
              ['Mi piace molto.', 'I like it a lot.'],
              ['Non mi piace.', "I don't like it."],
              ['È delizioso!', "It's delicious!"],
              ['Che bello!', 'How beautiful! / How nice!'],
              ['Che peccato!', 'What a shame!'],
              ['Meno male!', 'Thank goodness!'],
              ['Dai!', 'Come on! / No way!'],
              ['Magari!', 'I wish! / Maybe!'],
              ['Figurati!', "Don't mention it! / Not at all!"],
              ['Dipende.', 'It depends.'],
              ['Forse.', 'Maybe / Perhaps.'],
              ['Certo!', 'Of course! / Certainly!'],
              ['Assolutamente.', 'Absolutely.'],
              ['Va bene.', "OK / That's fine."],
              ['Non fa niente.', "It doesn't matter."],
              ['In bocca al lupo!', 'Good luck! (lit. "in the wolf\'s mouth")'],
              ['Crepi!', 'Thanks! (response to "in bocca al lupo")'],
              ['Dove si trova…?', 'Where is… ?'],
              ['Quanto costa?', 'How much does it cost?'],
              ['Il mio italiano non è molto buono.', "My Italian isn't very good."],
              ['Come sta?', 'How are you? (formal)'],
            ]} />
          </RefSection>

          <RefSection title="False friends" note="Words that look like English but mean something completely different.">
            <RefTable cols={['Italian word', 'Looks like', 'Actually means']} rows={[
              ['morbido','morbid','soft / gentle'],
              ['sensibile','sensible','sensitive'],
              ['attuale','actual','current / present-day'],
              ['eventualmente','eventually','if necessary / possibly'],
              ['pretendere','to pretend','to demand / to expect'],
              ['educato','educated','polite / well-mannered'],
              ['argomento','argument','topic / subject'],
              ['la libreria','library','bookshop'],
              ['la biblioteca','—','library (the actual one)'],
              ['annoiato','annoyed','bored'],
              ['confuso','confused','mixed up / blended'],
              ['conveniente','convenient','affordable / cheap'],
              ['la camera','camera','bedroom / room'],
              ['il magazine','magazine','warehouse / storage'],
              ['preservare','to preserve','to use a condom (careful!)'],
            ]} />
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
const tdAltStyle: React.CSSProperties = { ...tdStyle, background: '#f0f0f0' }

function RefSection({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontSize: 16, fontWeight: 'bold', borderBottom: '2px solid #000', paddingBottom: 6, marginBottom: 4 }}>{title}</div>
      {note && <div style={{ fontSize: 13, color: '#444', fontStyle: 'italic', marginBottom: 12, lineHeight: 1.6, padding: '8px 0' }}>{note}</div>}
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

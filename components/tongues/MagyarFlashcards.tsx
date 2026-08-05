'use client'
import { useState, useEffect, useCallback } from 'react'
import { MAGYAR_CARDS, MAGYAR_CATS, type MagyarCard } from '@/lib/tongues/magyar-data'

type Mode = 'en-hu' | 'hu-en'
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
  cardHu: { fontSize: 36, fontWeight: 'bold', lineHeight: 1.3, color: '#000', marginBottom: 12 },
  cardCat: { fontSize: 12, border: '1px solid #ccc', borderRadius: 20, padding: '3px 12px', color: '#444', fontStyle: 'italic', position: 'absolute' as const, bottom: 16 },
  audioBtn: { position: 'absolute', top: 14, right: 14, width: 44, height: 44, borderRadius: '50%', border: '1.5px solid #ccc', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 } as React.CSSProperties,
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
  [80, 'Kiváló munka! Outstanding.'],
  [60, 'Nagyon jó! Keep going.'],
  [40, 'Folytasd — progress!'],
  [0, 'Gyakorolj! Practice makes perfect.'],
]

function playTTS(text: string) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'hu-HU'
  utterance.rate = 0.9
  window.speechSynthesis.speak(utterance)
}

export default function MagyarFlashcards() {
  const [tab, setTab] = useState<'drill' | 'ref'>('drill')
  const [activeCat, setActiveCat] = useState<Cat>('All')
  const [deck, setDeck] = useState<MagyarCard[]>([])
  const [queue, setQueue] = useState<MagyarCard[]>([])
  const [current, setCurrent] = useState<MagyarCard | null>(null)
  const [flipped, setFlipped] = useState(false)
  const [scores, setScores] = useState<Scores>({ knew: 0, unsure: 0, miss: 0 })
  const [firstMisses, setFirstMisses] = useState<MagyarCard[]>([])
  const [seenThisRound, setSeenThisRound] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState<Mode>('en-hu')
  const [done, setDone] = useState(false)

  const stopAudio = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
  }, [])

  const playAudio = useCallback((text: string) => {
    playTTS(text)
  }, [])

  const startDeck = useCallback((cat: Cat, currentMode: Mode = mode) => {
    stopAudio()
    const filtered = cat === 'All' ? MAGYAR_CARDS : MAGYAR_CARDS.filter(c => c.cat === cat)
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
    if (first && currentMode === 'hu-en') {
      setTimeout(() => playAudio(first.hu), 100)
    }
  }, [mode, stopAudio, playAudio])

  useEffect(() => {
    startDeck('All')
  }, [])

  const progress = deck.length > 0 ? Math.round((scores.knew / deck.length) * 100) : 0

  const handleFlip = () => {
    if (flipped || !current) return
    setFlipped(true)
    if (mode === 'en-hu') {
      playAudio(current.hu)
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
      if (mode === 'hu-en') {
        setTimeout(() => playAudio(nextCard.hu), 50)
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
            {MAGYAR_CATS.map(cat => (
              <button key={cat} style={s.deckBtn(activeCat === cat)} onClick={() => startDeck(cat)}>
                {cat}
              </button>
            ))}
          </div>

          {/* Mode buttons */}
          <div style={s.modeWrap}>
            <button style={s.modeBtn(mode === 'en-hu')} onClick={() => handleChangeMode('en-hu')}>English → Magyar</button>
            <button style={s.modeBtnLast(mode === 'hu-en')} onClick={() => handleChangeMode('hu-en')}>Magyar → English</button>
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
                    style={s.audioBtn}
                    onClick={e => { e.stopPropagation(); if (current) playAudio(current.hu) }}
                  >
                    ▶
                  </button>
                  <div style={s.cardHint}>
                    {!flipped
                      ? (mode === 'en-hu' ? 'what is this in Hungarian?' : 'what does this mean?')
                      : (mode === 'en-hu' ? 'magyar' : 'english meaning')}
                  </div>
                  {mode === 'en-hu' && !flipped && <div style={s.cardEn}>{current.en}</div>}
                  {mode === 'en-hu' && flipped && <div style={s.cardHu}>{current.hu}</div>}
                  {mode === 'hu-en' && !flipped && <div style={s.cardHu}>{current.hu}</div>}
                  {mode === 'hu-en' && flipped && <div style={s.cardEn}>{current.en}</div>}
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
                    <div style={{ fontStyle: 'italic', color: '#444', fontSize: 14 }}>Kiváló — egy hiba sem!</div>
                  ) : (
                    firstMisses.map((c, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '9px 0', borderBottom: '1px solid #ccc' }}>
                        <span style={{ fontWeight: 'bold', fontSize: 16 }}>{c.hu}</span>
                        <span style={{ color: '#444', fontSize: 14 }}>{c.en}</span>
                      </div>
                    ))
                  )}
                </div>
                <button style={s.restartBtn} onClick={() => startDeck(activeCat)}>
                  Újra — drill again
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reference view */}
      {tab === 'ref' && (
        <div style={s.refView}>

          <RefSection title="Greetings & basics" note="Szia is informal — use it with friends and peers, not strangers or elders. Ön (capitalised) is the formal 'you', paired with 3rd-person verb forms — used with strangers, professionals, and people clearly older than you.">
            <RefTable cols={['Magyar', 'English', 'Note']} rows={[
              ['szia', 'hello / bye', 'informal only'],
              ['jó reggelt', 'good morning', 'until ~10am'],
              ['jó napot', 'good day', 'formal, daytime'],
              ['jó estét', 'good evening', 'from ~6pm'],
              ['jó éjszakát', 'good night', 'when parting at night'],
              ['viszlát', 'goodbye', 'neutral / informal'],
              ['viszontlátásra', 'goodbye', 'formal'],
              ['köszönöm', 'thank you', ''],
              ['köszönöm szépen', 'thank you very much', 'lit. "I thank you nicely"'],
              ['kérem', 'please', 'formal'],
              ['szívesen', "you're welcome", ''],
              ['bocsi', 'excuse me / sorry', 'informal, short for bocsánat'],
              ['elnézést', 'excuse me', 'formal'],
              ['sajnálom', "I'm sorry", ''],
              ['igen / nem', 'yes / no', ''],
              ['hogy vagy?', 'how are you?', 'informal'],
              ['hogy van?', 'how are you?', 'formal'],
              ['jól, köszönöm', 'fine, thanks', ''],
              ['mi a neved?', "what's your name?", 'informal'],
              ['a nevem…', 'my name is…', ''],
              ['örvendek', 'pleased to meet you', ''],
            ]} />
          </RefSection>

          <RefSection title="Pronouns" note="Hungarian has no grammatical gender at all — ő means both 'he' and 'she' (there is no separate word). Verb endings, not pronouns, carry most of the person information, so pronouns are often dropped. Ön (capital O) is the formal 'you', conjugated like a 3rd-person verb, same pattern as Italian Lei or German Sie.">
            <RefTable cols={['Pronoun', 'English', 'Note']} rows={[
              ['én', 'I', ''],
              ['te', 'you (singular, informal)', ''],
              ['Ön', 'you (singular, formal)', 'capital O; uses 3rd-person verb'],
              ['ő', 'he / she', 'no gender distinction'],
              ['az', 'it / that', 'also means "that" as a demonstrative'],
              ['mi', 'we', ''],
              ['ti', 'you (plural, informal)', ''],
              ['Önök', 'you (plural, formal)', ''],
              ['ők', 'they', ''],
            ]} />
          </RefSection>

          <RefSection title="Sentence structure" note="Hungarian word order is flexible — it's organised around topic and emphasis rather than a fixed Subject-Verb-Object rule, though SVO is a safe neutral default for beginners. Negation: put nem before the word being negated (usually the verb). A striking feature: in the present tense, 3rd person 'to be' is dropped entirely with a noun or adjective — 'Ő tanár' means 'He/she is a teacher', no verb needed. Van ('is/exists') is still used for location and existence: 'A könyv az asztalon van' — 'The book is on the table.'">
            <div style={{ fontSize: 14, fontWeight: 'bold', margin: '12px 0 8px' }}>Negation</div>
            <RefTable cols={['Positive', 'Negative']} rows={[
              ['Beszélek magyarul.', 'Nem beszélek magyarul.'],
              ['Éhes vagyok.', 'Nem vagyok éhes.'],
              ['Értem.', 'Nem értem.'],
            ]} />
            <div style={{ fontSize: 14, fontWeight: 'bold', margin: '16px 0 8px' }}>Verb conjugation — lenni (to be)</div>
            <RefTable cols={['Person', 'Present']} rows={[
              ['én', 'vagyok'], ['te', 'vagy'], ['ő / Ön', 'van (often dropped before noun/adj.)'],
              ['mi', 'vagyunk'], ['ti', 'vagytok'], ['ők / Önök', 'vannak'],
            ]} />
            <div style={{ fontSize: 14, fontWeight: 'bold', margin: '16px 0 8px' }}>Having things — the "van" construction</div>
            <div style={{ fontSize: 13, color: '#444', marginBottom: 8, lineHeight: 1.6 }}>Hungarian has no single verb "to have" in everyday speech. Instead: [person, dative-marked] + van + [noun, possessive-marked]. Literally "to me is my-book".</div>
            <RefTable cols={['Hungarian', 'English']} rows={[
              ['Nekem van egy könyvem.', 'I have a book.'],
              ['Neked van egy autód?', 'Do you have a car?'],
              ['Nincs pénzem.', "I don't have money."],
            ]} />
            <div style={{ fontSize: 14, fontWeight: 'bold', margin: '16px 0 8px' }}>Regular verb conjugation — beszélni (to speak)</div>
            <RefTable cols={['Person', 'Present']} rows={[
              ['én', 'beszélek'], ['te', 'beszélsz'], ['ő', 'beszél'],
              ['mi', 'beszélünk'], ['ti', 'beszéltek'], ['ők', 'beszélnek'],
            ]} />
            <div style={{ fontSize: 13, color: '#444', marginTop: 8, lineHeight: 1.6 }}>
              Two extra things that make Hungarian verbs distinctive: (1) vowel harmony — endings shift between back-vowel, front-vowel, and front-rounded-vowel forms to match the vowels in the stem (e.g. -ok/-ek/-ök for "I ___"); (2) definite vs. indefinite conjugation — verbs take a different ending depending on whether the object is a specific, definite thing ("látom a könyvet" — I see the book) or not ("látok egy könyvet" — I see a book). The tables above show the indefinite form, which covers most everyday sentences.
            </div>
          </RefSection>

          <RefSection title="Question words">
            <RefTable cols={['Magyar', 'English']} rows={[
              ['ki', 'who'],
              ['mi', 'what'],
              ['hol', 'where'],
              ['mikor', 'when'],
              ['hogyan', 'how'],
              ['miért', 'why / because'],
              ['mennyi', 'how much'],
              ['hány', 'how many'],
              ['melyik', 'which'],
            ]} />
          </RefSection>

          <RefSection title="Verbs" note="All infinitive forms end in -ni. Tudni is a genuinely double-duty verb: it means both 'to know (a fact)' and 'to be able to / can' — the same word covers both meanings.">
            <RefTable cols={['Magyar', 'English', 'Note']} rows={[
              ['lenni', 'to be', 'irreg; see conjugation above'],
              ['maradni', 'to stay / remain', ''],
              ['birtokolni', 'to have / possess', 'formal; everyday speech uses the van construction'],
              ['csinálni', 'to do / make', ''],
              ['mondani', 'to say / tell', ''],
              ['menni', 'to go', 'irreg'],
              ['jönni', 'to come', 'irreg'],
              ['tudni', 'to know (a fact) / can, be able to', 'double meaning'],
              ['ismerni', 'to know (a person)', 'vs tudni (a fact)'],
              ['akarni', 'to want', ''],
              ['kell', 'to have to / must', 'impersonal; "Mennem kell" — I must go'],
              ['adni', 'to give', ''],
              ['látni', 'to see', ''],
              ['hallani', 'to hear', ''],
              ['érezni', 'to feel', ''],
              ['beszélni', 'to speak', 'regular; see conjugation above'],
              ['enni', 'to eat', 'irreg'],
              ['inni', 'to drink', 'irreg'],
              ['érteni', 'to understand', ''],
              ['olvasni', 'to read', ''],
              ['írni', 'to write', ''],
              ['aludni', 'to sleep', ''],
              ['dolgozni', 'to work', ''],
              ['lakni', 'to live (reside)', ''],
              ['vinni', 'to take', 'irreg'],
              ['szeretni', 'to like / love', ''],
            ]} />
          </RefSection>

          <RefSection title="Nouns" note="No grammatical gender, and no articles change for gender or case — nouns themselves take suffixes instead (see Particles & cases below). A és An have one word: a / az (az before a vowel sound).">
            <RefTable cols={['Magyar', 'English']} rows={[
              ['ház', 'house / home'],
              ['idő', 'time / weather'],
              ['ember', 'person'],
              ['férfi', 'man'],
              ['nő', 'woman'],
              ['gyerek', 'child'],
              ['nap', 'day / sun'],
              ['év', 'year'],
              ['dolog', 'thing'],
              ['ország', 'country'],
              ['falu', 'village'],
              ['város', 'city'],
              ['munka', 'work / job'],
              ['könyv', 'book'],
              ['szó', 'word'],
              ['probléma', 'problem'],
              ['élet', 'life'],
              ['világ', 'world'],
              ['étel', 'food'],
              ['víz', 'water'],
              ['bor', 'wine'],
              ['barát', 'friend'],
              ['család', 'family'],
              ['hely', 'place / seat'],
              ['név', 'name'],
              ['pénz', 'money'],
            ]} />
          </RefSection>

          <RefSection title="Body parts">
            <RefTable cols={['Magyar', 'English']} rows={[
              ['fej', 'head'], ['arc', 'face'], ['szem', 'eye'], ['orr', 'nose'],
              ['száj', 'mouth'], ['fül', 'ear'], ['nyak', 'neck'], ['váll', 'shoulder'],
              ['kar', 'arm'], ['kéz', 'hand'], ['ujj', 'finger'], ['mellkas', 'chest'],
              ['gyomor', 'stomach'], ['hát', 'back'], ['láb', 'leg'], ['térd', 'knee'],
              ['lábfej', 'foot'], ['szív', 'heart'],
            ]} />
          </RefSection>

          <RefSection title="Descriptors" note="Adjectives never change for gender and don't agree with the noun in case when used before it — genuinely simpler than Italian or German here. Comparatives add -bb/-abb/-ebb (e.g. nagy → nagyobb, 'bigger').">
            <RefTable cols={['Magyar', 'English']} rows={[
              ['nagy', 'big / great'], ['kicsi', 'small'], ['szép', 'beautiful / nice'],
              ['csúnya', 'ugly / bad'], ['jó', 'good'], ['rossz', 'bad / naughty'],
              ['új', 'new'], ['régi', 'old (of things)'], ['öreg', 'old (of people)'],
              ['hosszú', 'long'], ['rövid', 'short'], ['magas', 'tall / high'],
              ['meleg', 'hot / warm'], ['hideg', 'cold'], ['erős', 'strong'],
              ['nehéz', 'difficult'], ['könnyű', 'easy'], ['fáradt', 'tired'],
              ['boldog', 'happy'], ['szomorú', 'sad'], ['gyors', 'fast'],
            ]} />
          </RefSection>

          <RefSection title="Numbers">
            <RefTable cols={['Magyar', '#']} rows={[
              ['nulla','0'],['egy','1'],['kettő','2'],['három','3'],['négy','4'],
              ['öt','5'],['hat','6'],['hét','7'],['nyolc','8'],['kilenc','9'],
              ['tíz','10'],['tizenegy','11'],['tizenkettő','12'],['tizenhárom','13'],
              ['tizennégy','14'],['tizenöt','15'],['tizenhat','16'],
              ['tizenhét','17'],['tizennyolc','18'],['tizenkilenc','19'],
              ['húsz','20'],['harminc','30'],['negyven','40'],['ötven','50'],
              ['száz','100'],['ezer','1000'],
            ]} />
          </RefSection>

          <RefSection title="Days of the week" note="Days aren't capitalised. The week starts on Monday (hétfő). Use -n as a suffix to say 'on ___': hétfőn — 'on Monday'.">
            <RefTable cols={['Magyar', 'English']} rows={[
              ['hétfő','Monday'],['kedd','Tuesday'],['szerda','Wednesday'],
              ['csütörtök','Thursday'],['péntek','Friday'],['szombat','Saturday'],['vasárnap','Sunday'],
            ]} />
          </RefSection>

          <RefSection title="Months" note="Months aren't capitalised. Use -ban/-ben to say 'in ___': januárban — 'in January'.">
            <RefTable cols={['Magyar', 'English']} rows={[
              ['január','January'],['február','February'],['március','March'],
              ['április','April'],['május','May'],['június','June'],
              ['július','July'],['augusztus','August'],['szeptember','September'],
              ['október','October'],['november','November'],['december','December'],
            ]} />
          </RefSection>

          <RefSection title="Time words">
            <RefTable cols={['Magyar', 'English']} rows={[
              ['most','now'],['ma','today'],['tegnap','yesterday'],
              ['holnap','tomorrow'],['reggel','morning'],['délután','afternoon'],
              ['este','evening'],['éjszaka','night'],
              ['korán','early / soon'],['késő','late'],
              ['mindig','always'],['soha','never'],['gyakran','often'],
              ['néha','sometimes'],['már','already'],
              ['még','still / again / yet'],['azonnal','immediately / right away'],
            ]} />
          </RefSection>

          <RefSection title="Particles & cases" note="Hungarian doesn't really use prepositions — instead it attaches suffixes to the end of the noun, and the suffix's vowel shifts to match the noun's vowels (vowel harmony). There are around 18 cases in total; a few of the most common are shown below using ház (house) as the example noun.">
            <RefTable cols={['Magyar', 'English / usage']} rows={[
              ['és','and'],['de','but'],['is','also / too'],['nem','not'],
              ['nagyon','very / much'],['több','more'],['kevesebb','less'],
              ['itt','here'],['ott','there'],['között','between / among'],
              ['aki','who (relative, people)'],['ami','what / which (relative, things)'],
              ['hogy','that (conjunction)'],['mert','because'],
            ]} />
            <div style={{ fontSize: 14, fontWeight: 'bold', margin: '16px 0 8px' }}>Common case suffixes (example: ház — house)</div>
            <RefTable cols={['Form', 'Meaning']} rows={[
              ['ház', 'house'],
              ['házban', 'in the house'],
              ['házból', 'out of / from the house'],
              ['házba', 'into the house'],
              ['háznál', 'at the house'],
              ['házhoz', 'to (the direction of) the house'],
              ['házzal', 'with the house'],
              ['háznak', 'to / for the house (dative)'],
            ]} />
          </RefSection>

          <RefSection title="Colours">
            <RefTable cols={['Magyar', 'English']} rows={[
              ['piros','red'],['kék','blue'],['világoskék','light blue'],
              ['zöld','green'],['sárga','yellow'],['narancssárga','orange'],
              ['lila','purple'],['rózsaszín','pink'],['fehér','white'],
              ['fekete','black'],['szürke','grey'],['barna','brown'],
            ]} />
          </RefSection>

          <RefSection title="Shapes">
            <RefTable cols={['Magyar', 'English']} rows={[
              ['kör','circle'],['négyzet','square'],['téglalap','rectangle'],
              ['háromszög','triangle'],['ovális','oval'],['csillag','star'],['szív','heart'],
            ]} />
          </RefSection>

          <RefSection title="Sentence templates" note="High-frequency conversational phrases. Learn these and you'll cover a huge range of real situations.">
            <RefTable cols={['Magyar', 'English']} rows={[
              ['Nem értem.', "I don't understand."],
              ['Nem tudom.', "I don't know."],
              ['Meg tudod ismételni?', 'Can you repeat?'],
              ['Tudnál lassabban beszélni?', 'Can you speak more slowly?'],
              ['Hogy mondják magyarul, hogy…?', 'How do you say… in Hungarian?'],
              ['Mit jelent, hogy…?', 'What does… mean?'],
              ['Beszélsz angolul?', 'Do you speak English?'],
              ['Magyarul tanulok.', "I'm learning Hungarian."],
              ['Szeretnék…', 'I would like…'],
              ['Éhes vagyok.', "I'm hungry."],
              ['Szomjas vagyok.', "I'm thirsty."],
              ['Melegem van.', "I'm hot."],
              ['Fázom.', "I'm cold."],
              ['Segítségre van szükségem.', 'I need help.'],
              ['Jól vagyok.', "I'm fine / I'm well."],
              ['Nem érzem jól magam.', "I don't feel well."],
              ['Hol van a mosdó?', 'Where is the bathroom?'],
              ['Hány órakor…?', 'At what time…?'],
              ['Kérhetem a számlát?', 'Can I have the bill?'],
              ['A kiszolgálás benne van az árban?', 'Is service included?'],
              ['Allergiás vagyok…', "I'm allergic to…"],
              ['Vegetáriánus vagyok.', "I'm vegetarian."],
              ['Hány óra van?', 'What time is it?'],
              ['…-ból/-ből származom.', "I'm from…"],
              ['…-ban/-ben élek.', 'I live in…'],
              ['Hány éves vagy?', 'How old are you?'],
              ['…éves vagyok.', 'I am… years old.'],
              ['Szereted…?', 'Do you like…?'],
              ['Nagyon szeretem.', 'I like it a lot.'],
              ['Nem szeretem.', "I don't like it."],
              ['Nagyon finom!', "It's delicious!"],
              ['Milyen szép!', 'How beautiful!'],
              ['Milyen kár!', 'What a shame!'],
              ['Hála istennek!', 'Thank goodness!'],
              ['Ugyan már!', 'Come on! / No way!'],
              ['Bárcsak!', 'I wish! / Maybe!'],
              ['Szóra sem érdemes!', "Don't mention it!"],
              ['Attól függ.', 'It depends.'],
              ['Talán.', 'Maybe / Perhaps.'],
              ['Persze!', 'Of course!'],
              ['Rendben.', "OK / That's fine."],
              ['Nem számít.', "It doesn't matter."],
              ['Sok szerencsét!', 'Good luck!'],
              ['Hol van…?', 'Where is…?'],
              ['Mennyibe kerül?', 'How much does it cost?'],
              ['Hogy van?', 'How are you? (formal)'],
              ['…-ként dolgozom.', 'I work as…'],
              ['A magyar tudásom nem túl jó.', "My Hungarian isn't very good."],
            ]} />
          </RefSection>

          <RefSection title="Recognisable words" note="Hungarian isn't related to English at all — it's a Uralic language, not Indo-European — so there aren't 'false friends' the way there are in Italian. But modern Hungarian has borrowed plenty of international words that are instantly recognisable, which makes the language feel less alien than it looks.">
            <RefTable cols={['Magyar', 'English']} rows={[
              ['taxi', 'taxi'],
              ['busz', 'bus'],
              ['hotel / szálloda', 'hotel'],
              ['sport', 'sport'],
              ['foci', 'football / soccer'],
              ['tea', 'tea'],
              ['kávé', 'coffee (from Italian/Turkish caffè/kahve)'],
              ['csokoládé', 'chocolate'],
              ['banán', 'banana'],
              ['garázs', 'garage'],
              ['iroda', 'office'],
              ['internet', 'internet'],
              ['email', 'email'],
              ['szendvics', 'sandwich'],
              ['pizza', 'pizza'],
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

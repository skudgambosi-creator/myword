'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ALL_CARDS, getAudioUrl, type Card } from '@/lib/tongues/te-reo-data'
import { TOPICS, topicOf, registerOf, type Register } from '@/lib/tongues/te-reo-topics'
import {
  buildQueue, emptyProgress, exportCode, fold, importCode, isLearned, load, newLeftToday,
  save, schedule, todayKey, type Progress, type Rating, type Settings,
} from '@/lib/tongues/srs'
import ConversationPractice from './ConversationPractice'
import TeReoReference from './TeReoReference'

const KEY = 'myword.tongues.te-reo.v1'

type Item = Card & { topic: string; reg: Register }
type Screen = 'home' | 'card' | 'done' | 'browse' | 'topic' | 'settings' | 'grammar' | 'korero'
type Theme = 'field' | 'light' | 'ink'

// Every card, grouped by topic in learning order, keeping data order inside a topic.
const ITEMS: Item[] = (() => {
  const tagged = ALL_CARDS.map(c => ({ ...c, topic: topicOf(c).id, reg: registerOf(c) }))
  return TOPICS.flatMap(t => tagged.filter(c => c.topic === t.id))
})()
const BY_TOPIC: Record<string, Item[]> = Object.fromEntries(TOPICS.map(t => [t.id, ITEMS.filter(c => c.topic === t.id)]))
const TOPIC_BY_ID = Object.fromEntries(TOPICS.map(t => [t.id, t]))

interface Session {
  queue: Item[]
  dirs: ('en' | 'tr')[]
  idx: number
  revealed: boolean
  first: Record<string, Rating>   // first rating per card this session
  requeued: Record<string, number>
  label: string
}

const SIGIL = 'M7521.686,2925.676C7520.059,2928.497 7517.834,2929.853 7515.013,2929.745C7511.324,2929.745 7509.479,2928.334 7509.479,2925.513C7509.479,2923.669 7510.51,2921.661 7512.572,2919.491C7514.633,2917.321 7515.773,2915.368 7515.99,2913.632C7516.207,2912.33 7515.773,2911.245 7514.687,2910.377C7513.711,2909.617 7512.68,2909.346 7511.595,2909.563C7509.967,2909.78 7508.394,2910.919 7506.875,2912.981C7504.813,2915.802 7503.186,2919.762 7501.992,2924.862L7500.202,2924.862L7500.202,2902.401C7500.202,2900.882 7499.497,2899.96 7498.086,2899.634L7496.458,2899.634L7496.458,2897.681L7507.201,2897.681L7507.201,2899.634L7505.573,2899.634C7504.162,2899.634 7503.457,2900.448 7503.457,2902.076L7503.457,2914.934C7505.953,2909.725 7509.208,2907.121 7513.223,2907.121C7515.284,2907.121 7516.858,2907.664 7517.943,2908.749C7519.136,2909.834 7519.733,2911.136 7519.733,2912.655C7519.733,2915.259 7518.214,2917.863 7515.176,2920.468C7512.789,2922.529 7511.595,2924.265 7511.595,2925.676C7511.595,2927.521 7513.006,2928.28 7515.827,2927.955C7517.78,2927.738 7519.408,2926.761 7520.71,2925.025L7521.686,2925.676Z'

const GROUND: Record<Theme, string> = { field: '#0b0a0d', light: '#f2ede3', ink: '#ffffff' }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]] }
  return a
}

function detectInk(): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (/onyx|boox|e-?ink|kindle|kobo|pocketbook/i.test(navigator.userAgent)) return true
    return window.matchMedia('(monochrome)').matches || window.matchMedia('(update: slow)').matches
  } catch { return false }
}

export default function TeReoApp() {
  const [p, setP] = useState<Progress>(emptyProgress)
  const [loaded, setLoaded] = useState(false)
  const [screen, setScreen] = useState<Screen>('home')
  const [ink, setInk] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [topicId, setTopicId] = useState<string>('greetings')
  const [query, setQuery] = useState('')
  const [typed, setTyped] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const [importText, setImportText] = useState('')
  const [notice, setNotice] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => { setP(load(KEY)); setInk(detectInk()); setLoaded(true) }, [])

  const theme: Theme = p.settings.theme === 'auto' ? (ink ? 'ink' : 'field') : p.settings.theme
  useEffect(() => { document.body.style.background = GROUND[theme] }, [theme])

  const commit = useCallback((next: Progress) => { setP(next); save(KEY, next) }, [])
  const setSetting = <K extends keyof Settings>(k: K, v: Settings[K]) => commit({ ...p, settings: { ...p.settings, [k]: v } })

  const allowNew = useCallback((c: Item) => p.settings.registers.includes(c.reg), [p.settings.registers])
  const today = useMemo(() => buildQueue(ITEMS, p, { now, allowNew }), [p, now, allowNew])

  // Audio
  const stopAudio = () => { audioRef.current?.pause(); audioRef.current = null }
  const play = useCallback((c: Card) => {
    stopAudio()
    const url = getAudioUrl(c.tr, c.cat)
    if (!url) return
    const a = new Audio(url)
    audioRef.current = a
    a.play().catch(() => {})
  }, [])

  // Sessions
  const begin = (queue: Item[], label: string) => {
    if (!queue.length) { setSession(null); setScreen('done'); return }
    const dirs = queue.map(() => p.settings.direction === 'both' ? (Math.random() < 0.5 ? 'en' : 'tr') : p.settings.direction) as ('en' | 'tr')[]
    setSession({ queue, dirs, idx: 0, revealed: false, first: {}, requeued: {}, label })
    setTyped('')
    setScreen('card')
  }
  const startToday = () => { const t = Date.now(); setNow(t); const q = buildQueue(ITEMS, p, { now: t, allowNew }); begin([...q.due, ...q.fresh], 'today') }
  const moreNew = () => begin(ITEMS.filter(c => !p.cards[c.id] && allowNew(c)).slice(0, 5), 'new')
  const replayMisses = () => {
    if (!session) return
    const missed = session.queue.filter((c, i, a) => session.first[c.id] === 'miss' && a.findIndex(x => x.id === c.id) === i)
    begin(shuffle(missed), 'misses')
  }
  const drillTopic = (id: string) => {
    const cards = BY_TOPIC[id] ?? []
    const t = Date.now()
    const due = cards.filter(c => p.cards[c.id] && p.cards[c.id].due <= t)
    const fresh = cards.filter(c => !p.cards[c.id]).slice(0, 10)
    let q = [...due, ...fresh]
    if (q.length < 8) q = [...q, ...shuffle(cards.filter(c => !q.includes(c))).slice(0, 15 - q.length)]
    begin(q, TOPIC_BY_ID[id].name)
  }

  const current = session ? session.queue[session.idx] : null
  const dir = session ? session.dirs[session.idx] ?? 'en' : 'en'
  const reoShowing = !!current && (dir === 'tr' || session!.revealed)

  // Autoplay when the te reo side first appears.
  useEffect(() => {
    if (screen === 'card' && current && reoShowing && p.settings.audio === 'reveal') play(current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, session?.idx, session?.revealed])

  const reveal = () => session && setSession({ ...session, revealed: true })

  const rate = (r: Rating) => {
    if (!session || !current) return
    const t = Date.now()
    const prev = p.cards[current.id]
    const next: Progress = { ...p, cards: { ...p.cards, [current.id]: schedule(prev, r, t) }, newLog: { ...p.newLog } }
    if (!prev) { const k = todayKey(t); next.newLog[k] = (next.newLog[k] ?? 0) + 1 }
    commit(next)
    const first = session.first[current.id] ? session.first : { ...session.first, [current.id]: r }
    let queue = session.queue
    let dirs = session.dirs
    const requeued = { ...session.requeued }
    if (r === 'miss' && (requeued[current.id] ?? 0) < 3) {
      requeued[current.id] = (requeued[current.id] ?? 0) + 1
      const at = Math.min(session.idx + 4, queue.length)
      queue = [...queue.slice(0, at), current, ...queue.slice(at)]
      dirs = [...dirs.slice(0, at), dirs[session.idx], ...dirs.slice(at)]
    }
    stopAudio()
    setTyped('')
    const idx = session.idx + 1
    const s2 = { ...session, queue, dirs, first, requeued, idx, revealed: false }
    setSession(s2)
    if (idx >= queue.length) { setNow(t); setScreen('done') }
  }

  // Derived numbers
  const learnedIn = (cards: Item[]) => cards.filter(c => isLearned(p.cards[c.id])).length
  const pad = (n: number) => (n < 10 ? '0' : '') + n

  const searchHits = useMemo(() => {
    const q = fold(query)
    if (q.length < 2) return []
    return ITEMS.filter(c => fold(c.tr).includes(q) || fold(c.en).includes(q)).slice(0, 40)
  }, [query])

  if (!loaded) return <div className="tr-app no-invert" data-theme="field"><style dangerouslySetInnerHTML={{ __html: CSS }} /></div>

  const Mark = ({ to = 'home' as Screen }) => (
    <button className="tr-mark" onClick={() => { stopAudio(); setScreen(to) }} aria-label="Home"><i />TE REO</button>
  )

  return (
    <div className="tr-app no-invert" data-theme={theme}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..800&family=Martian+Mono:wght@400;500&family=Jost:wght@300;400;500&family=IBM+Plex+Mono:wght@400&display=swap" />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* HOME */}
      {screen === 'home' && (
        <div className="tr-screen tr-home">
          <div className="tr-row">
            <span className="tr-mono">{today.due.length} due · {today.fresh.length} new</span>
            <button className="tr-chip" onClick={() => setScreen('settings')}><Cog />settings</button>
          </div>
          <div className="tr-home-mid">
            <svg className="tr-sigil" viewBox="7494 2895.5 30 36" role="img" aria-label="Saturn sigil"><path d={SIGIL} /></svg>
            <span className="tr-word"><i />TE REO</span>
          </div>
          <button className="tr-come" onClick={startToday}>haere mai</button>
          <div className="tr-home-links">
            <button onClick={() => setScreen('browse')}>browse</button>
            <a href="/tongues">tongues</a>
          </div>
        </div>
      )}

      {/* CARD */}
      {screen === 'card' && session && current && (
        <div className="tr-screen tr-cardscreen tr-cap">
          <div className="tr-row">
            <Mark />
            <span className="tr-mono">{pad(Math.min(session.idx + 1, session.queue.length))} / {pad(session.queue.length)}</span>
          </div>
          {session.queue.length <= 40 ? (
            <div className="tr-dots" aria-hidden="true">
              {session.queue.map((_, i) => <span key={i} className={i < session.idx ? 'd done' : i === session.idx ? 'd now' : 'd'} />)}
            </div>
          ) : (
            <div className="tr-bar" aria-hidden="true"><span style={{ width: `${(session.idx / session.queue.length) * 100}%` }} /></div>
          )}

          <div className="tr-face" onClick={() => { if (!session.revealed && !(p.settings.answer === 'type' && dir === 'en')) reveal() }}>
            <span className="tr-kind"><i />{p.cards[current.id] ? 'review' : 'new'} ·{' '}
              <button className="tr-kind-link" onClick={e => { e.stopPropagation(); stopAudio(); setTopicId(current.topic); setScreen('topic') }}>{TOPIC_BY_ID[current.topic].name}</button>
            </span>
            {dir === 'en'
              ? <span className="tr-prompt">{current.en}</span>
              : <span className="tr-prompt tr-reo-big"><AudioBtn card={current} play={play} />{current.tr}</span>}

            {!session.revealed && p.settings.answer === 'type' && dir === 'en' && (
              <form className="tr-type" onSubmit={e => { e.preventDefault(); reveal() }}>
                <label className="tr-sr" htmlFor="tr-typed">your answer in te reo</label>
                <input id="tr-typed" autoFocus autoComplete="off" autoCapitalize="off" spellCheck={false} value={typed} onChange={e => setTyped(e.target.value)} placeholder="type it, macrons optional" />
              </form>
            )}

            {session.revealed && (
              <div className="tr-back">
                {dir === 'en'
                  ? <span className="tr-reo-big"><AudioBtn card={current} play={play} />{current.tr}</span>
                  : <span className="tr-answer-en">{current.en}</span>}
                {p.settings.answer === 'type' && dir === 'en' && typed.trim() && (
                  <span className="tr-verdict">{fold(typed) === fold(current.tr) ? 'matches' : `not quite: you typed “${typed.trim()}”`}</span>
                )}
                {/* The topic's grammar line shows once per session, on the first card from that topic. */}
                {session.queue.findIndex(c => c.topic === current.topic) === session.idx && (
                  <span className="tr-note">{TOPIC_BY_ID[current.topic].note}</span>
                )}
              </div>
            )}
            {!session.revealed && !(p.settings.answer === 'type' && dir === 'en') && <span className="tr-hint">say it, then tap</span>}
          </div>

          {!session.revealed
            ? <button className="tr-pill solid wide" onClick={reveal}>{p.settings.answer === 'type' && dir === 'en' ? 'check' : 'show'}</button>
            : (
              <div className="tr-rate">
                <button className="tr-pill" onClick={() => rate('miss')}><span className="dot dot-ring" />miss</button>
                <button className="tr-pill" onClick={() => rate('unsure')}><span className="dot dot-half" />unsure</button>
                <button className="tr-pill acc" onClick={() => rate('knew')}><span className="dot dot-fill" />knew it</button>
              </div>
            )}
        </div>
      )}

      {/* DONE */}
      {screen === 'done' && (() => {
        const firsts = session ? Object.values(session.first) : []
        const knew = firsts.filter(r => r === 'knew').length
        const unsure = firsts.filter(r => r === 'unsure').length
        const missed = session ? session.queue.filter((c, i, a) => session.first[c.id] === 'miss' && a.findIndex(x => x.id === c.id) === i) : []
        const tomorrow = ITEMS.filter(c => p.cards[c.id] && p.cards[c.id].due <= now + 86_400_000).length
        const empty = !session || firsts.length === 0
        return (
          <div className="tr-screen tr-cap">
            <div className="tr-row"><Mark /><span className="tr-mono">{empty ? 'all clear' : `${firsts.length} / ${firsts.length}`}</span></div>
            <span className="tr-big">ka pai.</span>
            <span className="tr-mono tr-gap">{empty ? 'nothing due right now' : `${firsts.length} cards · ${tomorrow} back within a day`}</span>
            {!empty && (
              <div className="tr-counts">
                <span><span className="dot dot-fill acc" />{knew} knew</span>
                <span><span className="dot dot-half" />{unsure} unsure</span>
                <span><span className="dot dot-ring" />{missed.length} missed</span>
              </div>
            )}
            <div className="tr-list tr-grow">
              {missed.map(c => (
                <div key={c.id} className="tr-li"><span className="dot dot-ring acc" /><span className="tr-li-main">{c.tr}</span><span className="tr-li-sub">{c.en}</span></div>
              ))}
            </div>
            <div className="tr-two">
              {missed.length > 0
                ? <button className="tr-pill acc" onClick={replayMisses}>replay misses</button>
                : <button className="tr-pill solid" onClick={() => setScreen('browse')}>browse</button>}
              <button className="tr-pill" onClick={moreNew}>5 more new</button>
            </div>
          </div>
        )
      })()}

      {/* BROWSE */}
      {screen === 'browse' && (
        <div className="tr-screen">
          <div className="tr-seg">
            <button onClick={startToday}>today</button>
            <button aria-pressed="true">browse</button>
          </div>
          <label className="tr-sr" htmlFor="tr-find">search</label>
          <input id="tr-find" className="tr-find" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="search, macrons optional" autoComplete="off" />
          <div className="tr-lenses" role="group" aria-label="Which kinds of language reach your daily queue">
            {(['everyday', 'slang', 'formal', 'hauraki'] as Register[]).map(r => {
              const on = p.settings.registers.includes(r)
              return (
                <button key={r} aria-pressed={on} disabled={r === 'everyday'} onClick={() => setSetting('registers', on ? p.settings.registers.filter(x => x !== r) : [...p.settings.registers, r])}>
                  <span className={on ? 'dot dot-fill acc' : 'dot dot-ring'} />{r}
                </button>
              )
            })}
          </div>
          <div className="tr-list tr-grow tr-scroll">
            {query.trim().length >= 2 ? (
              searchHits.length ? searchHits.map(c => (
                <button key={c.id} className="tr-li" onClick={() => { setTopicId(c.topic); setScreen('topic') }}>
                  <span className={isLearned(p.cards[c.id]) ? 'dot dot-fill' : 'dot dot-ring'} />
                  <span className="tr-li-main">{c.tr}</span><span className="tr-li-sub">{c.en}</span>
                </button>
              )) : <div className="tr-li tr-li-sub">no match</div>
            ) : (
              <>
                {TOPICS.filter(t => (BY_TOPIC[t.id] ?? []).length).map((t, i) => (
                  <button key={t.id} className="tr-li" onClick={() => { setTopicId(t.id); setScreen('topic') }}>
                    <span className="tr-num">{pad(i + 1)}</span>
                    <span className="tr-li-main">{t.name}</span>
                    <span className="tr-mono">{pad(learnedIn(BY_TOPIC[t.id]))}/{pad(BY_TOPIC[t.id].length)}</span>
                  </button>
                ))}
                <button className="tr-li" onClick={() => setScreen('grammar')}><span className="tr-num blue">A–Z</span><span className="tr-li-main">grammar, every section</span></button>
                <button className="tr-li" onClick={() => setScreen('korero')}><span className="tr-num acc">kō</span><span className="tr-li-main">kōrero, dialogue practice</span></button>
              </>
            )}
          </div>
          <div className="tr-foot"><Mark /></div>
        </div>
      )}

      {/* TOPIC */}
      {screen === 'topic' && (() => {
        const t = TOPIC_BY_ID[topicId]
        const cards = BY_TOPIC[topicId] ?? []
        return (
          <div className="tr-screen">
            <div className="tr-row"><button className="tr-back-btn" onClick={() => setScreen('browse')}>← browse</button><span className="tr-mono">{learnedIn(cards)} of {cards.length} learned</span></div>
            <div className="tr-scroll tr-grow">
              <h1 className="tr-h1">{t.name}</h1>
              <p className="tr-note">{t.note}</p>
              <button className="tr-pill solid wide tr-gap" onClick={() => drillTopic(topicId)}>drill this topic</button>
              <div className="tr-list">
                {cards.map(c => (
                  <button key={c.id} className="tr-li" onClick={() => play(c)}>
                    <span className={isLearned(p.cards[c.id]) ? 'dot dot-fill' : p.cards[c.id] ? 'dot dot-half' : 'dot dot-ring'} />
                    <span className="tr-li-main">{c.tr}</span><span className="tr-li-sub">{c.en}</span>
                  </button>
                ))}
              </div>
              {t.refs.length > 0 && <div className="tr-ref-wrap"><span className="tr-kind"><i />grammar</span><TeReoReference only={t.refs} /></div>}
            </div>
          </div>
        )
      })()}

      {/* GRAMMAR */}
      {screen === 'grammar' && (
        <div className="tr-screen">
          <div className="tr-row"><button className="tr-back-btn" onClick={() => setScreen('browse')}>← browse</button><span className="tr-mono">grammar a–z</span></div>
          <div className="tr-scroll tr-grow tr-ref-wrap"><TeReoReference /></div>
        </div>
      )}

      {/* KŌRERO */}
      {screen === 'korero' && (
        <div className="tr-screen">
          <div className="tr-row"><button className="tr-back-btn" onClick={() => setScreen('browse')}>← browse</button><span className="tr-mono">kōrero</span></div>
          <div className="tr-scroll tr-grow tr-ref-wrap"><ConversationPractice /></div>
        </div>
      )}

      {/* SETTINGS */}
      {screen === 'settings' && (
        <div className="tr-screen">
          <div className="tr-row"><Mark /><span className="tr-mono">settings</span></div>
          <div className="tr-scroll tr-grow">
            <Group label="look">
              {([['auto', 'auto'], ['field', 'dark'], ['light', 'light'], ['ink', 'e-ink']] as const).map(([v, l]) => (
                <button key={v} aria-pressed={p.settings.theme === v} onClick={() => setSetting('theme', v)}>{l}</button>
              ))}
            </Group>
            <Group label="new cards a day">
              {[5, 10, 15].map(n => <button key={n} aria-pressed={p.settings.newPerDay === n} onClick={() => setSetting('newPerDay', n)}>{n}</button>)}
            </Group>
            <Group label="direction">
              {([['en', 'english → reo'], ['tr', 'reo → english'], ['both', 'both']] as const).map(([v, l]) => (
                <button key={v} aria-pressed={p.settings.direction === v} onClick={() => setSetting('direction', v)}>{l}</button>
              ))}
            </Group>
            <Group label="answer by">
              {([['say', 'saying it'], ['type', 'typing it']] as const).map(([v, l]) => (
                <button key={v} aria-pressed={p.settings.answer === v} onClick={() => setSetting('answer', v)}>{l}</button>
              ))}
            </Group>
            <Group label="audio">
              {([['reveal', 'plays itself'], ['tap', 'on tap'], ['off', 'off']] as const).map(([v, l]) => (
                <button key={v} aria-pressed={p.settings.audio === v} onClick={() => setSetting('audio', v)}>{l}</button>
              ))}
            </Group>
            <div className="tr-group">
              <span className="tr-kind"><i />progress, saved on this device</span>
              <span className="tr-mono">{Object.keys(p.cards).length} seen · {ITEMS.filter(c => isLearned(p.cards[c.id])).length} learned · {newLeftToday(p)} new left today</span>
              <div className="tr-two">
                <button className="tr-pill" onClick={async () => {
                  const code = exportCode(p)
                  try { await navigator.clipboard.writeText(code); setNotice('code copied: paste it into import on your other device') }
                  catch { setImportText(code); setNotice('copy the code below, then paste it on your other device') }
                }}>export code</button>
                <button className="tr-pill" onClick={() => {
                  const next = importCode(importText)
                  if (!next) { setNotice('that code did not read; paste the whole thing'); return }
                  commit(next); setImportText(''); setNotice('progress imported')
                }}>import code</button>
              </div>
              <label className="tr-sr" htmlFor="tr-code">progress code</label>
              <textarea id="tr-code" className="tr-code" value={importText} onChange={e => setImportText(e.target.value)} placeholder="paste a code here to import" rows={3} />
              {notice && <span className="tr-note">{notice}</span>}
            </div>
            <p className="tr-credit">Audio streams from <a href="https://maoridictionary.co.nz" target="_blank" rel="noopener noreferrer">Te Aka Māori Dictionary</a>, voiced by Te Wharehuia Milroy and Te Haumihiata Mason. Tēnā rawa atu kōrua.</p>
          </div>
        </div>
      )}
    </div>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="tr-group">
      <span className="tr-kind"><i />{label}</span>
      <div className="tr-opts">{children}</div>
    </div>
  )
}

function AudioBtn({ card, play }: { card: Card; play: (c: Card) => void }) {
  if (!getAudioUrl(card.tr, card.cat)) return null
  return (
    <button className="tr-play" aria-label="Play pronunciation" onClick={e => { e.stopPropagation(); play(card) }}>
      <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true"><path d="M1 1l10 6-10 6z" /></svg>
    </button>
  )
}

function Cog() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="8" cy="8" r="2.4" />
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" strokeLinecap="round" />
    </svg>
  )
}

const CSS = `
.tr-app{--ground:#0b0a0d;--panel:#16131a;--ink:#ece6d6;--soft:#9c958a;--hair:rgba(236,230,214,.18);--acc:#ff4a36;--reo:#ffb33d;--note:#5ff2d0;--blue:#6d7bff;--on-acc:#0b0a0d;--sigil:#ff4a36;
  --glow:0 0 6px rgba(255,74,54,.6),0 0 18px rgba(255,74,54,.22);--tglow:0 0 6px rgba(255,179,61,.35);--sglow:drop-shadow(0 0 6px rgba(255,74,54,.6)) drop-shadow(0 0 18px rgba(255,74,54,.22));
  --vign:radial-gradient(ellipse 80% 70% at 62% 50%,#17131d 0%,#0b0a0d 70%);
  --font:Archivo,"Helvetica Neue",Arial,sans-serif;--mono:"Martian Mono","IBM Plex Mono",ui-monospace,monospace;--wide:110%;--narrow:92%}
.tr-app[data-theme="light"]{--ground:#f2ede3;--panel:#e9e2d4;--ink:#1d1d1b;--soft:#6e695f;--hair:rgba(29,29,27,.15);--acc:#c4361f;--reo:#1d1d1b;--note:#1f4ea3;--blue:#1f4ea3;--on-acc:#f2ede3;--sigil:#da5053;
  --glow:none;--tglow:none;--sglow:none;--vign:none;--font:Jost,Futura,"Century Gothic",system-ui,sans-serif;--mono:"IBM Plex Mono",ui-monospace,monospace;--wide:100%;--narrow:100%}
.tr-app[data-theme="ink"]{--ground:#fff;--panel:#fff;--ink:#000;--soft:#333;--hair:#000;--acc:#000;--reo:#000;--note:#000;--blue:#000;--on-acc:#fff;--sigil:#000;
  --glow:none;--tglow:none;--sglow:none;--vign:none;--font:Georgia,"Times New Roman",serif;--mono:Georgia,serif;--wide:100%;--narrow:100%}
.tr-app{min-height:100dvh;height:100dvh;background:var(--vign),var(--ground);background-color:var(--ground);color:var(--ink);font:400 15px/1.45 var(--font);display:flex;justify-content:center;-webkit-tap-highlight-color:transparent}
.tr-app *{box-sizing:border-box}
:where(.tr-app) button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}
.tr-app a{color:inherit}
.tr-app a:hover{background:none;color:var(--ink)}
.tr-credit a{text-decoration:underline;text-underline-offset:3px}
.tr-app :focus-visible{outline:2px solid var(--acc);outline-offset:3px;border-radius:999px}
.tr-screen{width:100%;max-width:560px;height:100%;display:flex;flex-direction:column;padding:max(14px,env(safe-area-inset-top)) 18px max(16px,env(safe-area-inset-bottom))}
/* On tall windows the card and done screens stop at phone height and sit centred, so answer and buttons stay together. */
.tr-app{align-items:center}
.tr-cap{max-height:760px}
.tr-row{display:flex;justify-content:space-between;align-items:center;gap:12px;min-height:28px}
.tr-mono{font:400 11px var(--mono);color:var(--soft);letter-spacing:0}
.tr-mark,.tr-word{font-weight:600;font-size:13px;letter-spacing:.16em;display:inline-flex;align-items:center;gap:7px;font-stretch:var(--wide)}
.tr-mark i,.tr-word i{width:7px;height:7px;border-radius:50%;background:var(--acc);box-shadow:var(--glow)}
.tr-chip{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 11px;border:1px solid var(--hair);border-radius:999px;font-size:12px;color:var(--soft)}
.tr-chip:hover{color:var(--ink);border-color:var(--ink)}
.tr-home{align-items:center}
.tr-home .tr-row{align-self:stretch}
.tr-home-mid{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(8px,2vh,16px);min-height:0}
.tr-sigil{height:clamp(110px,42vh,320px);width:auto;max-width:80vw;filter:var(--sglow)}
.tr-sigil path{fill:var(--sigil)}
.tr-word{font-size:15px}
.tr-come{font-weight:600;font-size:22px;letter-spacing:.04em;padding:12px 44px;border-radius:999px;background:var(--ink)!important;color:var(--ground)!important}
.tr-come:hover{background:var(--acc)!important;color:var(--on-acc)!important}
.tr-home-links{display:flex;gap:22px;margin-top:12px;font:400 11px var(--mono);color:var(--soft)}
.tr-home-links a{text-decoration:none}
.tr-home-links button:hover,.tr-home-links a:hover{color:var(--ink)}
.tr-dots{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px}
.tr-dots .d{width:6px;height:6px;border-radius:50%;border:1px solid var(--soft)}
.tr-dots .d.done{background:var(--ink);border-color:var(--ink)}
.tr-dots .d.now{background:var(--acc);border-color:var(--acc);box-shadow:var(--glow)}
.tr-bar{height:3px;background:var(--hair);margin-top:12px}.tr-bar span{display:block;height:3px;background:var(--acc)}
.tr-face{flex:1;min-height:0;overflow:auto;margin-top:clamp(10px,2.5vh,22px);display:flex;flex-direction:column;gap:8px;cursor:pointer}
.tr-kind{font:400 10px var(--mono);letter-spacing:.06em;color:var(--soft);display:flex;align-items:center;gap:8px;text-transform:uppercase}
.tr-kind-link{text-transform:inherit;letter-spacing:inherit;text-decoration:underline;text-decoration-color:var(--hair);text-underline-offset:3px}
.tr-kind-link:hover{color:var(--ink)}
.tr-kind i{width:6px;height:6px;border-radius:50%;background:var(--note)}
.tr-prompt{font-weight:400;font-stretch:var(--narrow);font-size:clamp(22px,4.6vh + 6px,36px);line-height:1.2;display:flex;align-items:center;gap:12px}
.tr-reo-big{font-weight:700;font-stretch:var(--wide);font-size:clamp(24px,4.6vh + 8px,38px);line-height:1.12;color:var(--reo);text-shadow:var(--tglow);display:flex;align-items:center;gap:12px}
.tr-back{display:flex;flex-direction:column;gap:8px;border-top:1px solid var(--hair);padding-top:12px;margin-top:4px}
.tr-answer-en{font-size:clamp(20px,3.6vh + 6px,30px);line-height:1.2}
.tr-play{width:38px;height:38px;flex:none;border-radius:50%;background:var(--acc)!important;box-shadow:var(--glow);display:grid;place-items:center}
.tr-play path{fill:var(--on-acc)}
.tr-note{font-size:13px;line-height:1.45;color:var(--soft);margin:0}
.tr-link{text-decoration:underline;text-underline-offset:3px;color:var(--ink)!important}
.tr-hint{margin-top:auto;font-size:12px;color:var(--soft)}
.tr-verdict{font:400 11px var(--mono);color:var(--note)}
.tr-type input{width:100%;border:0;border-bottom:1px solid var(--hair);background:transparent;color:var(--ink);font:inherit;font-size:18px;padding:6px 0;outline:none}
.tr-type input:focus{border-bottom-color:var(--acc)}
.tr-pill{height:46px;border-radius:999px!important;border:1.5px solid var(--hair)!important;display:inline-flex;align-items:center;justify-content:center;gap:7px;font-size:15px;padding:0 16px!important}
.tr-pill:hover{border-color:var(--ink)!important}
.tr-pill.solid{background:var(--ink)!important;color:var(--ground)!important;border-color:var(--ink)!important;font-weight:600}
.tr-pill.acc{background:var(--acc)!important;color:var(--on-acc)!important;border-color:var(--acc)!important;box-shadow:var(--glow);font-weight:600}
.tr-pill.wide{width:100%}
.tr-rate{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}
.tr-cardscreen>.tr-pill.wide{margin-top:10px}
.dot{width:8px;height:8px;border-radius:50%;flex:none;display:inline-block;border:1.5px solid currentColor}
.dot.dot-ring{background:transparent}
.dot.dot-half{background:linear-gradient(90deg,currentColor 50%,transparent 50%)}
.dot.dot-fill{background:currentColor}
.dot.acc{color:var(--acc)}
.tr-pill.acc .dot{color:var(--on-acc)}
.tr-big{font-weight:600;font-size:clamp(30px,6vh,44px);line-height:1;margin-top:clamp(12px,3vh,26px)}
.tr-gap{margin-top:10px}
.tr-counts{display:flex;gap:18px;margin-top:14px;font-size:14px}
.tr-counts>span{display:flex;align-items:center;gap:7px}
.tr-list{display:flex;flex-direction:column;border-top:1px solid var(--hair);margin-top:12px}
.tr-li{display:flex;align-items:baseline;gap:10px;padding:8px 0;border-bottom:1px solid var(--hair);text-align:left;width:100%}
.tr-li .dot{transform:translateY(-1px)}
.tr-li-main{flex:1;font-size:15px;min-width:0}
.tr-li-sub{font-size:12px;color:var(--soft);text-align:right;max-width:48%}
button.tr-li:hover .tr-li-main{color:var(--acc)}
.tr-grow{flex:1;min-height:0}
.tr-scroll{overflow:auto;scrollbar-width:thin;scrollbar-color:var(--hair) transparent}
.tr-two{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
.tr-seg{display:grid;grid-template-columns:1fr 1fr;border:1.5px solid var(--ink);border-radius:999px;overflow:hidden}
.tr-seg button{padding:8px 0;font-weight:600;font-size:15px}
.tr-seg button[aria-pressed="true"]{background:var(--ink);color:var(--ground)}
.tr-find{margin-top:12px;border:0;border-bottom:1px solid var(--hair);background:transparent;color:var(--ink);font:inherit;font-size:15px;padding:5px 0;outline:none;width:100%}
.tr-find:focus{border-bottom-color:var(--acc)}
.tr-find::placeholder,.tr-type input::placeholder,.tr-code::placeholder{color:var(--soft)}
.tr-lenses{display:flex;flex-wrap:wrap;gap:14px;margin-top:10px;font-size:13px}
.tr-lenses button{display:inline-flex;align-items:center;gap:6px;color:var(--soft)}
.tr-lenses button[aria-pressed="true"]{color:var(--ink)}
.tr-lenses button[disabled]{cursor:default}
.tr-num{font:500 10px var(--mono);color:var(--ground);background:var(--ink);padding:1px 5px;border-radius:3px;min-width:22px;text-align:center}
.tr-num.blue{background:var(--blue)}.tr-num.acc{background:var(--acc)}
.tr-foot{display:flex;justify-content:center;padding-top:10px}
.tr-back-btn{font-size:13px;color:var(--soft)}.tr-back-btn:hover{color:var(--ink)}
.tr-h1{font-family:var(--font);font-weight:600;font-size:clamp(24px,4vh + 6px,32px);line-height:1.15;margin:12px 0 6px}
.tr-group{display:flex;flex-direction:column;gap:9px;padding:14px 0;border-bottom:1px solid var(--hair)}
.tr-opts{display:flex;flex-wrap:wrap;gap:8px}
.tr-opts button{height:38px;padding:0 14px;border:1.5px solid var(--hair);border-radius:999px;font-size:14px}
.tr-opts button[aria-pressed="true"]{background:var(--ink);color:var(--ground);border-color:var(--ink)}
.tr-code{width:100%;background:transparent;color:var(--ink);border:1px solid var(--hair);border-radius:10px;padding:8px 10px;font:400 11px var(--mono);resize:vertical}
.tr-credit{font-size:12px;line-height:1.6;color:var(--soft);margin:16px 0 8px;text-align:center}
.tr-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.tr-ref-wrap{margin-top:18px}
.tr-ref-wrap table{color:var(--ink)}
.tr-ref-wrap td,.tr-ref-wrap th{border-color:var(--hair)!important}
.tr-app[data-theme="ink"] .tr-pill.acc,.tr-app[data-theme="ink"] .tr-play{box-shadow:none}
.tr-app[data-theme="ink"] .tr-dots .d.now{background:var(--ground);border:2px solid var(--ink);width:8px;height:8px}
@media (max-height:460px){
  .tr-screen{padding-top:10px;padding-bottom:12px}
  .tr-pill{height:42px}
  .tr-rate{margin-top:8px}
  .tr-dots{margin-top:6px}
  .tr-face{margin-top:8px;gap:6px}
  .tr-home-links{margin-top:8px}
}
`

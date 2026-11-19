// Shared spaced-repetition engine for the Tongues apps.
// Client-side only: progress lives in localStorage under one key per language,
// keyed by stable card IDs so content edits never scramble what a learner knows.

export type Rating = 'miss' | 'unsure' | 'knew'

export interface CardState {
  due: number    // ms timestamp when the card next falls due
  ivl: number    // current interval in days (0 = relearning today)
  reps: number   // successful reviews
  lapses: number // times forgotten after first learning
  last: number   // ms timestamp of last review
}

export interface Settings {
  theme: 'auto' | 'field' | 'light' | 'ink'
  newPerDay: number
  direction: 'en' | 'tr' | 'both'
  audio: 'reveal' | 'tap' | 'off'
  answer: 'say' | 'type'
  registers: string[]
}

export interface Progress {
  v: 1
  cards: Record<string, CardState>
  newLog: Record<string, number> // local date (YYYY-MM-DD) -> new cards introduced
  settings: Settings
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  newPerDay: 5,
  direction: 'en',
  audio: 'reveal',
  answer: 'say',
  registers: ['everyday'],
}

const MIN = 60_000
const DAY = 86_400_000

export function emptyProgress(): Progress {
  return { v: 1, cards: {}, newLog: {}, settings: { ...DEFAULT_SETTINGS } }
}

export function todayKey(now = Date.now()): string {
  const d = new Date(now)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// A small, legible scheduler: three ratings, growing intervals, a cap of a year.
// Due times land a few hours before the same clock time, so a card learned in the
// evening shows up the next evening rather than waiting a full 24 hours.
export function schedule(prev: CardState | undefined, r: Rating, now = Date.now()): CardState {
  const base: CardState = prev ?? { due: now, ivl: 0, reps: 0, lapses: 0, last: now }
  let ivl: number
  let lapses = base.lapses
  let reps = base.reps
  if (r === 'miss') {
    if (prev && prev.ivl >= 1) lapses += 1
    return { due: now + 10 * MIN, ivl: 0, reps, lapses, last: now }
  }
  if (r === 'unsure') {
    ivl = Math.max(1, Math.round(base.ivl * 1.2))
  } else {
    ivl = base.ivl < 1 ? (prev ? 1 : 3) : Math.max(base.ivl + 1, Math.round(base.ivl * 2.5))
    reps += 1
  }
  ivl = Math.min(ivl, 365)
  return { due: now + ivl * DAY - 4 * 60 * MIN, ivl, reps, lapses, last: now }
}

export function isLearned(st?: CardState): boolean {
  return !!st && st.ivl >= 3
}

export function load(key: string): Progress {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null
    if (!raw) return emptyProgress()
    return normalise(JSON.parse(raw))
  } catch {
    return emptyProgress()
  }
}

export function save(key: string, p: Progress): void {
  try { window.localStorage.setItem(key, JSON.stringify(p)) } catch { /* storage full or blocked */ }
}

function normalise(x: unknown): Progress {
  const p = (x ?? {}) as Partial<Progress>
  return {
    v: 1,
    cards: p.cards && typeof p.cards === 'object' ? p.cards : {},
    newLog: p.newLog && typeof p.newLog === 'object' ? p.newLog : {},
    settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) },
  }
}

// Export as a copy-paste code, for carrying progress between devices.
export function exportCode(p: Progress): string {
  const json = JSON.stringify(p)
  return btoa(unescape(encodeURIComponent(json)))
}

export function importCode(code: string): Progress | null {
  try {
    const json = decodeURIComponent(escape(atob(code.trim())))
    return normalise(JSON.parse(json))
  } catch {
    return null
  }
}

// The day's queue: due reviews first (most overdue first), then new cards in
// the order given, up to what remains of today's new-card allowance.
export function buildQueue<C extends { id: string }>(
  ordered: C[],
  p: Progress,
  opts: { now?: number; allowNew?: (c: C) => boolean } = {},
): { due: C[]; fresh: C[] } {
  const now = opts.now ?? Date.now()
  const due = ordered
    .filter(c => p.cards[c.id] && p.cards[c.id].due <= now)
    .sort((a, b) => p.cards[a.id].due - p.cards[b.id].due)
  const left = Math.max(0, p.settings.newPerDay - (p.newLog[todayKey(now)] ?? 0))
  const fresh = ordered.filter(c => !p.cards[c.id] && (opts.allowNew ? opts.allowNew(c) : true)).slice(0, left)
  return { due, fresh }
}

export function newLeftToday(p: Progress, now = Date.now()): number {
  return Math.max(0, p.settings.newPerDay - (p.newLog[todayKey(now)] ?? 0))
}

// Macron- and punctuation-insensitive match, for search and typed answers.
export function fold(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

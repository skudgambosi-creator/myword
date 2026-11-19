// Te reo topics in learning order, roughly following the Ministry of Education
// grammar progression (levels 1 to 2 first: greetings, pronouns, questions,
// sentence markers, then vocabulary breadth, then idiom and register).
// Each card belongs to exactly one topic: the first whose test it passes.
import type { Card } from './te-reo-data'

export type Register = 'everyday' | 'slang' | 'formal' | 'hauraki'

export interface Topic {
  id: string
  name: string
  note: string        // one line shown on the card as its grammar hint
  refs: string[]      // reference sections shown inside the topic
  test: (c: Card) => boolean
}

const sub = (...names: string[]) => (c: Card) => !!c.sub && names.includes(c.sub)
const cat = (...names: string[]) => (c: Card) => names.includes(c.cat)

export const TOPICS: Topic[] = [
  { id: 'greetings', name: 'greetings and people',
    note: 'kia ora works anywhere; tēnā koe / kōrua / koutou counts the people.',
    refs: ['Greetings & basics'],
    test: c => cat('greetings', 'basics')(c) || sub('How are you & small talk', 'Introductions')(c) },
  { id: 'pointing', name: 'I, you, this, that, here',
    note: 'near me, near you, away from us both: tēnei, tēnā, tērā.',
    refs: ['Pronouns', 'Near me, near you, over there', 'Koe, kōrua, koutou'],
    test: c => cat('pronouns')(c) || sub('Pointing words', 'Koe, kōrua, koutou')(c) },
  { id: 'questions', name: 'questions',
    note: 'the question word usually sits where the answer will go.',
    refs: ['Question words'],
    test: cat('questions') },
  { id: 'markers', name: 'sentence markers',
    note: 'the opening particle tells you the tense: kei te now, i past, ka next.',
    refs: ['Core particles', 'More particles', 'Directional particles', 'How to converse & build a sentence', 'Sentence templates'],
    test: sub('Tense & sentence markers', 'Linking & modifiers', 'Location & direction') },
  { id: 'verbs', name: 'doing words',
    note: 'verbs come first: kei te kai au, I am eating.',
    refs: ['Verbs', 'More verbs'],
    test: cat('verbs') },
  { id: 'time', name: 'numbers and time',
    note: 'i looks back, ā looks forward: i tērā wiki, ā tērā wiki.',
    refs: ['Numbers', 'Time', 'Time phrases', 'Days of the week & months'],
    test: cat('numbers', 'days') },
  { id: 'describing', name: 'describing',
    note: 'describing words follow the noun: te whare nui, the big house.',
    refs: ['Descriptors', 'Colours', 'Shapes'],
    test: cat('descriptors', 'colours', 'shapes') },
  { id: 'people', name: 'people, home and body',
    note: 'te for one, ngā for many; the noun itself rarely changes.',
    refs: ['Body parts', 'More nouns, people, ideas & culture', 'More nouns, home, seasons & extras'],
    test: c => cat('body')(c) || sub('People & whānau', 'Friends & roles', 'Body & wellbeing', 'Home, objects & clothing')(c) },
  { id: 'world', name: 'the world around',
    note: 'te for one, ngā for many; the noun itself rarely changes.',
    refs: ['Nouns', 'More nouns, clothing, places & nature'],
    test: cat('nouns') },
  { id: 'belonging', name: 'belonging',
    note: 'ō for what you sit under (whānau, home), ā for what you act on.',
    refs: ['Possessives'],
    test: cat('possessives') },
  { id: 'everyday', name: 'everyday sentences',
    note: 'learn the frame once, then swap the words inside it.',
    refs: ['Commands, reasons & comparisons', 'Directions & getting around', 'Shopping, kai & phone calls', 'Making plans, small talk & apologies'],
    test: sub('Understanding & apologies', 'Everyday phrases', 'Kind words & wishes', 'Daily chat & weather', 'Café & shopping', 'Directions', 'Phone & messaging', 'Making plans', 'Reasons & comparisons') },
  { id: 'commands', name: 'commands',
    note: 'mai pulls towards you, atu sends away; kaua e says don’t.',
    refs: ['He tono, commands'],
    test: sub('Commands & requests') },
  { id: 'tikanga', name: 'tikanga and marae',
    note: 'marae language runs more formal; learn it as whole phrases.',
    refs: ['Tikanga & marae'],
    test: c => cat('tikanga')(c) || sub('On the marae', 'Whakataukī')(c) },
  { id: 'kiwaha', name: 'kīwaha and praise',
    note: 'kīwaha carry attitude more than literal meaning; learn them whole.',
    refs: ['Praise & exclamations', 'Kīwaha of Hauraki'],
    test: sub('Praise & exclamations', 'Kīwaha (Hauraki)') },
  { id: 'more', name: 'more sentences',
    note: 'learn the frame once, then swap the words inside it.',
    refs: [],
    test: () => true },
]

const SLANG = new Set(['wananei!', 'tumeke!', 'e mara!', 'keke ana te haere', 'tau kē!'])

export function registerOf(c: Card): Register {
  if (c.sub === 'Kīwaha (Hauraki)') return 'hauraki'
  if (SLANG.has(c.tr)) return 'slang'
  if (c.cat === 'tikanga' || c.sub === 'On the marae' || c.sub === 'Whakataukī') return 'formal'
  return 'everyday'
}

export function topicOf(c: Card): Topic {
  return TOPICS.find(t => t.test(c))!
}

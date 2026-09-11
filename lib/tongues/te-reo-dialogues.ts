// Dialogue data for both (a) the reference panel's worked-exchange displays
// and (b) the new interactive Conversation practice mode. Each line reuses
// vocabulary/sentences already vetted in conversation-cards.ts / the main
// deck, so nothing here introduces unverified grammar.

export interface DialogueLine {
  speaker: 'A' | 'B'
  tr: string
  en: string
}

export interface Dialogue {
  id: string
  title: string
  scenario: string
  lines: DialogueLine[]
}

export const DIALOGUES: Dialogue[] = [
  {
    id: 'meeting',
    title: 'Meeting someone',
    scenario: 'Two people meet for the first time and exchange names and background.',
    lines: [
      { speaker: 'A', tr: 'Kia ora! Ko wai tōu ingoa?', en: 'Hi! What is your name?' },
      { speaker: 'B', tr: 'Ko Mere tōku ingoa. Ā koe?', en: "I'm Mere. And you?" },
      { speaker: 'A', tr: 'Ko Hēmi tōku ingoa. Nō hea koe?', en: "I'm Hēmi. Where are you from?" },
      { speaker: 'B', tr: 'Nō Tāmaki Makaurau au. Nō hea koe?', en: "I'm from Auckland. Where are you from?" },
      { speaker: 'A', tr: 'Nō Ingarani au, engari e noho ana au i konei ināianei.', en: "I'm from England, but I live here now." },
      { speaker: 'B', tr: 'Ka pai! Kei te ako koe i te reo Māori?', en: 'Great! Are you learning te reo Māori?' },
      { speaker: 'A', tr: 'Āe, kei te ako au. He uaua, engari he pai.', en: "Yes, I'm learning. It's hard, but it's good." },
      { speaker: 'B', tr: 'Kia kaha! Ka kite anō.', en: 'Keep it up! See you again.' },
    ],
  },
  {
    id: 'cafe',
    title: 'Ordering at a café',
    scenario: 'Ordering food and a drink, then asking for the bill.',
    lines: [
      { speaker: 'A', tr: 'Kia ora! He aha tāu e hiahia ana ki te kai?', en: 'Hi! What do you want to eat?' },
      { speaker: 'B', tr: 'E hiahia ana au ki tētahi kawhe, koa.', en: 'I would like a coffee, please.' },
      { speaker: 'A', tr: 'Ka pai. He aha anō?', en: 'Sure. Anything else?' },
      { speaker: 'B', tr: 'E hiahia ana au ki te parāoa me te tīhi.', en: 'I would like some bread and cheese.' },
      { speaker: 'A', tr: 'Ka pai tērā. E hia meneti, ka tae mai.', en: "Good choice. It'll be a few minutes." },
      { speaker: 'B', tr: 'Kia ora. He reka tēnei kai!', en: 'Thanks. This food is delicious!' },
      { speaker: 'B', tr: 'Ka taea e au te tono i te nama, koa?', en: 'Can I have the bill, please?' },
      { speaker: 'A', tr: 'Āe, anei koe. Ka taea e koe te utu mā te kāri.', en: "Yes, here you go. You can pay with a card." },
      { speaker: 'B', tr: 'Kia ora rawa atu. Kua mākona au!', en: "Thanks very much. I'm full!" },
    ],
  },
  {
    id: 'directions',
    title: 'Asking for directions',
    scenario: 'A visitor is lost and asks a local for directions.',
    lines: [
      { speaker: 'A', tr: 'Tēnā koa, kei hea te teihana?', en: 'Excuse me, where is the station?' },
      { speaker: 'B', tr: 'Haere tika atu, kātahi ka huri ki matau.', en: 'Go straight ahead, then turn right.' },
      { speaker: 'A', tr: 'E tawhiti ana i konei?', en: 'Is it far from here?' },
      { speaker: 'B', tr: 'Kāo, e tata ana. Tekau meneti te roa.', en: "No, it's close. It takes ten minutes." },
      { speaker: 'A', tr: 'Ka taea e koe te whakaatu mai ki ahau i runga i te mahere?', en: 'Can you show me on the map?' },
      { speaker: 'B', tr: 'Āe. Haere mā runga i te whakawhitinga, kātahi ka kite koe i te teihana.', en: "Yes. Walk across the crossing, then you'll see the station." },
      { speaker: 'A', tr: 'Kia ora, kei te mārama au ināianei.', en: "Thank you, I understand now." },
      { speaker: 'B', tr: 'Kia pai tō haerenga!', en: 'Have a good trip!' },
    ],
  },
  {
    id: 'phone',
    title: 'A phone call',
    scenario: 'Returning a missed call and arranging to talk again.',
    lines: [
      { speaker: 'A', tr: 'Kia ora, ko wai kei te waea mai?', en: 'Hello, who is calling?' },
      { speaker: 'B', tr: 'Ko Hēmi tēnei. Aroha mai, kāore au i rongo i tō waea inanahi.', en: "This is Hēmi. Sorry, I didn't hear your call yesterday." },
      { speaker: 'A', tr: 'Kāore he aha. He aha tāu i hiahia ai?', en: "No worries. What did you need?" },
      { speaker: 'B', tr: 'E hiahia ana au ki te kōrero mō te hui āpōpō.', en: 'I want to talk about the meeting tomorrow.' },
      { speaker: 'A', tr: 'Ka pai. Kei te wātea koe ināianei?', en: 'Sure. Are you free right now?' },
      { speaker: 'B', tr: 'Kāo, kei te mahi au. Ka waea atu au ki a koe ā tēnei ahiahi.', en: "No, I'm at work. I'll call you this afternoon." },
      { speaker: 'A', tr: 'Ka pai tērā. Ka kite.', en: "That works. See you." },
    ],
  },
  {
    id: 'marae',
    title: 'Arriving at the marae',
    scenario: 'A host welcomes a first-time visitor onto the marae.',
    lines: [
      { speaker: 'A', tr: 'Nau mai ki te marae. Haere mai i muri i ahau.', en: 'Welcome onto the marae. Follow me.' },
      { speaker: 'B', tr: 'Kia ora. He tuatahi taku haere ki konei.', en: 'Thank you. This is my first time here.' },
      { speaker: 'A', tr: 'Tangohia ō hū, koa, i mua i te haere ki roto.', en: 'Please remove your shoes before going inside.' },
      { speaker: 'B', tr: 'Āe, kia pai. Ka taea te tango whakaahua?', en: "Yes, of course. Is it alright to take photos?" },
      { speaker: 'A', tr: 'Kāo i roto i te wharenui, engari āe i waho.', en: 'No inside the meeting house, but yes outside.' },
      { speaker: 'B', tr: 'Kei te mārama. Ngā mihi mō tō manaakitanga.', en: "Understood. Thank you for your hospitality." },
      { speaker: 'A', tr: 'Nau mai, haere mai ki te kai.', en: 'Welcome, please join us to eat.' },
      { speaker: 'B', tr: 'He waimarie ahau kei konei.', en: 'I feel fortunate to be here.' },
    ],
  },
  {
    id: 'plans',
    title: 'Making plans',
    scenario: 'Two friends arrange to meet up.',
    lines: [
      { speaker: 'A', tr: 'Kei te wātea koe āpōpō?', en: 'Are you free tomorrow?' },
      { speaker: 'B', tr: 'Āe, kei te wātea au. He aha te mahere?', en: "Yes, I'm free. What's the plan?" },
      { speaker: 'A', tr: 'E pīrangi ana koe ki te haere mai ki taku kāinga?', en: 'Would you like to come to my place?' },
      { speaker: 'B', tr: 'Ka hari au ki te haere mai! He aha te wā e tūtaki ai tāua?', en: "I'd love to come! What time shall we meet?" },
      { speaker: 'A', tr: 'Ā te ahiahi, kātahi tāua ka kai tahi.', en: "In the afternoon, then we'll eat together." },
      { speaker: 'B', tr: 'Ka pai tērā. Kawea mai tō whānau?', en: "That sounds great. Should I bring your family too?" },
      { speaker: 'A', tr: 'Āe, kawea mai! Kei te tūmanako mātou ki te kite i a koutou.', en: 'Yes, bring them! We look forward to seeing you all.' },
      { speaker: 'B', tr: 'Ka kite i taua wā.', en: 'See you then.' },
    ],
  },
  {
    id: 'catchup',
    title: 'Catching up',
    scenario: 'Friends catch up after not seeing each other for a while.',
    lines: [
      { speaker: 'A', tr: 'Kia ora! Kua roa!', en: "Hi! It's been a while!" },
      { speaker: 'B', tr: 'Āe! I pēhea tō mutunga wiki?', en: 'Yeah! How was your weekend?' },
      { speaker: 'A', tr: 'He pai rawa atu, kia ora. Kei te pēhea tō whānau?', en: "It was great, thanks. How is your family?" },
      { speaker: 'B', tr: 'Kei te pai katoa, kia ora. He aha tāu mahi ināianei?', en: 'Everyone is well, thanks. What are you doing these days?' },
      { speaker: 'A', tr: 'Ka mahi au ki tētahi kura. He aha tāu e pīrangi ana ki te mahi?', en: 'I work at a school. What do you like to do?' },
      { speaker: 'B', tr: 'E pīrangi ana au ki te pānui me te kaukau.', en: 'I like to read and swim.' },
      { speaker: 'A', tr: 'Me tūtaki tāua ā tērā wiki.', en: "Let's meet next week." },
      { speaker: 'B', tr: 'Ka pai tērā. Ka whakapā atu au ki a koe.', en: "Sounds good. I'll be in touch." },
    ],
  },
]

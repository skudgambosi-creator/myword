'use client'
import { useState, useCallback } from 'react'
import { DIALOGUES, type DialogueLine } from '@/lib/tongues/te-reo-dialogues'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Flat pool of every line across every dialogue, used to source multiple-choice
// distractors regardless of which dialogue is currently being practiced.
const ALL_LINES: DialogueLine[] = DIALOGUES.flatMap(d => d.lines)

function pickOptions(correct: DialogueLine): string[] {
  const pool = ALL_LINES.filter(l => l.tr !== correct.tr)
  const distractors = shuffle(pool).slice(0, 3).map(l => l.tr)
  return shuffle([correct.tr, ...distractors])
}

const s = {
  root: { fontFamily: "Georgia,'Times New Roman',serif", background: '#fff', color: '#000', display: 'flex', flexDirection: 'column' as const, flex: 1, overflowY: 'auto' as const },
  pad: { padding: '16px 16px 40px' },
  pickerIntro: { fontSize: 13, color: '#444', fontStyle: 'italic', lineHeight: 1.6, marginBottom: 20, padding: '4px 0' },
  cardBtn: { display: 'block', width: '100%', textAlign: 'left' as const, border: '2px solid #000', borderRadius: 12, padding: '16px 18px', marginBottom: 12, background: '#fff', cursor: 'pointer', fontFamily: "Georgia,serif" },
  cardTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 4 },
  cardScenario: { fontSize: 13, color: '#444', fontStyle: 'italic', lineHeight: 1.5 },
  cardMeta: { fontSize: 11, color: '#999', marginTop: 8, textTransform: 'uppercase' as const, letterSpacing: '0.06em' },
  backBtn: { fontSize: 13, color: '#444', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0 16px', fontFamily: "Georgia,serif", textDecoration: 'underline' },
  transcript: { marginBottom: 20 },
  transcriptLine: { display: 'flex', gap: 10, padding: '9px 0', borderBottom: '1px solid #eee' },
  speakerTag: { fontWeight: 'bold', width: 20, flexShrink: 0 },
  transcriptTr: { fontWeight: 'bold' },
  transcriptEn: { color: '#444', fontSize: 13, fontStyle: 'italic' },
  progressWrap: { height: 6, background: '#f0f0f0', marginBottom: 16 },
  quizPrompt: { fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#444', marginBottom: 10, fontStyle: 'italic' },
  quizSpeaker: { fontSize: 13, fontWeight: 'bold', marginBottom: 12 },
  optionBtn: (state: 'idle' | 'correct' | 'wrong' | 'reveal-correct'): React.CSSProperties => ({
    display: 'block', width: '100%', textAlign: 'left' as const, marginBottom: 10,
    padding: '14px 16px', borderRadius: 10, cursor: 'pointer', fontFamily: "Georgia,serif", fontSize: 15,
    border: state === 'correct' || state === 'reveal-correct' ? '2px solid #000' : state === 'wrong' ? '2px dashed #000' : '1.5px solid #ccc',
    background: state === 'correct' || state === 'reveal-correct' ? '#000' : state === 'wrong' ? '#f0f0f0' : '#fff',
    color: state === 'correct' || state === 'reveal-correct' ? '#fff' : '#000',
  }),
  feedbackBox: { border: '1.5px solid #000', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 14 },
  feedbackEn: { color: '#444', fontSize: 13, fontStyle: 'italic', marginTop: 4 },
  continueBtn: { width: '100%', minHeight: 56, border: '2px solid #000', borderRadius: 12, background: '#000', color: '#fff', fontSize: 16, fontFamily: "Georgia,serif", cursor: 'pointer', fontWeight: 'bold', marginBottom: 8 },
  doneScreen: { textAlign: 'center' as const, padding: '12px 4px 24px' },
  donePct: { fontSize: 56, fontWeight: 'bold', lineHeight: 1, marginBottom: 4 },
  doneLabel: { fontSize: 13, color: '#444', marginBottom: 24, letterSpacing: '0.04em', textTransform: 'uppercase' as const },
  secondaryBtn: { width: '100%', minHeight: 52, border: '2px solid #000', borderRadius: 12, background: '#fff', color: '#000', fontSize: 15, fontFamily: "Georgia,serif", cursor: 'pointer', marginBottom: 10 },
}

type Phase = 'picker' | 'quiz' | 'summary'

export default function ConversationPractice() {
  const [dialogueId, setDialogueId] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('picker')
  const [lineIndex, setLineIndex] = useState(0)
  const [options, setOptions] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)

  const dialogue = DIALOGUES.find(d => d.id === dialogueId) || null

  const startDialogue = useCallback((id: string) => {
    const d = DIALOGUES.find(x => x.id === id)
    if (!d) return
    setDialogueId(id)
    setLineIndex(1) // line 0 is shown immediately as the opener; quizzing starts from line 1
    setCorrectCount(0)
    setWrongCount(0)
    setSelected(null)
    setOptions(d.lines.length > 1 ? pickOptions(d.lines[1]) : [])
    setPhase(d.lines.length > 1 ? 'quiz' : 'summary')
  }, [])

  const handlePick = (choice: string) => {
    if (selected || !dialogue) return
    const correctLine = dialogue.lines[lineIndex]
    setSelected(choice)
    if (choice === correctLine.tr) setCorrectCount(c => c + 1)
    else setWrongCount(c => c + 1)
  }

  const handleContinue = () => {
    if (!dialogue) return
    const next = lineIndex + 1
    if (next >= dialogue.lines.length) {
      setPhase('summary')
      return
    }
    setLineIndex(next)
    setSelected(null)
    setOptions(pickOptions(dialogue.lines[next]))
  }

  const goToPicker = () => {
    setDialogueId(null)
    setPhase('picker')
  }

  const retryDialogue = () => {
    if (dialogueId) startDialogue(dialogueId)
  }

  if (phase === 'picker' || !dialogue) {
    return (
      <div style={s.root}>
        <div style={s.pad}>
          <div style={s.pickerIntro}>
            Pick a scenario and practice it as a back-and-forth: you'll see the conversation build up line by line, and for each of the other speaker's lines you'll pick what comes next before it's revealed.
          </div>
          {DIALOGUES.map(d => (
            <button key={d.id} style={s.cardBtn} onClick={() => startDialogue(d.id)}>
              <div style={s.cardTitle}>{d.title}</div>
              <div style={s.cardScenario}>{d.scenario}</div>
              <div style={s.cardMeta}>{d.lines.length} lines</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const total = correctCount + wrongCount
  const donePct = total > 0 ? Math.round((correctCount / total) * 100) : 0

  if (phase === 'summary') {
    return (
      <div style={s.root}>
        <div style={s.pad}>
          <button style={s.backBtn} onClick={goToPicker}>← Choose another scenario</button>
          <div style={s.doneScreen}>
            <div style={s.donePct}>{donePct}%</div>
            <div style={s.doneLabel}>{correctCount} of {total} picked correctly</div>
          </div>
          <div style={s.transcript}>
            {dialogue.lines.map((l, i) => (
              <div key={i} style={s.transcriptLine}>
                <span style={s.speakerTag}>{l.speaker}:</span>
                <span>
                  <span style={s.transcriptTr}>{l.tr}</span>
                  <br />
                  <span style={s.transcriptEn}>{l.en}</span>
                </span>
              </div>
            ))}
          </div>
          <button style={s.continueBtn} onClick={retryDialogue}>Ka haere anō · try again</button>
          <button style={s.secondaryBtn} onClick={goToPicker}>Choose another scenario</button>
        </div>
      </div>
    )
  }

  // quiz phase
  const correctLine = dialogue.lines[lineIndex]
  const progress = Math.round((lineIndex / dialogue.lines.length) * 100)

  return (
    <div style={s.root}>
      <div style={s.pad}>
        <button style={s.backBtn} onClick={goToPicker}>← Choose another scenario</button>
        <div style={s.progressWrap}>
          <div style={{ height: '100%', background: '#000', width: `${progress}%`, transition: 'width 0.2s' }} />
        </div>
        <div style={s.transcript}>
          {dialogue.lines.slice(0, lineIndex).map((l, i) => (
            <div key={i} style={s.transcriptLine}>
              <span style={s.speakerTag}>{l.speaker}:</span>
              <span>
                <span style={s.transcriptTr}>{l.tr}</span>
                <br />
                <span style={s.transcriptEn}>{l.en}</span>
              </span>
            </div>
          ))}
        </div>
        <div style={s.quizPrompt}>what does {correctLine.speaker} say next?</div>
        {options.map((opt, i) => {
          let state: 'idle' | 'correct' | 'wrong' | 'reveal-correct' = 'idle'
          if (selected) {
            if (opt === correctLine.tr) state = 'correct'
            else if (opt === selected) state = 'wrong'
          }
          return (
            <button key={i} style={s.optionBtn(state)} onClick={() => handlePick(opt)} disabled={!!selected}>
              {opt}
            </button>
          )
        })}
        {selected && (
          <>
            <div style={s.feedbackBox}>
              {selected === correctLine.tr ? 'Ka pai! Correct.' : "Not quite, here's the right line:"}
              <div style={s.feedbackEn}>{correctLine.en}</div>
            </div>
            <button style={s.continueBtn} onClick={handleContinue}>
              {lineIndex + 1 >= dialogue.lines.length ? 'Finish' : 'Continue →'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

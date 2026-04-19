'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { createLoreClient } from '@/lib/supabase/lore-client'
import Nav from '@/components/layout/Nav'

function LoreFooter() {
  return (
    <footer style={{ textAlign: 'center', padding: '48px 0 28px' }}>
      <span style={{ fontSize: 11, color: '#ccc', letterSpacing: '0.18em' }}>POGOSI-GAMBOSI</span>
    </footer>
  )
}

function formatDate(day: number | null, month: number | null, year: number) {
  if (day && month) return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`
  if (month) return `${month.toString().padStart(2, '0')}/${year}`
  return `${year}`
}

export default function YarnPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const mainSupa = createClient()
  const lore = createLoreClient()

  const [userId, setUserId] = useState<string | null>(null)
  const [userCharId, setUserCharId] = useState<string | null>(null)
  const [yarn, setYarn] = useState<any>(null)
  const [isHearted, setIsHearted] = useState(false)
  const [concurCount, setConcurCount] = useState(0)
  const [hasConcurred, setHasConcurred] = useState(false)
  const [validateCount, setValidateCount] = useState(0)
  const [hasValidated, setHasValidated] = useState(false)
  const [canValidate, setCanValidate] = useState(false)
  const [sameDayYarns, setSameDayYarns] = useState<any[]>([])
  const [sameEventYarns, setSameEventYarns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await mainSupa.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)

      const [{ data: yarnData }, { data: charData }] = await Promise.all([
        lore.from('lore_yarns').select('*, lore_characters(id, character_name, user_id), lore_events(id, title), lore_yarn_tags(lore_tags(id, name, is_taboo)), lore_yarn_characters(lore_characters(id, character_name, user_id))').eq('id', id).single(),
        lore.from('lore_characters').select('id').eq('user_id', session.user.id).single(),
      ])

      if (!yarnData) { router.push('/lore/index'); return }
      setYarn(yarnData)

      const charId = (charData as any)?.id || null
      setUserCharId(charId)

      // Check if user is mentioned in this yarn
      const mentionedChars: any[] = (yarnData.lore_yarn_characters || []).map((yc: any) => yc.lore_characters)
      const isMentioned = mentionedChars.some((c: any) => c?.user_id === session.user.id)
      setCanValidate(isMentioned)

      const [{ data: heartData }, { data: concurs }, { data: validates }, { data: myValidate }, { data: myConcur }] = await Promise.all([
        lore.from('lore_hearts').select('user_id').eq('user_id', session.user.id).eq('yarn_id', id).single(),
        lore.from('lore_concurs').select('user_id').eq('yarn_id', id),
        lore.from('lore_validates').select('user_id').eq('yarn_id', id),
        lore.from('lore_validates').select('user_id').eq('yarn_id', id).eq('user_id', session.user.id).single(),
        lore.from('lore_concurs').select('user_id').eq('yarn_id', id).eq('user_id', session.user.id).single(),
      ])

      setIsHearted(!!heartData)
      setConcurCount((concurs || []).length)
      setValidateCount((validates || []).length)
      setHasValidated(!!myValidate)
      setHasConcurred(!!myConcur)

      // Same day yarns
      if (yarnData.day && yarnData.month) {
        const { data: sameDay } = await lore.from('lore_yarns').select('id, title').eq('day', yarnData.day).eq('month', yarnData.month).neq('id', id)
        setSameDayYarns(sameDay || [])
      }

      // Same event yarns
      if (yarnData.event_id) {
        const { data: sameEvent } = await lore.from('lore_yarns').select('id, title').eq('event_id', yarnData.event_id).neq('id', id)
        setSameEventYarns(sameEvent || [])
      }

      setLoading(false)
    }
    init()
  }, [id])

  const toggleHeart = async () => {
    if (!userId) return
    if (isHearted) {
      await fetch(`/api/lore/yarn/${id}/heart`, { method: 'DELETE' })
      setIsHearted(false)
    } else {
      await fetch(`/api/lore/yarn/${id}/heart`, { method: 'POST' })
      setIsHearted(true)
    }
  }

  const toggleConcur = async () => {
    if (!userId) return
    if (hasConcurred) {
      await fetch(`/api/lore/yarn/${id}/concur`, { method: 'DELETE' })
      setHasConcurred(false)
      setConcurCount(c => c - 1)
    } else {
      await fetch(`/api/lore/yarn/${id}/concur`, { method: 'POST' })
      setHasConcurred(true)
      setConcurCount(c => c + 1)
    }
  }

  const toggleValidate = async () => {
    if (!userId || !canValidate) return
    if (hasValidated) {
      await fetch(`/api/lore/yarn/${id}/validate`, { method: 'DELETE' })
      setHasValidated(false)
      setValidateCount(c => c - 1)
    } else {
      await fetch(`/api/lore/yarn/${id}/validate`, { method: 'POST' })
      setHasValidated(true)
      setValidateCount(c => c + 1)
    }
  }

  const getCharPrevNext = async (charId: string) => {
    const { data: allCharYarns } = await lore.from('lore_yarn_characters').select('yarn_id, lore_yarns(id, year, month, day)').eq('character_id', charId)
    return (allCharYarns || [])
      .map((yc: any) => yc.lore_yarns)
      .filter(Boolean)
      .sort((a: any, b: any) => {
        if (a.year !== b.year) return a.year - b.year
        if ((a.month || 0) !== (b.month || 0)) return (a.month || 0) - (b.month || 0)
        return (a.day || 0) - (b.day || 0)
      })
  }

  const [charNavYarns, setCharNavYarns] = useState<Record<string, any[]>>({})

  useEffect(() => {
    if (!yarn) return
    const mentionedChars: any[] = (yarn.lore_yarn_characters || []).map((yc: any) => yc.lore_characters).filter(Boolean)
    mentionedChars.forEach(async (char: any) => {
      const sorted = await getCharPrevNext(char.id)
      setCharNavYarns(prev => ({ ...prev, [char.id]: sorted }))
    })
  }, [yarn])

  const actionBtn = (active: boolean, red?: boolean): React.CSSProperties => ({
    padding: '8px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit',
    background: active ? (red ? '#C85A5A' : '#000') : 'none',
    color: active ? '#fff' : (red ? '#C85A5A' : '#000'),
    border: `1px solid ${red ? '#C85A5A' : '#000'}`, transition: 'background 0.12s, color 0.12s',
  })

  if (loading) return (
    <div style={{ minHeight: '100vh' }}>
      <Nav />
      <div style={{ padding: '40px', fontSize: 13, color: '#999' }}>Loading...</div>
    </div>
  )
  if (!yarn) return null

  const mentionedChars: any[] = (yarn.lore_yarn_characters || []).map((yc: any) => yc.lore_characters).filter(Boolean)
  const tags: any[] = (yarn.lore_yarn_tags || []).map((yt: any) => yt.lore_tags).filter((t: any) => t && !t.is_taboo)
  const tabooTags: any[] = (yarn.lore_yarn_tags || []).map((yt: any) => yt.lore_tags).filter((t: any) => t && t.is_taboo)
  const author = (yarn.lore_characters as any)?.character_name

  // Extract media
  const images: string[] = []
  const audios: string[] = []
  const imgRegex = /<img[^>]+src="([^"]+)"/g
  const audioRegex = /<audio[^>]+src="([^"]+)"/g
  let m
  const html = yarn.body_html || ''
  while ((m = imgRegex.exec(html)) !== null) images.push(m[1])
  while ((m = audioRegex.exec(html)) !== null) audios.push(m[1])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />
      <main className="page-main">

        <Link href="/lore/index" style={{ fontSize: 11, color: '#999', letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none' }}>
          ← GO BACK
        </Link>

        {/* Title */}
        <div style={{ textAlign: 'center', margin: '24px 0 4px' }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#C85A5A', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {yarn.title}
          </span>
        </div>
        <div style={{ textAlign: 'center', fontSize: 11, color: '#999', marginBottom: 16 }}>
          {formatDate(yarn.day, yarn.month, yarn.year)} · {author}
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #000', marginBottom: 16 }} />

        {/* Meta */}
        {mentionedChars.length > 0 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: 3, flexShrink: 0 }}>CHARACTERS</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {mentionedChars.map((c: any) => (
                <Link key={c.id} href={`/lore/index?char=${encodeURIComponent(c.character_name)}`} style={{ border: '1px solid #C85A5A', padding: '2px 8px', fontSize: 11, color: '#C85A5A', textDecoration: 'none', letterSpacing: '0.06em' }}>
                  {c.character_name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {tags.length > 0 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: 3, flexShrink: 0 }}>TAGS</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {tags.map((t: any) => (
                <span key={t.id} style={{ border: '1px solid #ccc', padding: '2px 8px', fontSize: 11, color: '#666', letterSpacing: '0.06em' }}>{t.name}</span>
              ))}
            </div>
          </div>
        )}

        {yarn.place && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', flexShrink: 0 }}>PLACE</span>
            <span style={{ border: '1px solid #000', padding: '2px 8px', fontSize: 11, letterSpacing: '0.06em' }}>{yarn.place}</span>
          </div>
        )}

        {(yarn.lore_events as any)?.title && (
          <div style={{ marginBottom: 10 }}>
            <Link href={`/lore/index?event=${yarn.event_id}`} style={{ fontSize: 11, color: '#C85A5A', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              EVENT → {(yarn.lore_events as any).title}
            </Link>
          </div>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '8px 0 20px' }} />

        {/* Body */}
        <div
          className="submission-card-body"
          style={{ fontSize: 14, lineHeight: 1.9, marginBottom: 32 }}
          dangerouslySetInnerHTML={{ __html: html.replace(/<img[^>]*>/gi, '').replace(/<audio[^>]*>[\s\S]*?<\/audio>/gi, '') }}
        />

        {/* Attachments */}
        {(images.length > 0 || audios.length > 0) && (
          <div style={{ border: '1px solid #ccc', padding: '20px 24px', marginBottom: 32 }}>
            {images.map((src, i) => (
              <a key={i} href={src} target="_blank" rel="noopener noreferrer">
                <img src={src} alt="" style={{ maxWidth: '100%', marginBottom: 8, display: 'block', cursor: 'pointer' }} />
              </a>
            ))}
            {audios.map((src, i) => (
              <audio key={i} controls src={src} style={{ width: '100%', marginTop: 8, display: 'block' }} />
            ))}
          </div>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid #eee', marginBottom: 20 }} />

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          <button onClick={toggleHeart} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: isHearted ? '#C85A5A' : '#ccc', padding: 0, fontFamily: 'inherit', lineHeight: 1, marginRight: 8 }}>
            {isHearted ? '♥' : '♡'}
          </button>
          <button onClick={toggleConcur} style={actionBtn(hasConcurred)}>
            CONCUR [{concurCount}]
          </button>
          <button onClick={toggleValidate} disabled={!canValidate} style={{ ...actionBtn(hasValidated, true), opacity: canValidate ? 1 : 0.35, cursor: canValidate ? 'pointer' : 'default' }}>
            VALIDATE [{validateCount}]
          </button>
          {!canValidate && (
            <span style={{ fontSize: 10, color: '#999', alignSelf: 'center', letterSpacing: '0.06em' }}>TAGGED ONLY</span>
          )}
        </div>

        {/* Contribute */}
        <div style={{ border: '1px solid #ddd', background: '#fafafa', padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>CONTINUE THE STORY</div>
          <Link href={`/lore/contribute/${yarn.id}`} style={{ textDecoration: 'none' }}>
            <button style={{ border: '1px solid #C85A5A', color: '#C85A5A', background: 'none', padding: '8px 16px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 8, transition: 'background 0.12s, color 0.12s' }}
              onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = '#C85A5A'; (e.target as HTMLButtonElement).style.color = '#fff' }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = 'none'; (e.target as HTMLButtonElement).style.color = '#C85A5A' }}
            >
              + CONTRIBUTE
            </button>
          </Link>
          <div style={{ fontSize: 11, color: '#999' }}>Your yarn will appear below this one in the thread.</div>
        </div>

        {/* Follow a character */}
        {mentionedChars.length > 0 && (
          <div style={{ border: '1px solid #000', marginBottom: 24 }}>
            <div style={{ background: '#000', color: '#fff', padding: '10px 16px', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              FOLLOW A CHARACTER
            </div>
            {mentionedChars.map((char: any) => {
              const sorted = charNavYarns[char.id] || []
              const currentIdx = sorted.findIndex((y: any) => y.id === id)
              const prevYarn = currentIdx > 0 ? sorted[currentIdx - 1] : null
              const nextYarn = currentIdx < sorted.length - 1 ? sorted[currentIdx + 1] : null
              return (
                <div key={char.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#C85A5A', textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1, minWidth: 80 }}>{char.character_name}</span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {prevYarn ? (
                      <Link href={`/lore/yarn/${prevYarn.id}`} style={{ border: '1px solid #ccc', padding: '3px 10px', fontSize: 10, color: '#000', textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        ← HOW THEY GOT HERE
                      </Link>
                    ) : (
                      <span style={{ border: '1px solid #eee', padding: '3px 10px', fontSize: 10, color: '#ccc', letterSpacing: '0.06em', textTransform: 'uppercase' }}>← HOW THEY GOT HERE</span>
                    )}
                    {nextYarn ? (
                      <Link href={`/lore/yarn/${nextYarn.id}`} style={{ border: '1px solid #ccc', padding: '3px 10px', fontSize: 10, color: '#000', textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        WHAT HAPPENED NEXT →
                      </Link>
                    ) : (
                      <span style={{ border: '1px solid #eee', padding: '3px 10px', fontSize: 10, color: '#ccc', letterSpacing: '0.06em', textTransform: 'uppercase' }}>WHAT HAPPENED NEXT →</span>
                    )}
                    <Link href={`/lore/index?char=${encodeURIComponent(char.character_name)}`} style={{ border: '1px solid #ccc', padding: '3px 10px', fontSize: 10, color: '#000', textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      ALL YARNS
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Other yarns nav */}
        {sameEventYarns.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', flex: 1 }}>
              OTHER YARNS — {(yarn.lore_events as any)?.title}
            </span>
            <Link href={`/lore/index?event=${yarn.event_id}`} style={{ border: '1px solid #000', padding: '4px 12px', fontSize: 11, color: '#000', textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              READ →
            </Link>
          </div>
        )}

        {yarn.day && yarn.month && sameDayYarns.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
            <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', flex: 1 }}>
              OTHER YARNS THIS DAY
            </span>
            <Link href={`/lore/index?day=${yarn.day}&month=${yarn.month}&year=${yarn.year}`} style={{ border: '1px solid #000', padding: '4px 12px', fontSize: 11, color: '#000', textDecoration: 'none', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              READ →
            </Link>
          </div>
        )}

      </main>
      <LoreFooter />
    </div>
  )
}

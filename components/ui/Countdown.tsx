'use client'
import { useState, useEffect } from 'react'

export default function Countdown({ closesAt }: { closesAt: string }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const close = new Date(closesAt)
      const diff = close.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeLeft('00:00:00')
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft(
        `${String(days).padStart(2, '0')}:${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      )
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [closesAt])

  return (
    <div>
      <div className="timer">{timeLeft}</div>
      <div className="timer-label">DD : HH : MM : SS</div>
    </div>
  )
}

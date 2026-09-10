import { useEffect, useRef, useState } from 'react'
import './GuessesScroll.css'

// Horizontal-scroll wrapper for a row of CardDisplay boxes, with a dark
// edge-fade hint on whichever side still has more to scroll to (see
// GuessesScroll.css) — the scrollbar itself doesn't render on iOS Safari,
// so this is the only persistent "there's more this way" cue there. Shared
// between App.tsx (the daily game) and UnlimitedPage.tsx rather than
// duplicated, since both need the exact same behavior.

// Remaining scroll distance (px) at which the edge fade hits full strength.
const FADE_DISTANCE = 120

interface GuessesScrollProps {
  children: React.ReactNode
  // Re-checks the fade whenever this changes (pass e.g. guesses.length) —
  // adding a row can flip whether the content is scrollable at all.
  watch: unknown
}

function GuessesScroll({ children, watch }: GuessesScrollProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [fade, setFade] = useState({ left: 0, right: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const updateFade = () => {
      const maxScroll = el.scrollWidth - el.clientWidth
      const strength = (remaining: number) => Math.min(Math.max(remaining, 0), FADE_DISTANCE) / FADE_DISTANCE
      setFade({
        left: strength(el.scrollLeft),
        right: strength(maxScroll - el.scrollLeft),
      })
    }

    updateFade()
    el.addEventListener('scroll', updateFade)
    window.addEventListener('resize', updateFade)
    return () => {
      el.removeEventListener('scroll', updateFade)
      window.removeEventListener('resize', updateFade)
    }
  }, [watch])

  return (
    <div className="guesses-scroll-wrap">
      <div className="guesses-scroll" ref={ref}>
        {children}
      </div>
      <div className="guesses-scroll-fade guesses-scroll-fade--left" style={{ opacity: fade.left }} />
      <div className="guesses-scroll-fade guesses-scroll-fade--right" style={{ opacity: fade.right }} />
    </div>
  )
}

export default GuessesScroll

import { useCallback, useEffect, useRef, useState } from 'react'

export function useScrollHint() {
  const ref = useRef<HTMLDivElement>(null)
  const [showScrollHint, setShowScrollHint] = useState(false)

  const updateScrollHint = useCallback(() => {
    const element = ref.current
    if (!element) return

    const scrollRemaining = element.scrollHeight - element.clientHeight - element.scrollTop
    setShowScrollHint(scrollRemaining > 2)
  }, [])

  useEffect(() => {
    const element = ref.current
    if (!element) return

    updateScrollHint()
    const animationFrame = window.requestAnimationFrame(updateScrollHint)
    const resizeObserver = new ResizeObserver(updateScrollHint)

    element.addEventListener('scroll', updateScrollHint, { passive: true })
    window.addEventListener('resize', updateScrollHint)
    resizeObserver.observe(element)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      element.removeEventListener('scroll', updateScrollHint)
      window.removeEventListener('resize', updateScrollHint)
      resizeObserver.disconnect()
    }
  })

  return { ref, showScrollHint }
}

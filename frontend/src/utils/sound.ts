// Fire-and-forget sound effects. A fresh Audio() per call rather than one
// shared/reused instance — overlapping triggers (e.g. several flip sounds a
// fraction of a second apart) play independently instead of cutting each
// other off.
export function playSound(path: string): void {
  new Audio(path).play().catch(() => {
    // Browsers require a real user gesture (click/tap/keypress) before any
    // audio can play at all — hovering doesn't count, so the very first
    // sound after a fresh page load (e.g. hovering a card before clicking
    // anything) gets silently blocked. Rather than losing it, queue it to
    // fire on the next real interaction instead.
    queueForNextInteraction(path)
  })
}

function queueForNextInteraction(path: string): void {
  const playQueued = () => {
    window.removeEventListener('pointerdown', playQueued)
    window.removeEventListener('keydown', playQueued)
    new Audio(path).play().catch(() => {})
  }
  window.addEventListener('pointerdown', playQueued, { once: true })
  window.addEventListener('keydown', playQueued, { once: true })
}

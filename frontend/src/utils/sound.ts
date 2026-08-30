// Fire-and-forget sound effects. A fresh Audio() per call rather than one
// shared/reused instance — overlapping triggers (e.g. several flip sounds a
// fraction of a second apart) play independently instead of cutting each
// other off.
export function playSound(path: string): void {
  new Audio(path).play().catch(() => {
    // Autoplay can be blocked before any user gesture has happened on the
    // page yet — not worth surfacing, the interaction itself still works.
  })
}

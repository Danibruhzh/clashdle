// Fire-and-forget sound effects. A fresh Audio() per call rather than one
// shared/reused instance — overlapping triggers (e.g. several flip sounds a
// fraction of a second apart) play independently instead of cutting each
// other off.
export function playSound(path: string): void {
  new Audio(path).play().catch(() => {
    // Browsers require a real user gesture (click/tap/keypress) before any
    // audio can play at all — hovering doesn't count, so sounds triggered
    // before the page's first interaction are silently blocked. Once one
    // real interaction happens anywhere on the page, this stops failing on
    // its own; nothing to recover here.
  })
}

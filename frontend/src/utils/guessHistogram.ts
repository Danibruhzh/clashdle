// Guest all-time stats: a histogram of "how many guesses it took to win",
// plus a running count of losses, stored client-side only (no backend, no
// dates — matches CLAUDE.md's guest design). {4: 2} means "won in 4 guesses,
// twice, ever."

const HISTOGRAM_KEY = 'clashdle-guess-histogram'
const LOSS_COUNT_KEY = 'clashdle-loss-count'

export type Histogram = Record<number, number>

function readHistogram(): Histogram {
  try {
    const raw = localStorage.getItem(HISTOGRAM_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    // Missing/corrupt data, or localStorage unavailable — treat as empty
    // rather than breaking the game over a stats read.
    return {}
  }
}

export function getHistogram(): Histogram {
  return readHistogram()
}

// True once this browser has ever recorded a win — no separate flag needed,
// since a non-empty histogram already means exactly that. Used to decide
// whether to auto-open the How to Play modal (see HowToPlayButton usage in
// App.tsx): every load until the player's first win, never again after.
export function hasEverWon(): boolean {
  return Object.keys(readHistogram()).length > 0
}

export function recordWin(guessCount: number): void {
  try {
    const histogram = readHistogram()
    histogram[guessCount] = (histogram[guessCount] ?? 0) + 1
    localStorage.setItem(HISTOGRAM_KEY, JSON.stringify(histogram))
  } catch {
    // Storage full, private-browsing restrictions, etc. — the histogram is
    // a nice-to-have and never worth breaking the game over.
  }
}

function readLossCount(): number {
  try {
    const raw = localStorage.getItem(LOSS_COUNT_KEY)
    const parsed = raw === null ? 0 : Number(raw)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
  } catch {
    return 0
  }
}

export function getLossCount(): number {
  return readLossCount()
}

export function recordLoss(): void {
  try {
    localStorage.setItem(LOSS_COUNT_KEY, String(readLossCount() + 1))
  } catch {
    // Same tradeoff as recordWin — never worth breaking the game over.
  }
}

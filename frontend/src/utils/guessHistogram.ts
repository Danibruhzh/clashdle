// Guest all-time stats live only in this browser. The histogram records how
// many guesses a win took, so {4: 2} means "won in 4 guesses twice."

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
    // Missing, corrupt, or unavailable storage counts as no history.
    return {}
  }
}

export function getHistogram(): Histogram {
  return readHistogram()
}

// True once this browser has ever recorded a win. Used to auto-open How to
// Play on each load until the player's first win, then never again.
export function hasEverWon(): boolean {
  return Object.keys(readHistogram()).length > 0
}

export function recordWin(guessCount: number): void {
  try {
    const histogram = readHistogram()
    histogram[guessCount] = (histogram[guessCount] ?? 0) + 1
    localStorage.setItem(HISTOGRAM_KEY, JSON.stringify(histogram))
  } catch {
    // Stats are best-effort; storage problems should never block the game.
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
    // Same tradeoff as recordWin: do not break gameplay over local stats.
  }
}

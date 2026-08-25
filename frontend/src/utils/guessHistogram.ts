// Guest all-time stats: a histogram of "how many guesses it took to win",
// stored client-side only (no backend, no dates — matches CLAUDE.md's guest
// design). {4: 2} means "won in 4 guesses, twice, ever."

const HISTOGRAM_KEY = 'clashdle-guess-histogram'

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

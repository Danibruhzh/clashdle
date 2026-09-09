// Tracks what this browser's guest stats have already credited to a
// registered account, so signing up for a *second* account on the same
// browser doesn't re-claim the same history — see api/auth.ts's register().
//
// Delta-tracked rather than a one-time flag: registering once shouldn't
// permanently block ever seeding again, since genuinely new guest play
// between registrations is real and should count. It just shouldn't count
// twice. Histogram/loss count are plain running totals, so the delta is a
// subtraction. A streak isn't a running total (it's state, and can regress),
// so "new" means "the guest has won since the last credit" — judged by
// last_win_date advancing, not a numeric difference — and when that's true,
// the *current* streak state is sent as-is rather than some derived delta.

const CREDIT_KEY = 'clashdle-guest-stats-credit'

interface CreditSnapshot {
  histogram: Record<string, number>
  lossCount: number
  lastWinDate: string | null
}

const EMPTY_CREDIT: CreditSnapshot = { histogram: {}, lossCount: 0, lastWinDate: null }

function readCredit(): CreditSnapshot {
  try {
    const raw = localStorage.getItem(CREDIT_KEY)
    if (!raw) return EMPTY_CREDIT
    const parsed = JSON.parse(raw)
    return {
      histogram: typeof parsed?.histogram === 'object' && parsed.histogram !== null ? parsed.histogram : {},
      lossCount: typeof parsed?.lossCount === 'number' ? parsed.lossCount : 0,
      lastWinDate: typeof parsed?.lastWinDate === 'string' ? parsed.lastWinDate : null,
    }
  } catch {
    return EMPTY_CREDIT
  }
}

export interface GuestStatsSnapshot {
  histogram: Record<string, number>
  lossCount: number
  streakCount: number
  bestStreak: number
  lastWinDate: string | null
}

export interface GuestStatsDelta {
  histogram: Record<string, number>
  lossCount: number
  streakCount: number
  bestStreak: number
  lastWinDate: string | null
}

// Call right before building a registration payload — returns only the
// portion of `current` not already credited to an earlier account on this
// browser.
export function getUncreditedGuestStats(current: GuestStatsSnapshot): GuestStatsDelta {
  const credited = readCredit()

  const histogramDelta: Record<string, number> = {}
  for (const [bucket, count] of Object.entries(current.histogram)) {
    const delta = count - (credited.histogram[bucket] ?? 0)
    if (delta > 0) histogramDelta[bucket] = delta
  }

  const lossCountDelta = Math.max(current.lossCount - credited.lossCount, 0)

  // A streak can only ever advance via a real elapsed calendar day (at most
  // one win per day) — comparing last_win_date as plain YYYY-MM-DD strings
  // works since that format sorts lexicographically the same as
  // chronologically, so a later date always compares greater.
  const streakIsNew = current.lastWinDate !== null && (credited.lastWinDate === null || current.lastWinDate > credited.lastWinDate)

  return {
    histogram: histogramDelta,
    lossCount: lossCountDelta,
    streakCount: streakIsNew ? current.streakCount : 0,
    bestStreak: streakIsNew ? current.bestStreak : 0,
    lastWinDate: streakIsNew ? current.lastWinDate : null,
  }
}

// Call after a successful registration — marks everything currently in
// `current` as claimed, so the next registration on this browser only ever
// sees whatever's genuinely new after this point.
export function markGuestStatsCredited(current: GuestStatsSnapshot): void {
  try {
    const snapshot: CreditSnapshot = {
      histogram: current.histogram,
      lossCount: current.lossCount,
      lastWinDate: current.lastWinDate,
    }
    localStorage.setItem(CREDIT_KEY, JSON.stringify(snapshot))
  } catch {
    // Storage full/unavailable — worst case a future registration on this
    // browser re-sends everything again; not worth breaking signup over.
  }
}

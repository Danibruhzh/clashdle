// Guest daily-win streak, stored client-side only (localStorage, no backend)
// — same guest-first design as guessHistogram.ts. Kept as a plain
// {count, lastWinDate} shape specifically so it's an easy, obvious column to
// carry over once an account exists to merge it into (per CLAUDE.md's
// planned register-seeds-from-localStorage flow).

const STREAK_KEY = 'clashdle-streak'

interface StreakData {
  count: number
  // YYYY-MM-DD in the player's own local date — deliberately not a server
  // date; a streak is about the player's own daily rhythm; see
  // core/time.py's equivalent per-client reasoning on the backend.
  lastWinDate: string
}

const EMPTY_STREAK: StreakData = { count: 0, lastWinDate: '' }

function toDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function todayString(): string {
  return toDateString(new Date())
}

function yesterdayString(): string {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  return toDateString(date)
}

function readStreak(): StreakData {
  try {
    const raw = localStorage.getItem(STREAK_KEY)
    if (!raw) return EMPTY_STREAK
    const parsed = JSON.parse(raw)
    return typeof parsed?.count === 'number' && typeof parsed?.lastWinDate === 'string'
      ? parsed
      : EMPTY_STREAK
  } catch {
    // Missing/corrupt data, or localStorage unavailable — treat as empty
    // rather than breaking the game over a streak read.
    return EMPTY_STREAK
  }
}

// The streak as of right now — self-corrects to 0 once the last win is
// neither today nor yesterday, without needing anything to have explicitly
// "broken" it (no background job, no login-triggered check — just computed
// lazily whenever this is read).
export function getStreak(): number {
  const { count, lastWinDate } = readStreak()
  if (lastWinDate !== todayString() && lastWinDate !== yesterdayString()) return 0
  return count
}

// Call once per live win (mirrors guessHistogram.ts's recordWin — only the
// live-win path, never the page-load restore path, so reloading an
// already-won day doesn't double-count). Returns the streak after this win,
// for the caller to render immediately without a second read.
export function recordStreakWin(): number {
  const { count, lastWinDate } = readStreak()
  const today = todayString()
  if (lastWinDate === today) return count // today's win already recorded

  const newCount = lastWinDate === yesterdayString() ? count + 1 : 1
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify({ count: newCount, lastWinDate: today }))
  } catch {
    // Storage full, private-browsing restrictions, etc. — the streak is a
    // nice-to-have and never worth breaking the game over.
  }
  return newCount
}

// Guest daily-win streak, stored in this browser only. The simple
// {count, lastWinDate, best} shape makes it easy to seed a new account from
// guest history during registration.

const STREAK_KEY = 'clashdle-streak'

interface StreakData {
  count: number
  // YYYY-MM-DD in the player's local date. A streak follows the player's day,
  // not the server's.
  lastWinDate: string
  // Highest count ever reached. This survives current-streak resets.
  best: number
}

const EMPTY_STREAK: StreakData = { count: 0, lastWinDate: '', best: 0 }

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
    if (typeof parsed?.count !== 'number' || typeof parsed?.lastWinDate !== 'string') return EMPTY_STREAK
    // Older data did not have "best", so use count as the closest fallback.
    const best = typeof parsed.best === 'number' ? parsed.best : parsed.count
    return { count: parsed.count, lastWinDate: parsed.lastWinDate, best }
  } catch {
    // Missing, corrupt, or unavailable storage counts as no streak history.
    return EMPTY_STREAK
  }
}

// Current streak, computed lazily. If the last win was not today or yesterday,
// the streak has lapsed and reads as 0.
export function getStreak(): number {
  const { count, lastWinDate } = readStreak()
  if (lastWinDate !== todayString() && lastWinDate !== yesterdayString()) return 0
  return count
}

// The highest daily win streak this browser has ever reached, regardless of
// whether the current streak has since lapsed back to 0.
export function getBestStreak(): number {
  return readStreak().best
}

// Raw YYYY-MM-DD of the last recorded win, or null if there has never been
// one. Registration sends this to the server so account streaks can use the
// same date-based logic.
export function getLastWinDate(): string | null {
  const { lastWinDate } = readStreak()
  return lastWinDate || null
}

// Call once per live win, never for restored guesses. Returns the updated
// streak so the caller can render it immediately.
export function recordStreakWin(): number {
  const { count, lastWinDate, best } = readStreak()
  const today = todayString()
  if (lastWinDate === today) return count // today's win already recorded

  const newCount = lastWinDate === yesterdayString() ? count + 1 : 1
  const newBest = Math.max(best, newCount)
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify({ count: newCount, lastWinDate: today, best: newBest }))
  } catch {
    // Streaks are best-effort; storage problems should never block the game.
  }
  return newCount
}

// Mirrors backend/app/schemas/guess.py — keep these in sync if that changes.

export type StatComparison = 'match' | 'mismatch' | 'higher' | 'lower'

export interface GuessResult {
  comparisons: Record<string, StatComparison>
  is_correct: boolean
  // Set only on the guess that uses up the last of 8 tries without winning.
  reveal_answer: string | null
}

export interface PastGuess {
  card_name: string
  comparisons: Record<string, StatComparison>
  is_correct: boolean
}

export interface TodayGuesses {
  guesses: PastGuess[]
  // Set when this session already lost today's game before this page load.
  reveal_answer: string | null
}

export interface PreviousAnswer {
  card_name: string | null
}

export interface TodayWinners {
  winners_count: number
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

// Which day's card this browser plays is decided by this timezone, not a
// fixed one on the backend — see core/time.py's get_client_today. Read once;
// a player's timezone doesn't change mid-session.
const TIMEZONE_HEADERS = { 'X-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone }

export async function submitGuess(cardName: string): Promise<GuessResult> {
  const response = await fetch(`${API_BASE_URL}/game/guess`, {
    method: 'POST',
    // Required so the guest-session cookie the backend sets is actually
    // stored and sent back on future requests — frontend and backend are
    // different origins (different ports locally, different domains once
    // deployed), so cookies are opt-in via credentials: 'include'.
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...TIMEZONE_HEADERS },
    body: JSON.stringify({ guess_name: cardName }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.detail ?? `Guess request failed (${response.status})`)
  }

  return response.json()
}

export async function fetchTodayGuesses(): Promise<TodayGuesses> {
  const response = await fetch(`${API_BASE_URL}/game/today`, {
    credentials: 'include',
    headers: TIMEZONE_HEADERS,
  })

  if (!response.ok) {
    throw new Error(`Failed to load today's guesses (${response.status})`)
  }

  return response.json()
}

export async function fetchPreviousAnswer(): Promise<PreviousAnswer> {
  const response = await fetch(`${API_BASE_URL}/game/previous-answer`, {
    credentials: 'include',
    headers: TIMEZONE_HEADERS,
  })

  if (!response.ok) {
    throw new Error(`Failed to load previous answer (${response.status})`)
  }

  return response.json()
}

export async function fetchTodayWinners(): Promise<TodayWinners> {
  // Public count, not tied to this browser's guest session — no cookie needed.
  // Still needs the timezone header though, since "today" now depends on it.
  const response = await fetch(`${API_BASE_URL}/game/today/winners`, {
    headers: TIMEZONE_HEADERS,
  })

  if (!response.ok) {
    throw new Error(`Failed to load today's winners count (${response.status})`)
  }

  return response.json()
}

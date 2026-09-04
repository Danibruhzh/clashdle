// Mirrors backend/app/schemas/guess.py — keep these in sync if that changes.

import { getGuestSessionId } from '../utils/guestSession'

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

// Identifies this browser's guesses to the backend — see guestSession.ts for
// why this is a header the client attaches itself rather than a cookie the
// backend sets. Read once; stable for the life of the page the same way
// TIMEZONE_HEADERS is.
const GUEST_SESSION_HEADERS = { 'X-Guest-Session-Id': getGuestSessionId() }

export async function submitGuess(cardName: string): Promise<GuessResult> {
  const response = await fetch(`${API_BASE_URL}/game/guess`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...TIMEZONE_HEADERS, ...GUEST_SESSION_HEADERS },
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
    headers: { ...TIMEZONE_HEADERS, ...GUEST_SESSION_HEADERS },
  })

  if (!response.ok) {
    throw new Error(`Failed to load today's guesses (${response.status})`)
  }

  return response.json()
}

export async function fetchPreviousAnswer(): Promise<PreviousAnswer> {
  const response = await fetch(`${API_BASE_URL}/game/previous-answer`, {
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

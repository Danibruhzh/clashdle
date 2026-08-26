// Mirrors backend/app/schemas/guess.py — keep these in sync if that changes.

export type StatComparison = 'match' | 'mismatch' | 'higher' | 'lower'

export interface GuessResult {
  comparisons: Record<string, StatComparison>
  is_correct: boolean
}

export interface PastGuess {
  card_name: string
  comparisons: Record<string, StatComparison>
  is_correct: boolean
}

export interface TodayGuesses {
  guesses: PastGuess[]
}

export interface PreviousAnswer {
  card_name: string | null
}

export interface TodayWinners {
  winners_count: number
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export async function submitGuess(cardName: string): Promise<GuessResult> {
  const response = await fetch(`${API_BASE_URL}/game/guess`, {
    method: 'POST',
    // Required so the guest-session cookie the backend sets is actually
    // stored and sent back on future requests — frontend and backend are
    // different origins (different ports locally, different domains once
    // deployed), so cookies are opt-in via credentials: 'include'.
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
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
  })

  if (!response.ok) {
    throw new Error(`Failed to load today's guesses (${response.status})`)
  }

  return response.json()
}

export async function fetchPreviousAnswer(): Promise<PreviousAnswer> {
  const response = await fetch(`${API_BASE_URL}/game/previous-answer`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(`Failed to load previous answer (${response.status})`)
  }

  return response.json()
}

export async function fetchTodayWinners(): Promise<TodayWinners> {
  // Public count, not tied to this browser's guest session — no cookie needed.
  const response = await fetch(`${API_BASE_URL}/game/today/winners`)

  if (!response.ok) {
    throw new Error(`Failed to load today's winners count (${response.status})`)
  }

  return response.json()
}

// Dev-only for now, wired to the Reset button — see routers/game.py's
// reset_today for what this previews.
export async function resetTodayGuesses(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/game/today`, {
    method: 'DELETE',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(`Failed to reset today's guesses (${response.status})`)
  }
}

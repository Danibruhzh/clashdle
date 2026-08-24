// Mirrors backend/app/schemas/guess.py — keep these in sync if that changes.

export type StatComparison = 'match' | 'mismatch' | 'higher' | 'lower'

export interface GuessResult {
  comparisons: Record<string, StatComparison>
  is_correct: boolean
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

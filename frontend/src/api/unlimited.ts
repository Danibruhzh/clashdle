// Mirrors backend/app/schemas/unlimited.py — keep these in sync if that changes.
// Unlike api/game.ts, every call here requires login (Unlimited has no
// guest mode at all), so there's no guest-session header, only the auth one.

import { getAuthToken } from '../utils/authSession'
import type { StatComparison } from './game'

export interface UnlimitedGuessResult {
  comparisons: Record<string, StatComparison>
  is_correct: boolean
  // Set only on the guess that uses up the last of 8 tries without winning.
  reveal_answer: string | null
}

export interface UnlimitedPastGuess {
  card_name: string
  comparisons: Record<string, StatComparison>
  is_correct: boolean
}

export interface UnlimitedRound {
  guesses: UnlimitedPastGuess[]
  has_active_round: boolean
}

export interface UnlimitedStats {
  games_played: number
  wins: number
  current_streak: number
  best_streak: number
  histogram: Record<string, number>
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

// Only /start actually needs this (it checks whether today's daily is
// finished, which depends on the client's own "today" — see
// core/time.py's get_client_today) but sending it on every call is
// harmless and keeps this consistent with api/game.ts.
const TIMEZONE_HEADERS = { 'X-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone }

function authHeaders(): Record<string, string> {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function parseOrThrow<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.detail ?? `${fallbackMessage} (${response.status})`)
  }
  return response.json()
}

export async function fetchCurrentUnlimitedRound(): Promise<UnlimitedRound> {
  const response = await fetch(`${API_BASE_URL}/unlimited/current`, {
    headers: { ...TIMEZONE_HEADERS, ...authHeaders() },
  })
  return parseOrThrow(response, "Failed to load Unlimited round")
}

export async function startUnlimitedRound(): Promise<UnlimitedRound> {
  const response = await fetch(`${API_BASE_URL}/unlimited/start`, {
    method: 'POST',
    headers: { ...TIMEZONE_HEADERS, ...authHeaders() },
  })
  return parseOrThrow(response, 'Failed to start Unlimited round')
}

export async function submitUnlimitedGuess(cardName: string): Promise<UnlimitedGuessResult> {
  const response = await fetch(`${API_BASE_URL}/unlimited/guess`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...TIMEZONE_HEADERS, ...authHeaders() },
    body: JSON.stringify({ guess_name: cardName }),
  })
  return parseOrThrow(response, 'Guess request failed')
}

export async function fetchUnlimitedStats(): Promise<UnlimitedStats> {
  const response = await fetch(`${API_BASE_URL}/unlimited/stats`, {
    headers: { ...TIMEZONE_HEADERS, ...authHeaders() },
  })
  return parseOrThrow(response, 'Failed to load Unlimited stats')
}

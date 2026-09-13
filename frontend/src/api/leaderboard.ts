// Mirrors backend/app/schemas/leaderboard.py — keep in sync if that changes.
// Public, unauthenticated, same as fetchTodayWinners in api/game.ts — no
// headers needed at all, not even the timezone one (nothing here depends
// on "today").

export interface StreakEntry {
  username: string
  best_streak: number
}

export interface WinsEntry {
  username: string
  wins: number
}

export interface AvgGuessesEntry {
  username: string
  avg_guesses: number
}

export interface Leaderboard {
  top_streak: StreakEntry[]
  top_wins: WinsEntry[]
  top_avg_guesses: AvgGuessesEntry[]
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export async function fetchLeaderboard(): Promise<Leaderboard> {
  const response = await fetch(`${API_BASE_URL}/leaderboard`, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Failed to load leaderboard (${response.status})`)
  }
  return response.json()
}

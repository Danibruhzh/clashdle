// Mirrors backend/app/schemas/auth.py — keep these in sync if that changes.

import { getHistogram, getLossCount } from '../utils/guessHistogram'
import { getStreak, getBestStreak, getLastWinDate } from '../utils/streak'

export interface GuestStatsPayload {
  histogram: Record<string, number>
  loss_count: number
  streak_count: number
  best_streak: number
  last_win_date: string | null
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface UserProfile {
  id: number
  username: string
  email: string
  created_at: string
}

export interface UserStats {
  games_played: number
  wins: number
  current_streak: number
  best_streak: number
  histogram: Record<string, number>
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

async function parseOrThrow<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.detail ?? `${fallbackMessage} (${response.status})`)
  }
  return response.json()
}

// This browser's current guest-side numbers, shaped for the register
// request below — read once at signup time, matching CLAUDE.md's "read the
// current localStorage histogram and send it once" flow. Called fresh on
// every register() rather than cached, since a guest might play more
// between opening the signup form and actually submitting it.
function buildGuestStatsPayload(): GuestStatsPayload {
  return {
    histogram: getHistogram(),
    loss_count: getLossCount(),
    streak_count: getStreak(),
    best_streak: getBestStreak(),
    last_win_date: getLastWinDate(),
  }
}

export async function register(username: string, email: string, password: string): Promise<TokenResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password, guest_stats: buildGuestStatsPayload() }),
  })
  return parseOrThrow(response, 'Registration failed')
}

export async function login(identifier: string, password: string): Promise<TokenResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  })
  return parseOrThrow(response, 'Login failed')
}

export async function fetchProfile(token: string): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return parseOrThrow(response, 'Failed to load profile')
}

export async function fetchUserStats(token: string): Promise<UserStats> {
  const response = await fetch(`${API_BASE_URL}/me/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return parseOrThrow(response, 'Failed to load stats')
}

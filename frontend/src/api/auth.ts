// Mirrors backend/app/schemas/auth.py — keep these in sync if that changes.

import { getHistogram, getLossCount } from '../utils/guessHistogram'
import { getStreak, getBestStreak, getLastWinDate } from '../utils/streak'
import { getUncreditedGuestStats, markGuestStatsCredited } from '../utils/guestStatsCredit'
import type { GuestStatsSnapshot } from '../utils/guestStatsCredit'

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

// This browser's current guest-side numbers, read once at signup time —
// called fresh on every register() rather than cached, since a guest might
// play more between opening the signup form and actually submitting it.
function readGuestStatsSnapshot(): GuestStatsSnapshot {
  return {
    histogram: getHistogram(),
    lossCount: getLossCount(),
    streakCount: getStreak(),
    bestStreak: getBestStreak(),
    lastWinDate: getLastWinDate(),
  }
}

export async function register(username: string, email: string, password: string): Promise<TokenResponse> {
  // Only the portion of this browser's guest stats not already credited to
  // an earlier account gets sent — see guestStatsCredit.ts for why (repeat
  // registrations on one browser would otherwise each claim the same guest
  // history as their own).
  const current = readGuestStatsSnapshot()
  const delta = getUncreditedGuestStats(current)
  const guestStats: GuestStatsPayload = {
    histogram: delta.histogram,
    loss_count: delta.lossCount,
    streak_count: delta.streakCount,
    best_streak: delta.bestStreak,
    last_win_date: delta.lastWinDate,
  }

  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password, guest_stats: guestStats }),
  })
  const result = await parseOrThrow<TokenResponse>(response, 'Registration failed')
  // Only mark credited once the account actually exists — a failed
  // registration (duplicate username, network error, etc.) leaves this
  // browser's guest stats fully available to try again.
  markGuestStatsCredited(current)
  return result
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

import { useState, useEffect } from 'react'
import { fetchProfile, fetchUserStats } from '../api/auth'
import type { UserProfile, UserStats } from '../api/auth'
import { fetchUnlimitedStats } from '../api/unlimited'
import type { UnlimitedStats } from '../api/unlimited'
import { getAuthToken, clearAuthToken } from '../utils/authSession'
import AuthForm from './AuthForm'
import './ProfileModal.css'

interface ProfileModalProps {
  onClose: () => void
  // Called right after a successful login/register/logout so App.tsx's own
  // "is someone logged in" state (which drives the toolbar badge) stays in
  // sync without this modal needing to own that state itself.
  onAuthChange: (loggedIn: boolean) => void
}

// Combines both modes' histograms into one weighted average guess count —
// "totals the daily game and Unlimited stats" together rather than showing
// two separate averages. null (rendered as "—") only when there are zero
// wins in either mode to average over.
function averageGuessesToWin(daily: UserStats | null, unlimited: UnlimitedStats | null): number | null {
  let totalGuesses = 0
  let totalWins = 0
  for (const histogram of [daily?.histogram, unlimited?.histogram]) {
    if (!histogram) continue
    for (const [guesses, count] of Object.entries(histogram)) {
      totalGuesses += Number(guesses) * count
      totalWins += count
    }
  }
  return totalWins === 0 ? null : totalGuesses / totalWins
}

function ProfileModal({ onClose, onAuthChange }: ProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [dailyStats, setDailyStats] = useState<UserStats | null>(null)
  const [unlimitedStats, setUnlimitedStats] = useState<UnlimitedStats | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  // On open, check whether a token already exists and still works — a
  // token that's since expired or been invalidated just falls back to the
  // logged-out view instead of showing a broken profile. The two stats
  // fetches are best-effort alongside it: a failure there shouldn't log the
  // account out the way a failed profile fetch does, just leave those
  // numbers reading as zero (see averageGuessesToWin/the render below).
  useEffect(() => {
    let cancelled = false
    const token = getAuthToken()
    if (!token) {
      setLoadingProfile(false)
      return
    }
    Promise.all([fetchProfile(token), fetchUserStats(token).catch(() => null), fetchUnlimitedStats().catch(() => null)])
      .then(([p, daily, unlimited]) => {
        if (cancelled) return
        setProfile(p)
        setDailyStats(daily)
        setUnlimitedStats(unlimited)
      })
      .catch(() => {
        if (!cancelled) clearAuthToken()
      })
      .finally(() => {
        if (!cancelled) setLoadingProfile(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // AuthForm only knows "login/register just succeeded" — it doesn't fetch
  // or hold onto the profile itself, so this fetches it here once that
  // happens, in addition to passing the change up to App.tsx.
  const handleAuthChange = (nowLoggedIn: boolean) => {
    if (nowLoggedIn) {
      const token = getAuthToken()
      if (token) {
        fetchProfile(token).then(setProfile).catch(() => {})
        fetchUserStats(token).then(setDailyStats).catch(() => {})
        fetchUnlimitedStats().then(setUnlimitedStats).catch(() => {})
      }
    }
    onAuthChange(nowLoggedIn)
  }

  const handleLogout = () => {
    clearAuthToken()
    setProfile(null)
    setDailyStats(null)
    setUnlimitedStats(null)
    onAuthChange(false)
  }

  const avgGuesses = averageGuessesToWin(dailyStats, unlimitedStats)

  return (
    <div className="profile-modal-backdrop" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-modal-header">
          <h2>{profile ? 'Your Profile' : ''}</h2>
          <button className="profile-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {loadingProfile ? (
          <p className="profile-modal-loading">Loading…</p>
        ) : profile ? (
          <div className="profile-modal-account">
            <div className="profile-modal-identity">
              <div className="profile-modal-account-row">
                <span className="profile-modal-account-label">Username</span>
                <span className="profile-modal-account-value">{profile.username}</span>
              </div>
              <div className="profile-modal-account-row">
                <span className="profile-modal-account-label">Email</span>
                <span className="profile-modal-account-value">{profile.email}</span>
              </div>
            </div>

            <div className="profile-modal-stats">
              <div className="profile-modal-stat">
                <span className="profile-modal-stat-value">{dailyStats?.wins ?? 0}</span>
                <span className="profile-modal-stat-label">Daily Wins</span>
              </div>
              <div className="profile-modal-stat">
                <span className="profile-modal-stat-value">{unlimitedStats?.wins ?? 0}</span>
                <span className="profile-modal-stat-label">Unlimited Wins</span>
              </div>
              <div className="profile-modal-stat">
                <span className="profile-modal-stat-value">{avgGuesses === null ? '—' : avgGuesses.toFixed(1)}</span>
                <span className="profile-modal-stat-label">Avg Guesses</span>
              </div>
            </div>

            <button className="profile-modal-logout" onClick={handleLogout}>
              Log Out
            </button>
          </div>
        ) : (
          <AuthForm onAuthChange={handleAuthChange} />
        )}
      </div>
    </div>
  )
}

export default ProfileModal

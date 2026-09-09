import { useState, useEffect } from 'react'
import { getStreak, getBestStreak } from '../utils/streak'
import { getAuthToken } from '../utils/authSession'
import { fetchUserStats } from '../api/auth'
import './StreakModal.css'

interface StreakModalProps {
  onClose: () => void
}

// Same shape either way, just sourced differently — from localStorage for a
// guest, from /me/stats for a logged-in account. Mirrors StatsPanel.tsx's
// own guest-vs-account split; this modal had the same gap StatsPanel did
// (always reading local guest numbers regardless of login state) until now.
interface ResolvedStreak {
  current: number
  best: number
}

function readGuestStreak(): ResolvedStreak {
  return { current: getStreak(), best: getBestStreak() }
}

function StreakModal({ onClose }: StreakModalProps) {
  const [streak, setStreak] = useState<ResolvedStreak | null>(() => {
    const token = getAuthToken()
    return token ? null : readGuestStreak() // null while a logged-in fetch is in flight
  })

  useEffect(() => {
    const token = getAuthToken()
    if (!token) return // already resolved synchronously above
    let cancelled = false
    fetchUserStats(token)
      .then((s) => {
        if (!cancelled) setStreak({ current: s.current_streak, best: s.best_streak })
      })
      .catch(() => {
        // Token expired/invalid, request failed, etc. — fall back to this
        // browser's own guest numbers rather than showing nothing.
        if (!cancelled) setStreak(readGuestStreak())
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="streak-modal-backdrop" onClick={onClose}>
      <div className="streak-modal" onClick={(e) => e.stopPropagation()}>
        <div className="streak-modal-header">
          <h2>Your Streak</h2>
          <button className="streak-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {streak === null ? (
          <p className="streak-modal-loading">Loading…</p>
        ) : (
          <div className="streak-modal-summary">
            <div className="streak-modal-stat">
              <span className="streak-modal-value">{streak.current}</span>
              <span className="streak-modal-label">Current Streak</span>
            </div>
            <div className="streak-modal-stat">
              {/* Same number as Current whenever the player's ongoing streak
                  is also their all-time high — not a special case, just what
                  best_streak naturally is once it's been kept in sync with
                  every win (see record_win in services/user_stats.py, or
                  recordStreakWin in utils/streak.ts for the guest side). */}
              <span className="streak-modal-value">{streak.best}</span>
              <span className="streak-modal-label">Best Streak</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StreakModal

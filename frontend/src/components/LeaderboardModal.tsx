import { useState, useEffect } from 'react'
import { fetchLeaderboard } from '../api/leaderboard'
import type { Leaderboard } from '../api/leaderboard'
import './LeaderboardModal.css'

interface LeaderboardModalProps {
  onClose: () => void
}

type Tab = 'streak' | 'wins' | 'avg'

const TAB_LABELS: Record<Tab, string> = {
  streak: 'Win Streak',
  wins: 'Most Wins',
  avg: 'Avg Guesses',
}

// Shown under the tab bar — see services/leaderboard.py's own docstring for
// why streak/wins are Unlimited-only while avg guesses combines both modes.
const TAB_SUBTITLES: Record<Tab, string> = {
  streak: 'Unlimited mode only',
  wins: 'Unlimited mode only',
  avg: 'Daily + Unlimited combined',
}

function LeaderboardModal({ onClose }: LeaderboardModalProps) {
  const [tab, setTab] = useState<Tab>('streak')
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchLeaderboard()
      .then((data) => !cancelled && setLeaderboard(data))
      .catch(() => !cancelled && setError(true))
    return () => {
      cancelled = true
    }
  }, [])

  const rows =
    leaderboard === null
      ? null
      : tab === 'streak'
        ? leaderboard.top_streak.map((e) => ({ username: e.username, value: String(e.best_streak) }))
        : tab === 'wins'
          ? leaderboard.top_wins.map((e) => ({ username: e.username, value: String(e.wins) }))
          : leaderboard.top_avg_guesses.map((e) => ({ username: e.username, value: e.avg_guesses.toFixed(2) }))

  return (
    <div className="leaderboard-modal-backdrop" onClick={onClose}>
      <div className="leaderboard-modal" onClick={(e) => e.stopPropagation()}>
        <div className="leaderboard-modal-header">
          <h2>Leaderboard</h2>
          <button className="leaderboard-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="leaderboard-modal-tabs">
          {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
            <button
              key={t}
              className={`leaderboard-modal-tab${tab === t ? ' leaderboard-modal-tab--active' : ''}`}
              onClick={() => setTab(t)}
              type="button"
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
        <p className="leaderboard-modal-subtitle">{TAB_SUBTITLES[tab]}</p>

        {error ? (
          <p className="leaderboard-modal-loading">Couldn't load the leaderboard.</p>
        ) : rows === null ? (
          <p className="leaderboard-modal-loading">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="leaderboard-modal-loading">No qualifying players yet.</p>
        ) : (
          <ol className="leaderboard-modal-list">
            {rows.map((row, index) => (
              <li className="leaderboard-modal-row" key={row.username}>
                <span className="leaderboard-modal-rank">{index + 1}</span>
                <span className="leaderboard-modal-username">{row.username}</span>
                <span className="leaderboard-modal-value">{row.value}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

export default LeaderboardModal

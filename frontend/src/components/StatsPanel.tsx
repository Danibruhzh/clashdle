import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getHistogram, getLossCount } from '../utils/guessHistogram'
import { getAuthToken } from '../utils/authSession'
import { useScrollHint } from '../utils/useScrollHint'
import { fetchUserStats } from '../api/auth'
import type { StatComparison } from '../api/game'
import './StatsPanel.css'

// Mirrors backend/app/services/game.py's MAX_GUESSES for what the chart
// displays now. Stored stats still keep the old 8th bucket as legacy data;
// the 7 bar folds that in visually, while averages elsewhere still use the
// raw buckets so old 8-guess wins remain mathematically honest.
const MAX_GUESSES = 7
const LEGACY_HISTOGRAM_BUCKETS = [8]

interface StatsPanelProps {
  onClose: () => void
  // Set whenever today's game is already won — shows the win message above
  // the histogram, whether the panel just auto-opened from that win or was
  // reopened manually afterward.
  guessCount?: number
  // Set whenever today's game is already lost (all guesses used, none
  // correct) — holds the revealed card name, shown instead of the win
  // message. Mutually exclusive with guessCount.
  lossAnswer?: string
  dailyShareGuesses?: Record<string, StatComparison>[]
  // UnlimitedPage already has its own (Unlimited-specific, not daily)
  // stats loaded elsewhere on that page — passing it here skips this
  // component's own fetch/guest-fallback entirely, using this instead.
  // Omitted entirely (the home page's usage) means "fetch the daily
  // account's stats, or read the guest's own"; null means "loading" (the
  // caller's own fetch hasn't resolved yet), not "logged out".
  statsOverride?: ResolvedStats | null
  title?: string
  // App.tsx sets this once today's daily is finished — shows a "Play
  // Unlimited"/"Log in to play Unlimited" link out of this panel.
  // UnlimitedPage never sets it: that link would just point back at the
  // page it's already on.
  showUnlimitedCta?: boolean
  // UnlimitedPage only: renders a Play Again button when set, for
  // replaying right from the panel that just showed this round's result
  // (see onPlayAgain's own call site for why it also closes the panel).
  // Undefined hides the button entirely — the daily game has no replay.
  onPlayAgain?: () => void
  playAgainDisabled?: boolean
}

// Same shape either way, just sourced differently — from localStorage for a
// guest, from /me/stats for a logged-in account (see App.tsx's own gating of
// recordWin/recordLoss/recordStreakWin: once logged in those stop writing
// locally entirely, so this is the only place server stats actually get
// read back in). gamesPlayed/wins are carried as their own fields rather
// than re-derived from histogram at render time — the two happen to always
// agree today (the backend increments them in lockstep; see
// services/user_stats.py's record_win), but the summary numbers shouldn't
// silently depend on that holding forever when the real fields are right
// here. histogram is used only for the bar chart's shape.
interface ResolvedStats {
  histogram: Record<string, number>
  gamesPlayed: number
  wins: number
}

const SHARE_URL = 'https://clashdle.app/'
const SHARE_BOX: Record<StatComparison, string> = {
  match: '🟩',
  partial: '🟨',
  mismatch: '🟥',
  higher: '⬆️',
  lower: '⬇️',
}

const SHARE_STAT_ORDER = [
  'Cost',
  'Type',
  'Rarity',
  'Target',
  'Hitpoints',
  'Damage',
  'Damage Per Second',
  'Special Damage',
]

function readGuestStats(): ResolvedStats {
  const histogram = getHistogram()
  // Keep legacy 8-guess wins in the guest summary even though the visible
  // chart now folds them into the 7 bar. Truly stray buckets outside the
  // known 1..8 range still stay ignored.
  const wins = [...Array.from({ length: MAX_GUESSES }, (_, i) => i + 1), ...LEGACY_HISTOGRAM_BUCKETS]
    .map((bucket) => histogram[bucket] ?? 0)
    .reduce((a, b) => a + b, 0)
  return { histogram, gamesPlayed: wins + getLossCount(), wins }
}

function StatsPanel({
  onClose,
  guessCount,
  lossAnswer,
  dailyShareGuesses,
  statsOverride,
  title = 'Your Stats',
  showUnlimitedCta = false,
  onPlayAgain,
  playAgainDisabled = false,
}: StatsPanelProps) {
  const [copiedShare, setCopiedShare] = useState(false)
  const { ref: panelRef, showScrollHint } = useScrollHint()
  // Whether this instance owns fetching its own stats at all — decided
  // once, from whether the caller passed statsOverride in the first place
  // (regardless of its value), not from what that value currently is.
  const usesOverride = statsOverride !== undefined

  const [fetched, setFetched] = useState<ResolvedStats | null>(() => {
    if (usesOverride) return null // unused in this mode; see `stats` below
    const token = getAuthToken()
    return token ? null : readGuestStats() // null while a logged-in fetch is in flight
  })

  useEffect(() => {
    if (usesOverride) return // caller owns this data — see UnlimitedPage.tsx
    const token = getAuthToken()
    if (!token) return // already resolved synchronously above
    let cancelled = false
    fetchUserStats(token)
      .then((s) => {
        if (!cancelled) setFetched({ histogram: s.histogram, gamesPlayed: s.games_played, wins: s.wins })
      })
      .catch(() => {
        // Token expired/invalid, request failed, etc. — fall back to this
        // browser's own guest numbers rather than showing nothing.
        if (!cancelled) setFetched(readGuestStats())
      })
    return () => {
      cancelled = true
    }
    // usesOverride can't actually change after mount (callers don't toggle
    // whether they pass the prop), so listing it changes nothing behaviorally
    // — just satisfies the lint rule without a disable comment.
  }, [usesOverride])

  const stats = usesOverride ? statsOverride : fetched

  useEffect(() => {
    setCopiedShare(false)
  }, [dailyShareGuesses, guessCount, lossAnswer, statsOverride])

  if (stats === null) {
    return (
      <div className="stats-panel-backdrop" onClick={onClose}>
        <div
          className={`stats-panel-frame${showScrollHint ? '' : ' stats-panel-frame--scroll-end'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="stats-panel" ref={panelRef}>
            <div className="stats-panel-header">
              <h2>{title}</h2>
              <button className="stats-panel-close" onClick={onClose} aria-label="Close">
                ✕
              </button>
            </div>
            <p className="stats-panel-loading">Loading…</p>
          </div>
        </div>
      </div>
    )
  }

  const bars = Array.from({ length: MAX_GUESSES }, (_, i) => {
    const guesses = i + 1
    const legacyCount =
      guesses === MAX_GUESSES
        ? LEGACY_HISTOGRAM_BUCKETS.reduce((sum, bucket) => sum + (stats.histogram[bucket] ?? 0), 0)
        : 0
    return { guesses, count: (stats.histogram[guesses] ?? 0) + legacyCount }
  })

  const { gamesPlayed, wins } = stats
  const winRate = gamesPlayed === 0 ? null : Math.round((wins / gamesPlayed) * 100)
  const maxCount = Math.max(1, ...bars.map((b) => b.count))

  const loggedIn = getAuthToken() !== null
  const isFinishedDaily = statsOverride === undefined && (guessCount !== undefined || lossAnswer !== undefined)
  const shareRows = dailyShareGuesses?.map((comparisons) =>
    SHARE_STAT_ORDER.map((stat) => comparisons[stat])
      .filter((comparison): comparison is StatComparison => comparison !== undefined)
      .map((comparison) => SHARE_BOX[comparison])
      .join('')
  )
  const shareText =
    isFinishedDaily && shareRows && shareRows.length > 0
      ? [
          'Clashdle.app',
          ...shareRows,
          '',
          guessCount !== undefined
            ? `I guessed today's entity in ${guessCount} guess${guessCount === 1 ? '' : 'es'}!`
            : "I couldn't guess today's entity.",
          `Play Clashdle at ${SHARE_URL}`,
        ].join('\n')
      : null

  const handleCopyShare = async () => {
    if (!shareText) return
    try {
      await navigator.clipboard.writeText(shareText)
      setCopiedShare(true)
      window.setTimeout(() => setCopiedShare(false), 1800)
    } catch (err) {
      console.error('Failed to copy share text:', err)
    }
  }

  return (
    <div className="stats-panel-backdrop" onClick={onClose}>
      <div
        className={`stats-panel-frame${showScrollHint ? '' : ' stats-panel-frame--scroll-end'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="stats-panel" ref={panelRef}>
          <div className="stats-panel-header">
            <h2>{title}</h2>
            <button className="stats-panel-close" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
          {guessCount !== undefined && (
            <p className="stats-panel-win-message">
              You guessed the card correctly in {guessCount} guess{guessCount === 1 ? '' : 'es'}!
            </p>
          )}
          {lossAnswer !== undefined && (
            <p className="stats-panel-loss-message">
              Out of guesses! The card was <strong>{lossAnswer}</strong>.
            </p>
          )}

          <div className="stats-panel-summary">
            <div className="stats-panel-summary-stat">
              <span className="stats-panel-summary-value">{gamesPlayed}</span>
              <span className="stats-panel-summary-label">Games Played</span>
            </div>
            <div className="stats-panel-summary-stat">
              <span className="stats-panel-summary-value">{winRate === null ? '—' : `${winRate}%`}</span>
              <span className="stats-panel-summary-label">Win Rate</span>
            </div>
          </div>

          <div className="stats-panel-chart">
            {bars.map(({ guesses, count }) => (
              <div className="stats-panel-bar-col" key={guesses}>
                <div className="stats-panel-bar-track">
                  <div className="stats-panel-bar" style={{ height: `${(count / maxCount) * 100}%` }} title={`${count}`}>
                    <span className="stats-panel-bar-count">{count}</span>
                  </div>
                </div>
                <span className="stats-panel-bar-label">{guesses}</span>
              </div>
            ))}
          </div>
          <p className="stats-panel-chart-title">Guess Histogram</p>

          {shareText && shareRows && (
            <div className="stats-panel-share">
              <h3 className="stats-panel-share-title">Share Results</h3>
              <div className="stats-panel-share-preview" aria-label="Daily result preview">
                {shareRows.map((row, index) => (
                  <span className="stats-panel-share-row" key={`${row}-${index}`}>
                    {row}
                  </span>
                ))}
              </div>
              <p className="stats-panel-share-message">
                {guessCount !== undefined
                  ? `I guessed today's entity in ${guessCount} guess${guessCount === 1 ? '' : 'es'}!`
                  : "I couldn't guess today's entity."}
              </p>
              <button className="stats-panel-action stats-panel-share-button" onClick={handleCopyShare}>
                {copiedShare ? 'Copied!' : 'Copy Results'}
              </button>
            </div>
          )}

          {showUnlimitedCta && (
            <Link className="stats-panel-action" to="/unlimited">
              {loggedIn ? 'Play Unlimited' : 'Log in to play Unlimited'}
            </Link>
          )}
          {onPlayAgain && (
            <button className="stats-panel-action" onClick={onPlayAgain} disabled={playAgainDisabled}>
              {playAgainDisabled ? 'Starting…' : 'Play Again'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default StatsPanel

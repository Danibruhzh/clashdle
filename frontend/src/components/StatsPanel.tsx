import { getHistogram, getLossCount } from '../utils/guessHistogram'
import './StatsPanel.css'

// Mirrors backend/app/services/game.py's MAX_GUESSES (see also App.tsx's own
// copy of this constant). The histogram is keyed by raw guess count, and a
// handful of localStorage entries predate the guess cap entirely — someone
// who played before it existed can have a stray {15: 1} in there. Clamping
// the chart to 1..MAX_GUESSES hides those now-impossible entries instead of
// stretching the chart to fit them.
const MAX_GUESSES = 8

interface StatsPanelProps {
  onClose: () => void
  // Set whenever today's game is already won — shows the win message above
  // the histogram, whether the panel just auto-opened from that win or was
  // reopened manually afterward.
  guessCount?: number
  // Set whenever today's game is already lost (all 8 guesses used, none
  // correct) — holds the revealed card name, shown instead of the win
  // message. Mutually exclusive with guessCount.
  lossAnswer?: string
}

function StatsPanel({ onClose, guessCount, lossAnswer }: StatsPanelProps) {
  const histogram = getHistogram()
  const lossCount = getLossCount()

  const bars = Array.from({ length: MAX_GUESSES }, (_, i) => {
    const guesses = i + 1
    return { guesses, count: histogram[guesses] ?? 0 }
  })

  const totalWins = bars.reduce((sum, b) => sum + b.count, 0)
  const gamesPlayed = totalWins + lossCount
  const winRate = gamesPlayed === 0 ? null : Math.round((totalWins / gamesPlayed) * 100)
  const maxCount = Math.max(1, ...bars.map((b) => b.count))

  return (
    <div className="stats-panel-backdrop" onClick={onClose}>
      <div className="stats-panel" onClick={(e) => e.stopPropagation()}>
        <div className="stats-panel-header">
          <h2>Your Stats</h2>
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
            Out of guesses! Today's card was <strong>{lossAnswer}</strong>.
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
              <span className="stats-panel-bar-count">{count}</span>
              <div className="stats-panel-bar-track">
                <div className="stats-panel-bar" style={{ height: `${(count / maxCount) * 100}%` }} />
              </div>
              <span className="stats-panel-bar-label">{guesses}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default StatsPanel

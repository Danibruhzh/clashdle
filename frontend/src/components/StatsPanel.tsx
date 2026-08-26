import { getHistogram } from '../utils/guessHistogram'
import './StatsPanel.css'

interface StatsPanelProps {
  onClose: () => void
  // Set whenever today's game is already won — shows the win message above
  // the histogram, whether the panel just auto-opened from that win or was
  // reopened manually afterward.
  guessCount?: number
}

function StatsPanel({ onClose, guessCount }: StatsPanelProps) {
  const histogram = getHistogram()
  const entries = Object.entries(histogram)
    .map(([guesses, count]) => ({ guesses: Number(guesses), count }))
    .sort((a, b) => a.guesses - b.guesses)

  const totalGames = entries.reduce((sum, e) => sum + e.count, 0)
  const maxCount = Math.max(1, ...entries.map((e) => e.count))

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
        {entries.length === 0 ? (
          <p className="stats-panel-empty">No completed games yet — win your first one to start your stats!</p>
        ) : (
          <>
            <p className="stats-panel-total">
              {totalGames} game{totalGames === 1 ? '' : 's'} completed
            </p>
            <div className="stats-panel-rows">
              {entries.map(({ guesses, count }) => (
                <div className="stats-panel-row" key={guesses}>
                  <span className="stats-panel-label">{guesses}</span>
                  <div className="stats-panel-bar-track">
                    <div className="stats-panel-bar" style={{ width: `${(count / maxCount) * 100}%` }} />
                  </div>
                  <span className="stats-panel-count">{count}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default StatsPanel

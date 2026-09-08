import { getStreak, getBestStreak } from '../utils/streak'
import './StreakModal.css'

interface StreakModalProps {
  onClose: () => void
}

function StreakModal({ onClose }: StreakModalProps) {
  const streak = getStreak()
  const best = getBestStreak()

  return (
    <div className="streak-modal-backdrop" onClick={onClose}>
      <div className="streak-modal" onClick={(e) => e.stopPropagation()}>
        <div className="streak-modal-header">
          <h2>Your Streak</h2>
          <button className="streak-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="streak-modal-summary">
          <div className="streak-modal-stat">
            <span className="streak-modal-value">{streak}</span>
            <span className="streak-modal-label">Current Streak</span>
          </div>
          <div className="streak-modal-stat">
            {/* Same number as Current whenever the player's ongoing streak
                is also their all-time high — not a special case, just what
                getBestStreak() naturally returns once it's been kept in
                sync with every win (see recordStreakWin in utils/streak.ts). */}
            <span className="streak-modal-value">{best}</span>
            <span className="streak-modal-label">Best Streak</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StreakModal

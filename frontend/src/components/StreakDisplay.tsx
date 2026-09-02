import streakIcon from '../images/streak icon.png'
import './StreakDisplay.css'

interface StreakDisplayProps {
  streak: number
}

function StreakDisplay({ streak }: StreakDisplayProps) {
  // Colored once there's a win to show off (1+ day running) — only a bare
  // 0 (no win yet, or the streak lapsed) renders as a plain black
  // silhouette via the --inactive class.
  const isActive = streak >= 1

  return (
    <div
      className={`streak-display ${isActive ? 'streak-display--active' : 'streak-display--inactive'}`}
      aria-label={`${streak} day streak`}
    >
      <img className="streak-display-icon" src={streakIcon} alt="" />
      <span className="streak-display-count">{streak}</span>
      <span className="streak-display-tooltip">Daily Win Streak ({streak})</span>
    </div>
  )
}

export default StreakDisplay

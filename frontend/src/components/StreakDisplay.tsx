import streakIcon from '../images/streak icon.png'
import './StreakDisplay.css'

interface StreakDisplayProps {
  streak: number
  onOpen: () => void
  // UnlimitedPage passes 'Unlimited Win Streak' here — defaults to the
  // home page's original wording so that usage stays unchanged.
  label?: string
}

function StreakDisplay({ streak, onOpen, label = 'Daily Win Streak' }: StreakDisplayProps) {
  // Colored once there's a win to show off (1+ day running) — only a bare
  // 0 (no win yet, or the streak lapsed) renders as a plain black
  // silhouette via the --inactive class.
  const isActive = streak >= 1

  return (
    <button
      className={`streak-display ${isActive ? 'streak-display--active' : 'streak-display--inactive'}`}
      onClick={onOpen}
      aria-label="Streak"
    >
      <img className="streak-display-icon" src={streakIcon} alt="" />
      <span className="streak-display-count">{streak}</span>
      <span className="streak-display-tooltip">{label} ({streak})</span>
    </button>
  )
}

export default StreakDisplay

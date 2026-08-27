import statsIcon from '../images/stats-icon.png'
import './StatsButton.css'

interface StatsButtonProps {
  onOpen: () => void
}

function StatsButton({ onOpen }: StatsButtonProps) {
  return (
    <button className="stats-button" onClick={onOpen} aria-label="Stats">
      <img className="stats-button-icon" src={statsIcon} alt="" />
      <span className="stats-button-tooltip">Stats</span>
    </button>
  )
}

export default StatsButton

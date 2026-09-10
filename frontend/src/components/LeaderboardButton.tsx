import leaderboardIcon from '../images/leaderboard icon.png'
import './LeaderboardButton.css'

interface LeaderboardButtonProps {
  onOpen: () => void
}

function LeaderboardButton({ onOpen }: LeaderboardButtonProps) {
  return (
    <button className="leaderboard-button" onClick={onOpen} aria-label="Leaderboard">
      <img className="leaderboard-button-icon" src={leaderboardIcon} alt="" />
      <span className="leaderboard-button-tooltip">Leaderboard</span>
    </button>
  )
}

export default LeaderboardButton

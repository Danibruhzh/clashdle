import howToPlayIcon from '../images/how to play icon.png'
import './HowToPlayButton.css'

interface HowToPlayButtonProps {
  onOpen: () => void
}

function HowToPlayButton({ onOpen }: HowToPlayButtonProps) {
  return (
    <button className="how-to-play-button" onClick={onOpen} aria-label="How to Play">
      <img className="how-to-play-button-icon" src={howToPlayIcon} alt="" />
      <span className="how-to-play-button-tooltip">How to Play</span>
    </button>
  )
}

export default HowToPlayButton

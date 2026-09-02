import './HowToPlayButton.css'

interface HowToPlayButtonProps {
  onOpen: () => void
}

function HowToPlayButton({ onOpen }: HowToPlayButtonProps) {
  return (
    <button className="how-to-play-button" onClick={onOpen} aria-label="How to Play">
      <span className="how-to-play-button-glyph">?</span>
      <span className="how-to-play-button-tooltip">How to Play</span>
    </button>
  )
}

export default HowToPlayButton

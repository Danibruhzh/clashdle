import cardsIcon from '../images/cards-icon.png'
import './CardBrowserButton.css'

interface CardBrowserButtonProps {
  onOpen: () => void
  // Shown from the 4th unsuccessful live guess onward, until the player
  // opens Card Browser — see App.tsx's needHelpHint state for the full rule
  // (including why a page reload doesn't bring it back on its own).
  showNeedHelpHint?: boolean
}

function CardBrowserButton({ onOpen, showNeedHelpHint = false }: CardBrowserButtonProps) {
  return (
    <button
      className={`card-browser-button${showNeedHelpHint ? ' card-browser-button--glow' : ''}`}
      onClick={onOpen}
      aria-label="All Cards"
    >
      <img className="card-browser-button-icon" src={cardsIcon} alt="" />
      <span className="card-browser-button-tooltip">All Cards</span>
      {showNeedHelpHint && (
        <div className="card-browser-need-help" aria-hidden="true">
          <span className="card-browser-need-help-arrow" />
          <span className="card-browser-need-help-text">Need help?</span>
        </div>
      )}
    </button>
  )
}

export default CardBrowserButton

import cardsIcon from '../images/cards-icon.png'
import './CardBrowserButton.css'

interface CardBrowserButtonProps {
  onOpen: () => void
}

function CardBrowserButton({ onOpen }: CardBrowserButtonProps) {
  return (
    <button className="card-browser-button" onClick={onOpen} aria-label="All Cards">
      <img className="card-browser-button-icon" src={cardsIcon} alt="" />
      <span className="card-browser-button-tooltip">All Cards</span>
    </button>
  )
}

export default CardBrowserButton

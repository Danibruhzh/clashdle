import './CardBrowserButton.css'

interface CardBrowserButtonProps {
  onOpen: () => void
}

function CardBrowserButton({ onOpen }: CardBrowserButtonProps) {
  return (
    <button className="card-browser-button" onClick={onOpen}>
      All Cards
    </button>
  )
}

export default CardBrowserButton

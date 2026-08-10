import { cardNames } from '../data/cards'
import { getCardImagePath } from '../utils/cardImage'
import './CardBrowser.css'

interface CardBrowserProps {
  onClose: () => void
}

function CardBrowser({ onClose }: CardBrowserProps) {
  return (
    <div className="card-browser-backdrop" onClick={onClose}>
      <div className="card-browser-panel" onClick={(e) => e.stopPropagation()}>
        <div className="card-browser-header">
          <h2>All Cards ({cardNames.length})</h2>
          <button className="card-browser-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="card-browser-grid">
          {cardNames.map((name) => (
            <div className="card-browser-item" key={name}>
              <img className="card-browser-image" src={getCardImagePath(name)} alt={name}/>
              <span className="card-browser-name">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default CardBrowser

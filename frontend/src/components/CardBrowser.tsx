import { useState } from 'react'
import { cardNames } from '../data/cards'
import { getCardImagePath } from '../utils/cardImage'
import './CardBrowser.css'

interface CardBrowserProps {
  onClose: () => void
}

function displayName(name: string): string {
  return name.replace('Evolution', 'Evo')
}

function CardBrowser({ onClose }: CardBrowserProps) {
  // Only affects touch devices (hover: none) — see CardBrowser.css. Tapping
  // the same card again clears it; tapping a different card switches to it,
  // so at most one name is pinned open at a time.
  const [tappedCard, setTappedCard] = useState<string | null>(null)

  const handleCardTap = (name: string) => {
    setTappedCard((prev) => (prev === name ? null : name))
  }

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
            <div
              className={`card-browser-item${tappedCard === name ? ' card-browser-item--tapped' : ''}`}
              key={name}
              onClick={() => handleCardTap(name)}
            >
              <img className="card-browser-image" src={getCardImagePath(name)} alt={name}/>
              <div className="card-browser-image-dim" />
              <div className="card-browser-name-overlay">
                {displayName(name)
                  .split(' ')
                  .map((word, i) => (
                    <span className="card-browser-name-word" key={i}>
                      {word}
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default CardBrowser

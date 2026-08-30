import { useMemo, useState } from 'react'
import { cardNames } from '../data/cards'
import { getCardImagePath } from '../utils/cardImage'
import { SORT_OPTIONS, sortCardNames } from '../utils/cardSort'
import type { SortOption } from '../utils/cardSort'
import { playSound } from '../utils/sound'
import './CardBrowser.css'

interface CardBrowserProps {
  onClose: () => void
}

function displayName(name: string): string {
  return name.replace('Evolution', 'Evo')
}

// Same hover-capability check CardBrowser.css already splits behavior on
// (computers have cursors, phones don't) — used here to decide whether a
// card's sound plays on mouse-enter (desktop) or on tap (touch), not both,
// so a desktop click right after a hover doesn't double it up.
function isHoverCapable(): boolean {
  return window.matchMedia('(hover: hover)').matches
}

function playCardSound() {
  playSound('/grabcard.mp3')
}

function CardBrowser({ onClose }: CardBrowserProps) {
  // Only affects touch devices (hover: none) — see CardBrowser.css. Tapping
  // the same card again clears it; tapping a different card switches to it,
  // so at most one name is pinned open at a time.
  const [tappedCard, setTappedCard] = useState<string | null>(null)
  const [sortOption, setSortOption] = useState<SortOption>('name-asc')

  const handleCardTap = (name: string) => {
    // Touch devices have no hover to play the sound on, so the tap itself
    // does it instead. Desktop already gets it from onMouseEnter below —
    // skip it here so a click right after a hover doesn't play it twice.
    if (!isHoverCapable()) playCardSound()
    setTappedCard((prev) => (prev === name ? null : name))
  }

  const sortedNames = useMemo(() => sortCardNames(cardNames, sortOption), [sortOption])

  return (
    <div className="card-browser-backdrop" onClick={onClose}>
      <div className="card-browser-panel" onClick={(e) => e.stopPropagation()}>
        <div className="card-browser-header">
          <h2>All Cards ({cardNames.length})</h2>
          <button className="card-browser-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="card-browser-controls">
          <select
            className="card-browser-sort"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            aria-label="Sort cards by"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="card-browser-grid">
          {sortedNames.map((name) => (
            <div
              className={`card-browser-item${tappedCard === name ? ' card-browser-item--tapped' : ''}`}
              key={name}
              onClick={() => handleCardTap(name)}
              onMouseEnter={() => {
                if (isHoverCapable()) playCardSound()
              }}
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

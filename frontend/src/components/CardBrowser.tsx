import { useMemo, useState } from 'react'
import { cardNames } from '../data/cards'
import { getCardImagePath } from '../utils/cardImage'
import { SORT_FIELDS, sortCardNames } from '../utils/cardSort'
import type { SortDirection, SortField } from '../utils/cardSort'
import { CATEGORY_DIMENSIONS, categorizeCards } from '../utils/cardCategories'
import type { CategoryDimension } from '../utils/cardCategories'
import { playSound } from '../utils/sound'
import { getEasyMode, setEasyMode as persistEasyMode } from '../utils/easyMode'
import { getCardBrowserSession, updateCardBrowserSession } from '../utils/cardBrowserSession'
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
  // Seeded from the in-memory session (see cardBrowserSession.ts) rather than
  // a fixed default — so reopening the browser within the same page load
  // picks up wherever these were left, but a real reload still starts fresh.
  const [sortField, setSortFieldState] = useState<SortField>(() => getCardBrowserSession().sortField)
  const [sortDirection, setSortDirectionState] = useState<SortDirection>(
    () => getCardBrowserSession().sortDirection
  )
  const [easyMode, setEasyModeState] = useState(() => getEasyMode())
  const [categoryDimension, setCategoryDimensionState] = useState<CategoryDimension>(
    () => getCardBrowserSession().categoryDimension
  )

  const handleEasyModeChange = (value: boolean) => {
    setEasyModeState(value)
    persistEasyMode(value)
  }

  const handleCategoryDimensionChange = (value: CategoryDimension) => {
    setCategoryDimensionState(value)
    updateCardBrowserSession({ categoryDimension: value })
  }

  const handleSortFieldChange = (value: SortField) => {
    setSortFieldState(value)
    updateCardBrowserSession({ sortField: value })
  }

  const handleSortDirectionChange = (value: SortDirection) => {
    setSortDirectionState(value)
    updateCardBrowserSession({ sortDirection: value })
  }

  const handleCardTap = (name: string) => {
    // Touch devices have no hover to play the sound on, so the tap itself
    // does it instead. Desktop already gets it from onMouseEnter below —
    // skip it here so a click right after a hover doesn't play it twice.
    if (!isHoverCapable()) playCardSound()
    setTappedCard((prev) => (prev === name ? null : name))
  }

  // Sort field/direction only matter in Easy Mode now — with it off there's
  // no grouping to sort within, so the flat list is just fixed alphabetical.
  const sortedNames = useMemo(() => sortCardNames(cardNames, 'name', 'asc'), [])

  // Easy Mode: same card list, split into visually separate categories along
  // one dimension (Elixir Cost/Type/Rarity/Target) — every card still lands
  // in exactly one category. The chosen sort applies *within* each category
  // rather than across the whole list. Sorting a category by the same stat
  // it's grouped by (e.g. an Elixir Cost sort inside Elixir Cost grouping)
  // isn't a special case — every card in that bucket already shares the same
  // value, so sortCardNames's alphabetical tie-break naturally takes over.
  const categories = useMemo(
    () =>
      easyMode
        ? categorizeCards(cardNames, categoryDimension).map((category) => ({
            ...category,
            names: sortCardNames(category.names, sortField, sortDirection),
          }))
        : [],
    [easyMode, categoryDimension, sortField, sortDirection]
  )

  const renderCardItem = (name: string) => (
    <div
      className={`card-browser-item${tappedCard === name ? ' card-browser-item--tapped' : ''}`}
      key={name}
      onClick={() => handleCardTap(name)}
      onMouseEnter={() => {
        if (isHoverCapable()) playCardSound()
      }}
    >
      <img className="card-browser-image" src={getCardImagePath(name)} alt={name} />
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
  )

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
          <label className="card-browser-easy-mode">
            Easy Mode
            <span className="card-browser-toggle">
              <input
                type="checkbox"
                checked={easyMode}
                onChange={(e) => handleEasyModeChange(e.target.checked)}
              />
              <span className="card-browser-toggle-track" />
            </span>
          </label>
          {easyMode && (
            <div className="card-browser-dropdowns">
              <select
                className="card-browser-sort"
                value={categoryDimension}
                onChange={(e) => handleCategoryDimensionChange(e.target.value as CategoryDimension)}
                aria-label="Group cards by"
              >
                {CATEGORY_DIMENSIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                className="card-browser-sort"
                value={sortField}
                onChange={(e) => handleSortFieldChange(e.target.value as SortField)}
                aria-label="Sort cards by"
              >
                {SORT_FIELDS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="card-browser-sort-direction"
                onClick={() => handleSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')}
                aria-label={sortDirection === 'asc' ? 'Ascending — click for descending' : 'Descending — click for ascending'}
              >
                {sortDirection === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          )}
        </div>
        {easyMode ? (
          categories.map((category) => (
            <div className="card-browser-category" key={category.label}>
              <h3 className="card-browser-category-title">{category.label}</h3>
              <div className="card-browser-grid">{category.names.map(renderCardItem)}</div>
            </div>
          ))
        ) : (
          <div className="card-browser-grid">{sortedNames.map(renderCardItem)}</div>
        )}
      </div>
    </div>
  )
}

export default CardBrowser

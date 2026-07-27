import { useState } from 'react'
import allCards from '../data/all_cards.json'
import './SearchBar.css'

const cardNames = Object.keys(allCards)

function SearchBar() {
  const [query, setQuery] = useState('')
  const [showMatches, setShowMatches] = useState(false)

  const matches =
    query.trim().length === 0
      ? []
      : cardNames.filter((name) =>
          name
            .toLowerCase()
            .split(' ')
            .some((word) => word.startsWith(query.toLowerCase()))
        )

  return (
    <div className="search-bar-container">
      <input
        className="search-bar"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setShowMatches(true)}
        onBlur={() => setShowMatches(false)}
        placeholder="Guess a card..."
      />
      {showMatches && matches.length > 0 && (
        <ul className="search-bar-matches">
          {matches.map((name) => (
            <li
              key={name}
              onMouseDown={() => setQuery(name)}
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default SearchBar

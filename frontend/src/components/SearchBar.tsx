import { useState } from 'react'
import allCards from '../data/all_cards.json'
import './SearchBar.css'

const cardNames = Object.keys(allCards)
const cardNameByLower = new Map(cardNames.map((name) => [name.toLowerCase(), name]))

interface SearchBarProps {
  onSelectCard: (cardName: string) => void
}

function SearchBar({ onSelectCard }: SearchBarProps) {
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

  const handleChange = (value: string) => {
    setQuery(value)
    const match = cardNameByLower.get(value.trim().toLowerCase())
    if (match) {
      onSelectCard(match)
    }
  }

  const handleSelect = (name: string) => {
    setQuery(name)
    onSelectCard(name)
  }

  return (
    <div className="search-bar-container">
      <input
        className="search-bar"
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setShowMatches(true)}
        onBlur={() => setShowMatches(false)}
        placeholder="Guess a card..."
      />
      {showMatches && matches.length > 0 && (
        <ul className="search-bar-matches">
          {matches.map((name) => (
            <li
              key={name}
              onMouseDown={() => handleSelect(name)}
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

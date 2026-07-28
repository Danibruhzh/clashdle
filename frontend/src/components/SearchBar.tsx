import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { cardNames } from '../data/cards'
import './SearchBar.css'

function normalize(value: string): string {
  return value.toLowerCase().replace(/[.-]/g, '')
}

const cardNameByLower = new Map(cardNames.map((name) => [normalize(name), name]))

function matchesQuery(name: string, query: string): boolean {
  const nameWords = normalize(name).split(' ')
  const queryWords = normalize(query.trim()).split(/\s+/)

  for (let i = 0; i <= nameWords.length - queryWords.length; i++) {
    const isMatchAt = queryWords.every((queryWord, j) =>
      nameWords[i + j].startsWith(queryWord)
    )
    if (isMatchAt) return true
  }
  return false
}

interface SearchBarProps {
  onSelectCard: (cardName: string) => void
  guessedNames: Set<string>
  disabled?: boolean
}

function SearchBar({ onSelectCard, guessedNames, disabled = false }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [showMatches, setShowMatches] = useState(false)

  const matches =
    disabled || query.trim().length === 0
      ? []
      : cardNames.filter((name) => !guessedNames.has(name) && matchesQuery(name, query))

  const handleSelect = (name: string) => {
    setQuery(name)
    onSelectCard(name)
    setQuery('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled || e.key !== 'Enter') return
    const match = cardNameByLower.get(normalize(query.trim()))
    if (match && !guessedNames.has(match)) {
      handleSelect(match)
    }
  }

  return (
    <div className="search-bar-container">
      <input
        className="search-bar"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setShowMatches(true)}
        onBlur={() => setShowMatches(false)}
        disabled={disabled}
        placeholder={disabled ? 'You win! Press reset to play again.' : 'Guess a card...'}
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

import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { cardNames } from '../data/cards'
import { getCardImagePath } from '../utils/cardImage'
import { playSound } from '../utils/sound'
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
  // Blocks submitting a new guess (e.g. one is already in flight) without
  // disabling the <input> itself — a disabled input loses DOM focus, and the
  // browser doesn't hand focus back once it's re-enabled, which is what used
  // to force a re-click after every guess. Typing stays live the whole time;
  // this just ignores Enter/selection until it clears.
  disabled?: boolean
  // Genuinely can't be used yet (initial restore of today's past guesses) —
  // this one does disable the input, since nothing's been typed yet anyway.
  loading?: boolean
}

function SearchBar({ onSelectCard, guessedNames, disabled = false, loading = false }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [showMatches, setShowMatches] = useState(false)

  const blocked = loading || disabled

  const matches =
    blocked || query.trim().length === 0
      ? []
      : cardNames.filter((name) => !guessedNames.has(name) && matchesQuery(name, query))

  const handleSelect = (name: string) => {
    setQuery(name)
    onSelectCard(name)
    setQuery('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (blocked || e.key !== 'Enter') return
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
        disabled={loading}
        placeholder={loading ? 'Loading...' : 'Guess a card...'}
      />
      {showMatches && matches.length > 0 && (
        <ul className="search-bar-matches">
          {matches.map((name) => (
            <li
              key={name}
              // preventDefault stops the browser's default mousedown
              // behavior of shifting focus off the input (to this
              // non-focusable li, effectively nowhere) before the click
              // even registers — without it the input blurs the instant you
              // click a suggestion, forcing a re-click to keep typing.
              onMouseDown={(e) => {
                e.preventDefault()
                handleSelect(name)
              }}
              onMouseEnter={() => playSound('/grabcard.mp3')}
            >
              <img className="search-bar-match-image" src={getCardImagePath(name)} alt="" />
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default SearchBar

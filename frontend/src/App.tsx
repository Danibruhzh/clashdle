import { useState, useRef } from 'react'
import Background from './components/Background'
import SearchBar from './components/SearchBar'
import CardDisplay from './components/CardDisplay'
import StatsHeader from './components/StatsHeader'
import ResetButton from './components/ResetButton'
import WinPopup from './components/WinPopup'
import CardBrowserButton from './components/CardBrowserButton'
import CardBrowser from './components/CardBrowser'
import { submitGuess } from './api/game'
import type { GuessResult } from './api/game'
import './App.css'

interface Guess {
  id: number
  cardName: string
  result: GuessResult
}

function App() {
  const [guesses, setGuesses] = useState<Guess[]>([])
  const [resetCount, setResetCount] = useState(0)
  const [showCardBrowser, setShowCardBrowser] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const nextId = useRef(0)

  const handleSelectCard = async (cardName: string) => {
    setIsSubmitting(true)
    try {
      const result = await submitGuess(cardName)
      setGuesses((prev) => [{ id: nextId.current++, cardName, result }, ...prev])
    } catch (err) {
      console.error('Guess failed:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setGuesses([])
    setResetCount((prev) => prev + 1)
  }

  const guessedNames = new Set(guesses.map((guess) => guess.cardName))
  const hasWon = guesses.some((guess) => guess.result.is_correct)

  return (
    <>
      <Background />
      <ResetButton onReset={handleReset} />
      <CardBrowserButton onOpen={() => setShowCardBrowser(true)} />
      {showCardBrowser && <CardBrowser onClose={() => setShowCardBrowser(false)} />}
      {hasWon && <WinPopup guessCount={guesses.length} />}
      <div className="app-content">
        <h1 className="app-title">Clashdle</h1>
        <SearchBar
          key={resetCount}
          onSelectCard={handleSelectCard}
          guessedNames={guessedNames}
          disabled={hasWon || isSubmitting}
        />
        <div className="guesses-scroll">
          <StatsHeader />
          {guesses.map((guess) => (
            <CardDisplay key={guess.id} cardName={guess.cardName} comparisons={guess.result.comparisons} />
          ))}
        </div>
      </div>
    </>
  )
}

export default App

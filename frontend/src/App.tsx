import { useState, useRef, useEffect } from 'react'
import Background from './components/Background'
import SearchBar from './components/SearchBar'
import CardDisplay from './components/CardDisplay'
import StatsHeader from './components/StatsHeader'
import ResetButton from './components/ResetButton'
import WinPopup from './components/WinPopup'
import CardBrowserButton from './components/CardBrowserButton'
import CardBrowser from './components/CardBrowser'
import StatsButton from './components/StatsButton'
import StatsPanel from './components/StatsPanel'
import { submitGuess, fetchTodayGuesses, resetTodayGuesses } from './api/game'
import type { GuessResult } from './api/game'
import { recordWin } from './utils/guessHistogram'
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
  const [showStats, setShowStats] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRestoring, setIsRestoring] = useState(true)
  const nextId = useRef(0)

  // Refresh-proof guesses: on load, replay whatever this browser already
  // guessed today (tracked server-side via the guest-session cookie) before
  // letting new guesses in, so a guess made mid-restore can't land ahead of
  // guesses that were actually made earlier.
  useEffect(() => {
    let cancelled = false

    fetchTodayGuesses()
      .then(({ guesses: past }) => {
        if (cancelled) return
        // backend returns oldest-first; the UI prepends newest-first
        const restored = past
          .map((g) => ({
            id: nextId.current++,
            cardName: g.card_name,
            result: { comparisons: g.comparisons, is_correct: g.is_correct },
          }))
          .reverse()
        setGuesses(restored)
      })
      .catch((err) => console.error('Failed to restore past guesses:', err))
      .finally(() => {
        if (!cancelled) setIsRestoring(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleSelectCard = async (cardName: string) => {
    setIsSubmitting(true)
    try {
      const result = await submitGuess(cardName)
      // Read before the state update so this reflects "guesses so far,
      // including this one" — not affected by React 18 Strict Mode
      // double-invoking a setState updater, since this runs once as a
      // plain side effect rather than inside setGuesses itself.
      const newGuessCount = guesses.length + 1
      setGuesses((prev) => [{ id: nextId.current++, cardName, result }, ...prev])
      if (result.is_correct) {
        recordWin(newGuessCount)
      }
    } catch (err) {
      console.error('Guess failed:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = async () => {
    // Dev-only for now — previews what the automatic midnight reset will
    // eventually do for every player. Clears server-side so a refresh
    // doesn't bring today's cleared guesses back (see routers/game.py's
    // reset_today).
    try {
      await resetTodayGuesses()
    } catch (err) {
      console.error('Failed to reset today\'s guesses:', err)
    }
    setGuesses([])
    setResetCount((prev) => prev + 1)
  }

  const guessedNames = new Set(guesses.map((guess) => guess.cardName))
  const hasWon = guesses.some((guess) => guess.result.is_correct)

  return (
    <>
      <Background />
      {showCardBrowser && <CardBrowser onClose={() => setShowCardBrowser(false)} />}
      {showStats && <StatsPanel onClose={() => setShowStats(false)} />}
      {hasWon && <WinPopup guessCount={guesses.length} />}
      <div className="app-content">
        <div className="app-toolbar">
          <div className="app-toolbar-group">
            <CardBrowserButton onOpen={() => setShowCardBrowser(true)} />
            <StatsButton onOpen={() => setShowStats(true)} />
          </div>
          <ResetButton onReset={handleReset} />
        </div>
        <h1 className="app-title">Clashdle</h1>
        {!hasWon && (
          <SearchBar
            key={resetCount}
            onSelectCard={handleSelectCard}
            guessedNames={guessedNames}
            disabled={isSubmitting || isRestoring}
          />
        )}
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

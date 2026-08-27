import { useState, useRef, useEffect } from 'react'
import Background from './components/Background'
import SearchBar from './components/SearchBar'
import CardDisplay from './components/CardDisplay'
import StatsHeader from './components/StatsHeader'
import CardBrowserButton from './components/CardBrowserButton'
import CardBrowser from './components/CardBrowser'
import StatsButton from './components/StatsButton'
import StatsPanel from './components/StatsPanel'
import PreviousAnswerFooter from './components/PreviousAnswerFooter'
import TodayWinnersCount from './components/TodayWinnersCount'
import { submitGuess, fetchTodayGuesses, fetchPreviousAnswer, fetchTodayWinners } from './api/game'
import type { GuessResult } from './api/game'
import { recordWin } from './utils/guessHistogram'
import './App.css'

// Matches CardDisplay.css's flip-in animation: 9 cells (name + 8 stats),
// each delayed (index * 0.2s) after the row mounts, animation itself takes
// 0.2s — so the last cell finishes at 8 * 0.2s + 0.2s. Opening the stats
// panel before then would visibly cut the winning row's flip animation off.
const FLIP_ANIMATION_TOTAL_MS = 1800

interface Guess {
  id: number
  cardName: string
  result: GuessResult
}

function App() {
  const [guesses, setGuesses] = useState<Guess[]>([])
  const [showCardBrowser, setShowCardBrowser] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRestoring, setIsRestoring] = useState(true)
  const [previousAnswer, setPreviousAnswer] = useState<string | null>(null)
  const [winnersCount, setWinnersCount] = useState<number | null>(null)
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

  useEffect(() => {
    fetchPreviousAnswer()
      .then(({ card_name }) => setPreviousAnswer(card_name))
      .catch((err) => console.error('Failed to load previous answer:', err))
  }, [])

  useEffect(() => {
    fetchTodayWinners()
      .then(({ winners_count }) => setWinnersCount(winners_count))
      .catch((err) => console.error('Failed to load today\'s winners count:', err))
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
        // Let the winning row's flip animation finish before the stats
        // panel covers it, instead of cutting it off mid-flip.
        window.setTimeout(() => setShowStats(true), FLIP_ANIMATION_TOTAL_MS)
        // Optimistic — this browser's own win just happened server-side, no
        // need to round-trip and refetch the count for it to show up.
        setWinnersCount((prev) => (prev === null ? prev : prev + 1))
      }
    } catch (err) {
      console.error('Guess failed:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const guessedNames = new Set(guesses.map((guess) => guess.cardName))
  const hasWon = guesses.some((guess) => guess.result.is_correct)

  return (
    <>
      <Background />
      {showCardBrowser && <CardBrowser onClose={() => setShowCardBrowser(false)} />}
      {showStats && <StatsPanel onClose={() => setShowStats(false)} guessCount={hasWon ? guesses.length : undefined} />}
      <div className="app-content">
        <div className="app-toolbar">
          <div className="app-toolbar-group">
            <CardBrowserButton onOpen={() => setShowCardBrowser(true)} />
            <StatsButton onOpen={() => setShowStats(true)} />
          </div>
        </div>
        <h1 className="app-title">Clashdle</h1>
        {!hasWon && (
          <SearchBar
            onSelectCard={handleSelectCard}
            guessedNames={guessedNames}
            disabled={isSubmitting}
            loading={isRestoring}
          />
        )}
        <TodayWinnersCount count={winnersCount} />
        <div className="guesses-scroll">
          <StatsHeader />
          {guesses.map((guess) => (
            <CardDisplay key={guess.id} cardName={guess.cardName} comparisons={guess.result.comparisons} />
          ))}
        </div>
        <PreviousAnswerFooter cardName={previousAnswer} />
      </div>
    </>
  )
}

export default App

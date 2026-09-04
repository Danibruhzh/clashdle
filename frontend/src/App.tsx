import { useState, useRef, useEffect } from 'react'
import Background from './components/Background'
import SearchBar from './components/SearchBar'
import CardDisplay from './components/CardDisplay'
import StatsHeader from './components/StatsHeader'
import CardBrowserButton from './components/CardBrowserButton'
import CardBrowser from './components/CardBrowser'
import StatsButton from './components/StatsButton'
import StatsPanel from './components/StatsPanel'
import HowToPlayButton from './components/HowToPlayButton'
import HowToPlayModal from './components/HowToPlayModal'
import StreakDisplay from './components/StreakDisplay'
import PreviousAnswerFooter from './components/PreviousAnswerFooter'
import TodayWinnersCount from './components/TodayWinnersCount'
import { submitGuess, fetchTodayGuesses, fetchPreviousAnswer, fetchTodayWinners } from './api/game'
import type { GuessResult } from './api/game'
import { recordWin, recordLoss, hasEverWon } from './utils/guessHistogram'
import { getStreak, recordStreakWin } from './utils/streak'
import { playSound, preloadSounds } from './utils/sound'
import './App.css'

// Matches CardDisplay.css's flip-in animation: 9 cells (name + 8 stats),
// each delayed (index * 0.2s) after the row mounts, animation itself takes
// 0.2s — so the last cell finishes at 8 * 0.2s + 0.2s. Opening the stats
// panel before then would visibly cut the winning row's flip animation off.
const FLIP_ANIMATION_TOTAL_MS = 1800

// Hidden for now — numbers are still low enough that showing them undersells
// the game. Flip back to true once there's a healthier player count. Fetch
// still runs underneath so the count stays accurate whenever this flips.
const SHOW_WINNERS_COUNT = false

// Mirrors backend/app/services/game.py's MAX_GUESSES — kept in sync manually
// since the frontend needs it before the first guess ever round-trips (to
// know when to stop rendering the search bar).
const MAX_GUESSES = 8

// The "Need help?" nudge (see needHelpHint below) shows starting from this
// many unsuccessful guesses.
const NEED_HELP_AFTER_GUESSES = 4

interface Guess {
  id: number
  cardName: string
  result: GuessResult
  // True for a row loaded from a page reload rather than just guessed live
  // — CardDisplay uses this to skip its flip sound for restored rows.
  isRestored: boolean
}

function App() {
  const [guesses, setGuesses] = useState<Guess[]>([])
  const [showCardBrowser, setShowCardBrowser] = useState(false)
  const [showStats, setShowStats] = useState(false)
  // Auto-opens on every load (including reloads) until the player's first
  // ever win, then never again — see hasEverWon()'s own comment. Read once,
  // lazily, so it's already correct on the very first render rather than
  // flashing closed-then-open.
  const [showHowToPlay, setShowHowToPlay] = useState(() => !hasEverWon())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRestoring, setIsRestoring] = useState(true)
  const [previousAnswer, setPreviousAnswer] = useState<string | null>(null)
  const [winnersCount, setWinnersCount] = useState<number | null>(null)
  const [streak, setStreak] = useState(() => getStreak())
  // Set once this session has used all 8 guesses without winning — holds
  // today's revealed card name, same as Wordle showing the answer on a loss.
  const [lossAnswer, setLossAnswer] = useState<string | null>(null)
  // Nudges the player toward Card Browser after enough unsuccessful
  // guesses. Deliberately never set from the restore effect — only a *live*
  // unsuccessful guess turns it on (see handleSelectCard), so a reload right
  // after it appeared doesn't just bring it right back; it waits for the
  // next unsuccessful guess made after that reload, same as a first-ever
  // trigger. Opening Card Browser turns it back off.
  const [showNeedHelpHint, setShowNeedHelpHint] = useState(false)
  const nextId = useRef(0)

  // Start fetching the sound files immediately instead of waiting for the
  // first hover/flip/win to trigger it — otherwise that first play has to
  // queue behind everything else the page is loading at once (card images,
  // fonts, etc.), which is what made sounds feel laggy right after a load.
  useEffect(() => {
    preloadSounds()
  }, [])

  // Refresh-proof guesses: on load, replay whatever this browser already
  // guessed today (tracked server-side via the guest-session header — see
  // utils/guestSession.ts) before letting new guesses in, so a guess made
  // mid-restore can't land ahead of guesses that were actually made earlier.
  useEffect(() => {
    let cancelled = false

    fetchTodayGuesses()
      .then(({ guesses: past, reveal_answer }) => {
        if (cancelled) return
        // backend returns oldest-first; the UI prepends newest-first
        const restored = past
          .map((g) => ({
            id: nextId.current++,
            cardName: g.card_name,
            result: { comparisons: g.comparisons, is_correct: g.is_correct, reveal_answer: null },
            isRestored: true,
          }))
          .reverse()
        setGuesses(restored)
        // Already won today, before this reload — reopen the stats panel
        // the same way a live win does, once the restored rows' flip
        // animations (which replay on every mount, restored or not) finish.
        if (restored.some((g) => g.result.is_correct)) {
          window.setTimeout(() => {
            // Stats takes priority over the How to Play auto-open below —
            // normally mutually exclusive (that auto-open only happens
            // before a first-ever win, and this branch only runs after one),
            // but guards against both landing open together if localStorage
            // ever ends up in an inconsistent state.
            setShowHowToPlay(false)
            setShowStats(true)
          }, FLIP_ANIMATION_TOTAL_MS)
        } else if (reveal_answer) {
          // Already lost today, before this reload — same reopen, but with
          // the loss message instead of the win one.
          setLossAnswer(reveal_answer)
          window.setTimeout(() => {
            setShowHowToPlay(false)
            setShowStats(true)
          }, FLIP_ANIMATION_TOTAL_MS)
        }
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
      setGuesses((prev) => [{ id: nextId.current++, cardName, result, isRestored: false }, ...prev])
      if (result.is_correct) {
        recordWin(newGuessCount)
        setStreak(recordStreakWin())
        // Let the winning row's flip animation finish before the stats
        // panel covers it (and the win sound plays), instead of cutting
        // either off mid-flip.
        window.setTimeout(() => {
          setShowStats(true)
          playSound('/win%20sound.mp3')
        }, FLIP_ANIMATION_TOTAL_MS)
        // Optimistic — this browser's own win just happened server-side, no
        // need to round-trip and refetch the count for it to show up.
        setWinnersCount((prev) => (prev === null ? prev : prev + 1))
      } else if (result.reveal_answer) {
        // This guess used up the last try — same reveal, same delay, just
        // no win sound/streak, and a loss (not a win) recorded to stats.
        recordLoss()
        setLossAnswer(result.reveal_answer)
        window.setTimeout(() => setShowStats(true), FLIP_ANIMATION_TOTAL_MS)
      }
      if (!result.is_correct && newGuessCount >= NEED_HELP_AFTER_GUESSES) {
        setShowNeedHelpHint(true)
      }
    } catch (err) {
      console.error('Guess failed:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const guessedNames = new Set(guesses.map((guess) => guess.cardName))
  const hasWon = guesses.some((guess) => guess.result.is_correct)
  const hasLost = lossAnswer !== null

  return (
    <>
      <Background />
      {showCardBrowser && <CardBrowser onClose={() => setShowCardBrowser(false)} />}
      {showStats && (
        <StatsPanel
          onClose={() => setShowStats(false)}
          guessCount={hasWon ? guesses.length : undefined}
          lossAnswer={hasWon ? undefined : lossAnswer ?? undefined}
        />
      )}
      {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}
      <div className="app-content">
        <div className="app-toolbar">
          <div className="app-toolbar-group">
            <HowToPlayButton onOpen={() => setShowHowToPlay(true)} />
            <StreakDisplay streak={streak} />
            <CardBrowserButton
              onOpen={() => {
                setShowCardBrowser(true)
                setShowNeedHelpHint(false)
              }}
              showNeedHelpHint={showNeedHelpHint && !hasWon && !hasLost}
            />
            <StatsButton onOpen={() => setShowStats(true)} />
          </div>
        </div>
        <h1 className="app-title">Clashdle</h1>
        {!hasWon && !hasLost && (
          <>
            <SearchBar
              onSelectCard={handleSelectCard}
              guessedNames={guessedNames}
              disabled={isSubmitting}
              loading={isRestoring}
            />
            <p className="app-guess-counter">
              {guesses.length}/{MAX_GUESSES} guesses
            </p>
          </>
        )}
        {SHOW_WINNERS_COUNT && <TodayWinnersCount count={winnersCount} />}
        <div className="guesses-scroll">
          <StatsHeader />
          {guesses.map((guess) => (
            <CardDisplay
              key={guess.id}
              cardName={guess.cardName}
              comparisons={guess.result.comparisons}
              playFlipSounds={!guess.isRestored}
            />
          ))}
        </div>
        <PreviousAnswerFooter cardName={previousAnswer} />
      </div>
    </>
  )
}

export default App

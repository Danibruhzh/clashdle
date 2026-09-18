import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Background from './components/Background'
import SearchBar from './components/SearchBar'
import CardDisplay from './components/CardDisplay'
import StatsHeader from './components/StatsHeader'
import GuessesScroll from './components/GuessesScroll'
import CardBrowserButton from './components/CardBrowserButton'
import CardBrowser from './components/CardBrowser'
import StatsButton from './components/StatsButton'
import StatsPanel from './components/StatsPanel'
import HowToPlayButton from './components/HowToPlayButton'
import HowToPlayModal from './components/HowToPlayModal'
import StreakDisplay from './components/StreakDisplay'
import StreakModal from './components/StreakModal'
import ProfileButton from './components/ProfileButton'
import ProfileModal from './components/ProfileModal'
import LeaderboardButton from './components/LeaderboardButton'
import LeaderboardModal from './components/LeaderboardModal'
import PreviousAnswerFooter from './components/PreviousAnswerFooter'
import TodayWinnersCount from './components/TodayWinnersCount'
import clashdleTitle from './images/Clashdle Title.png'
import { submitGuess, fetchTodayGuesses, fetchPreviousAnswer, fetchTodayWinners } from './api/game'
import type { GuessResult } from './api/game'
import { recordWin, recordLoss, hasEverWon } from './utils/guessHistogram'
import { getStreak, recordStreakWin } from './utils/streak'
import { playSound, preloadSounds } from './utils/sound'
import { getAuthToken } from './utils/authSession'
import { useAuthStatus } from './utils/useAuthStatus'
import { fetchUserStats } from './api/auth'
import './App.css'
// Just for .unlimited-start-button's look — UnlimitedPage.tsx imports
// App.css the same way, for its own shared page-shell classes.
import './UnlimitedPage.css'

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
const MAX_GUESSES = 7

// The "Need help?" nudge (see needHelpHint below) shows starting from this
// many unsuccessful guesses.
const NEED_HELP_AFTER_GUESSES = 4

function getNextLocalMidnightMs(nowMs: number): number {
  const now = new Date(nowMs)
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime()
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':')
}

function useSecondTicker(): number {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  return nowMs
}

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
  const [showStreak, setShowStreak] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [leaderboardRefreshKey, setLeaderboardRefreshKey] = useState(0)
  // Only tracks *whether* someone's logged in (for the toolbar badge) — the
  // token itself is read fresh from storage wherever it's actually needed,
  // same as guest-session/timezone headers elsewhere in this app.
  const [loggedIn, setLoggedIn, authVerified] = useAuthStatus()
  // Auto-opens on every load (including reloads) until the player's first
  // ever win, then never again — see hasEverWon()'s own comment. Read once,
  // lazily, so it's already correct on the very first render rather than
  // flashing closed-then-open.
  const [showHowToPlay, setShowHowToPlay] = useState(() => !hasEverWon())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRestoring, setIsRestoring] = useState(true)
  const [isRestoreRetrying, setIsRestoreRetrying] = useState(false)
  const [previousAnswer, setPreviousAnswer] = useState<string | null>(null)
  const [winnersCount, setWinnersCount] = useState<number | null>(null)
  const [streak, setStreak] = useState(() => getStreak())
  // Set once this session has used all guesses without winning — holds
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

  // Refresh-proof guesses, re-run on every identity change: on mount, and
  // again any time loggedIn flips (ProfileModal's onAuthChange, wired to
  // setLoggedIn directly below) — replays whatever *this identity* (guest
  // session, or the logged-in account) has
  // already guessed today, so logging into an account that already won/lost
  // shows its actual guesses and locks play, and logging back out reverts
  // to this browser's own guest attempt. Guesses/lossAnswer/the hint are
  // cleared up front rather than left showing the outgoing identity's state
  // while the new identity's own data is still in flight.
  useEffect(() => {
    let cancelled = false
    let retryTimer: number | undefined
    setIsRestoring(true)
    setIsRestoreRetrying(false)
    setGuesses([])
    setLossAnswer(null)
    setShowNeedHelpHint(false)

    const restoreTodayGuesses = (attempt: number) => {
      fetchTodayGuesses()
      .then(({ guesses: past, reveal_answer }) => {
        if (cancelled) return
        setIsRestoreRetrying(false)
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
        // Already won today (before this reload, or under this account
        // already) — reopen the stats panel the same way a live win does,
        // once the restored rows' flip animations (which replay on every
        // mount, restored or not) finish.
        if (restored.some((g) => g.result.is_correct)) {
          window.setTimeout(() => {
            // Stats takes priority over the How to Play/Profile modals —
            // guards against either landing open at the same time as this.
            setShowHowToPlay(false)
            setShowProfile(false)
            setShowStats(true)
          }, FLIP_ANIMATION_TOTAL_MS)
        } else if (reveal_answer) {
          // Already lost today under this identity — same reopen, but with
          // the loss message instead of the win one.
          setLossAnswer(reveal_answer)
          window.setTimeout(() => {
            setShowHowToPlay(false)
            setShowProfile(false)
            setShowStats(true)
          }, FLIP_ANIMATION_TOTAL_MS)
        }
        setIsRestoring(false)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('Failed to restore past guesses:', err)
        if (attempt >= 3) setIsRestoreRetrying(true)
        retryTimer = window.setTimeout(
          () => restoreTodayGuesses(attempt + 1),
          Math.min(1000 * 2 ** (attempt - 1), 8000),
        )
      })
    }

    restoreTodayGuesses(1)

    // The toolbar streak number is account/guest-specific too — refreshed
    // alongside the guesses restore above rather than as its own effect, so
    // both update together on every identity change instead of drifting out
    // of sync with each other.
    if (loggedIn) {
      const token = getAuthToken()
      if (token) fetchUserStats(token).then((stats) => !cancelled && setStreak(stats.current_streak)).catch(() => {})
    } else {
      setStreak(getStreak())
    }

    return () => {
      cancelled = true
      if (retryTimer !== undefined) window.clearTimeout(retryTimer)
    }
  }, [loggedIn])

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
        setLeaderboardRefreshKey((key) => key + 1)
        if (loggedIn) {
          // Server already recorded this win (see routers/game.py's
          // record_win) — refetch rather than guess at the new number
          // locally, since whether this extends a streak or starts a fresh
          // one depends on the account's own last-win date, which this
          // browser doesn't otherwise know. Best-effort: the toolbar just
          // keeps showing the pre-win number if this fails.
          const token = getAuthToken()
          if (token) fetchUserStats(token).then((stats) => setStreak(stats.current_streak)).catch(() => {})
        } else {
          recordWin(newGuessCount)
          setStreak(recordStreakWin())
        }
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
        setLeaderboardRefreshKey((key) => key + 1)
        // This guess used up the last try — same reveal, same delay, just
        // no win sound/streak. The loss itself is only recorded to
        // localStorage as a guest — logged in, routers/game.py's guess()
        // already recorded it against the account.
        if (!loggedIn) recordLoss()
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
  const hasFinishedDaily = hasWon || hasLost
  const countdownNowMs = useSecondTicker()
  const nextDailyCountdown = formatCountdown(getNextLocalMidnightMs(countdownNowMs) - countdownNowMs)

  return (
    <>
      <Background />
      {showCardBrowser && <CardBrowser onClose={() => setShowCardBrowser(false)} />}
      {showStats && (
        <StatsPanel
          onClose={() => setShowStats(false)}
          guessCount={hasWon ? guesses.length : undefined}
          lossAnswer={hasWon ? undefined : lossAnswer ?? undefined}
          dailyShareGuesses={guesses.map((guess) => guess.result.comparisons)}
          showUnlimitedCta={hasWon || hasLost}
        />
      )}
      {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}
      {showStreak && <StreakModal onClose={() => setShowStreak(false)} />}
      {showProfile && (
        <ProfileModal onClose={() => setShowProfile(false)} onAuthChange={setLoggedIn} />
      )}
      {showLeaderboard && (
        <LeaderboardModal onClose={() => setShowLeaderboard(false)} refreshKey={leaderboardRefreshKey} />
      )}
      <div className={`app-content${guesses.length === 0 ? ' app-content--entry' : ''}`}>
        <div className="app-toolbar">
          <div className="app-toolbar-group">
            <HowToPlayButton onOpen={() => setShowHowToPlay(true)} />
            <StreakDisplay streak={streak} onOpen={() => setShowStreak(true)} />
            <CardBrowserButton
              onOpen={() => {
                setShowCardBrowser(true)
                setShowNeedHelpHint(false)
              }}
              showNeedHelpHint={showNeedHelpHint && !hasWon && !hasLost}
            />
            <StatsButton onOpen={() => setShowStats(true)} />
            <LeaderboardButton onOpen={() => setShowLeaderboard(true)} />
            <ProfileButton onOpen={() => setShowProfile(true)} loggedIn={loggedIn && authVerified} />
          </div>
        </div>
        <h1 className="app-title">
          <span className="sr-only">Clashdle</span>
          <Link className="app-title-link" to="/" aria-label="Go to Clashdle home">
            <img className="app-title-image app-title-image-daily" src={clashdleTitle} alt="" />
          </Link>
        </h1>
        <p className="app-description">
          {hasFinishedDaily
            ? 'Come back tomorrow to play again, or log in to play Unlimited!'
            : "Guess today's Clash Royale entity!"}
        </p>
        {hasFinishedDaily && (
          <div className="app-daily-countdown" aria-live="polite">
            <span className="app-daily-countdown-label">Next daily in</span>
            <span className="app-daily-countdown-time" key={nextDailyCountdown}>
              {nextDailyCountdown}
            </span>
          </div>
        )}
        {hasFinishedDaily && (
          <Link className="unlimited-start-button" to="/unlimited">
            {loggedIn ? 'Play Unlimited' : 'Log in to play Unlimited'}
          </Link>
        )}
        {!hasFinishedDaily && (
          <>
            <SearchBar
              onSelectCard={handleSelectCard}
              guessedNames={guessedNames}
              disabled={isSubmitting}
              loading={isRestoring}
              loadingLabel={isRestoreRetrying ? 'Trying to connect...' : 'Loading...'}
            />
            <p className="app-guess-counter">
              {guesses.length}/{MAX_GUESSES} guesses
            </p>
          </>
        )}
        {SHOW_WINNERS_COUNT && <TodayWinnersCount count={winnersCount} />}
        <GuessesScroll watch={guesses.length}>
          <StatsHeader />
          {guesses.map((guess) => (
            <CardDisplay
              key={guess.id}
              cardName={guess.cardName}
              comparisons={guess.result.comparisons}
              playFlipSounds={!guess.isRestored}
            />
          ))}
        </GuessesScroll>
        <PreviousAnswerFooter cardName={previousAnswer} />
        <section className="app-seo-section" aria-labelledby="clash-royale-stats-game-title">
          <h2 id="clash-royale-stats-game-title">Clash Royale Stats Guessing Game</h2>
          <p>
            Clashdle is a daily Clash Royale stats guessing game where you identify cards and other entities using real in-game stats.
          </p>
        </section>
      </div>
    </>
  )
}

export default App

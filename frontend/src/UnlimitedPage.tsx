import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import Background from './components/Background'
import AuthForm from './components/AuthForm'
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
import { fetchTodayGuesses } from './api/game'
import type { StatComparison } from './api/game'
import clashdleUnlimitedTitle from './images/Clashdle Unlimited Title.png'
import {
  fetchCurrentUnlimitedRound,
  startUnlimitedRound,
  submitUnlimitedGuess,
  fetchUnlimitedStats,
} from './api/unlimited'
import type { UnlimitedStats } from './api/unlimited'
import { useAuthStatus } from './utils/useAuthStatus'
// .app-content/.app-toolbar/.app-title/.app-guess-counter are App.tsx's
// page-shell classes, reused verbatim here rather than duplicated — this
// page's unlocked state mirrors that layout on purpose. UnlimitedPage.css
// holds only what's actually specific to this page.
import './App.css'
import './UnlimitedPage.css'

// Mirrors backend/app/services/game.py's MAX_GUESSES — same cap Unlimited
// rounds play by (see services/unlimited_stats.py's own docstring on why
// that's true even though the mode name suggests otherwise: "Unlimited"
// means unlimited *rounds*, not unlimited guesses within one).
const MAX_GUESSES = 7

// Same reasoning as App.tsx's own copy of this constant.
const FLIP_ANIMATION_TOTAL_MS = 1800

interface RoundGuess {
  id: number
  cardName: string
  comparisons: Record<string, StatComparison>
  isCorrect: boolean
  isRestored: boolean
}

// One of three gates gets checked, in order, every time this page loads or
// the login state changes — see the three-state spec this was built from:
// not logged in -> bare login/signup; logged in but today's daily not
// finished -> sent back to play it; logged in and finished -> Unlimited
// itself.
type Gate = 'checking' | 'logged-out' | 'daily-unfinished' | 'unlocked'

function UnlimitedPage() {
  const [loggedIn, setLoggedIn, authVerified] = useAuthStatus()
  const [gate, setGate] = useState<Gate>('checking')
  const [isGateRetrying, setIsGateRetrying] = useState(false)

  const [hasActiveRound, setHasActiveRound] = useState<boolean | null>(null)
  const [isRoundRestoreRetrying, setIsRoundRestoreRetrying] = useState(false)
  const [roundGuesses, setRoundGuesses] = useState<RoundGuess[]>([])
  const [roundResult, setRoundResult] = useState<'win' | 'loss' | null>(null)
  const [revealAnswer, setRevealAnswer] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [stats, setStats] = useState<UnlimitedStats | null>(null)
  const nextId = useRef(0)

  // Same set of menu items as App.tsx's toolbar, opened the same way.
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [showCardBrowser, setShowCardBrowser] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showStreak, setShowStreak] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [leaderboardRefreshKey, setLeaderboardRefreshKey] = useState(0)

  // Re-checks the gate on mount and on every login/logout, same pattern as
  // App.tsx's own guesses-restore effect — logging in (or out) can flip
  // straight from "logged-out" to either of the other two gates without a
  // page reload.
  useEffect(() => {
    let cancelled = false
    let retryTimer: number | undefined
    if (!loggedIn) {
      setGate('logged-out')
      setIsGateRetrying(false)
      return
    }
    setGate('checking')
    setIsGateRetrying(false)

    const checkDailyGate = (attempt: number) => {
      fetchTodayGuesses()
      .then(({ guesses, reveal_answer }) => {
        if (cancelled) return
        setIsGateRetrying(false)
        const finishedDaily = guesses.some((g) => g.is_correct) || reveal_answer !== null
        setGate(finishedDaily ? 'unlocked' : 'daily-unfinished')
      })
      .catch((err) => {
        if (cancelled) return
        console.error('Failed to check Unlimited gate:', err)
        if (attempt >= 3) setIsGateRetrying(true)
        retryTimer = window.setTimeout(
          () => checkDailyGate(attempt + 1),
          Math.min(1000 * 2 ** (attempt - 1), 8000),
        )
      })
    }

    checkDailyGate(1)

    return () => {
      cancelled = true
      if (retryTimer !== undefined) window.clearTimeout(retryTimer)
    }
  }, [loggedIn])

  // Restores an in-progress round (if any) and this account's Unlimited
  // stats once unlocked — mirrors App.tsx restoring today's guesses on load.
  useEffect(() => {
    if (gate !== 'unlocked') return
    let cancelled = false
    let retryTimer: number | undefined
    setHasActiveRound(null)
    setIsRoundRestoreRetrying(false)

    const restoreUnlimitedRound = (attempt: number) => {
      fetchCurrentUnlimitedRound()
      .then(({ guesses, has_active_round }) => {
        if (cancelled) return
        setIsRoundRestoreRetrying(false)
        setHasActiveRound(has_active_round)
        setRoundGuesses(
          guesses
            .map((g) => ({
              id: nextId.current++,
              cardName: g.card_name,
              comparisons: g.comparisons,
              isCorrect: g.is_correct,
              isRestored: true,
            }))
            .reverse(),
        )
      })
      .catch((err) => {
        if (cancelled) return
        console.error('Failed to restore Unlimited round:', err)
        if (attempt >= 3) setIsRoundRestoreRetrying(true)
        retryTimer = window.setTimeout(
          () => restoreUnlimitedRound(attempt + 1),
          Math.min(1000 * 2 ** (attempt - 1), 8000),
        )
      })
    }

    restoreUnlimitedRound(1)

    fetchUnlimitedStats()
      .then((s) => !cancelled && setStats(s))
      .catch((err) => console.error('Failed to load Unlimited stats:', err))

    return () => {
      cancelled = true
      if (retryTimer !== undefined) window.clearTimeout(retryTimer)
    }
  }, [gate])

  const handleStart = async () => {
    setIsStarting(true)
    try {
      await startUnlimitedRound()
      setRoundGuesses([])
      setRoundResult(null)
      setRevealAnswer(null)
      setHasActiveRound(true)
    } catch (err) {
      console.error('Failed to start Unlimited round:', err)
    } finally {
      setIsStarting(false)
    }
  }

  // Passed to StatsPanel's own Play Again button — closes the panel first
  // so the player lands back on the search bar for the new round underneath
  // it, rather than starting the round while still staring at the old one's
  // result.
  const handlePlayAgainFromPanel = () => {
    setShowStats(false)
    handleStart()
  }

  const handleSelectCard = async (cardName: string) => {
    setIsSubmitting(true)
    try {
      const result = await submitUnlimitedGuess(cardName)
      setRoundGuesses((prev) => [
        { id: nextId.current++, cardName, comparisons: result.comparisons, isCorrect: result.is_correct, isRestored: false },
        ...prev,
      ])
      if (result.is_correct || result.reveal_answer) {
        setLeaderboardRefreshKey((key) => key + 1)
        // Same beat as App.tsx's own win/loss handling: let the flip
        // animation finish, then reveal the result via the stats panel
        // instead of anything inline on the page itself.
        window.setTimeout(() => {
          setHasActiveRound(false)
          setRoundResult(result.is_correct ? 'win' : 'loss')
          setRevealAnswer(result.reveal_answer)
          setShowStats(true)
        }, FLIP_ANIMATION_TOTAL_MS)
        // The round's rows (and this account's stats) already updated
        // server-side (see routers/unlimited.py) — refetch rather than
        // guess at the new streak locally.
        fetchUnlimitedStats().then(setStats).catch(() => {})
      }
    } catch (err) {
      console.error('Unlimited guess failed:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (gate === 'logged-out') {
    return (
      <>
        <Background />
        <div className="unlimited-auth-page">
          <div className="unlimited-auth-box">
            <AuthForm onAuthChange={setLoggedIn} />
          </div>
          <Link className="unlimited-gate-link" to="/">
            Back to Daily
          </Link>
        </div>
      </>
    )
  }

  if (gate === 'checking') {
    return (
      <>
        <Background />
        <div className="unlimited-gate-page">
          <p className="unlimited-gate-message">{isGateRetrying ? 'Trying to connect…' : 'Loading…'}</p>
        </div>
      </>
    )
  }

  if (gate === 'daily-unfinished') {
    return (
      <>
        <Background />
        <div className="unlimited-gate-page">
          <p className="unlimited-gate-message">Finish today's daily card first to unlock Unlimited.</p>
          <Link className="unlimited-gate-link" to="/">
            Back to Daily
          </Link>
        </div>
      </>
    )
  }

  const guessedNames = new Set(roundGuesses.map((g) => g.cardName))
  const streakOverride = stats ? { current: stats.current_streak, best: stats.best_streak } : null
  const statsOverride = stats ? { histogram: stats.histogram, gamesPlayed: stats.games_played, wins: stats.wins } : null

  return (
    <>
      <Background />
      {showCardBrowser && <CardBrowser onClose={() => setShowCardBrowser(false)} />}
      {showStats && (
        <StatsPanel
          onClose={() => setShowStats(false)}
          statsOverride={statsOverride}
          title="Unlimited Stats"
          guessCount={roundResult === 'win' ? roundGuesses.length : undefined}
          lossAnswer={roundResult === 'loss' ? revealAnswer ?? undefined : undefined}
          // Only once this round is actually over — opening Stats mid-round
          // (via the toolbar button, not the auto-open) shouldn't offer a
          // Play Again for a round that's still in progress underneath it.
          onPlayAgain={roundResult ? handlePlayAgainFromPanel : undefined}
          playAgainDisabled={isStarting}
        />
      )}
      {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}
      {showStreak && (
        <StreakModal onClose={() => setShowStreak(false)} override={streakOverride} title="Unlimited Streak" />
      )}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} onAuthChange={setLoggedIn} />}
      {showLeaderboard && (
        <LeaderboardModal onClose={() => setShowLeaderboard(false)} refreshKey={leaderboardRefreshKey} />
      )}
      <div className={`app-content${roundGuesses.length === 0 ? ' app-content--entry' : ''}`}>
        <div className="unlimited-toolbar">
          <Link className="unlimited-gate-link" to="/">
            Back to Daily
          </Link>
          <div className="app-toolbar-group">
            <HowToPlayButton onOpen={() => setShowHowToPlay(true)} />
            <StreakDisplay
              streak={stats?.current_streak ?? 0}
              onOpen={() => setShowStreak(true)}
              label="Unlimited Win Streak"
            />
            <CardBrowserButton onOpen={() => setShowCardBrowser(true)} />
            <StatsButton onOpen={() => setShowStats(true)} />
            <LeaderboardButton onOpen={() => setShowLeaderboard(true)} />
            <ProfileButton onOpen={() => setShowProfile(true)} loggedIn={loggedIn && authVerified} />
          </div>
        </div>
        <h1 className="app-title app-title-unlimited">
          <Link className="app-title-link" to="/" aria-label="Go to Clashdle home">
            <img
              className="app-title-image app-title-image-unlimited"
              src={clashdleUnlimitedTitle}
              alt="Clashdle Unlimited"
            />
          </Link>
        </h1>

        {/* The result itself (win/loss message) only ever shows via the
            auto-opened stats panel above — see handleSelectCard — not here.
            This stays as a fallback entry point for starting a new round
            after closing that panel without using its own Play Again. */}
        {hasActiveRound === false && (
          <button className="unlimited-start-button" onClick={handleStart} disabled={isStarting}>
            {isStarting ? 'Starting…' : roundResult ? 'Play Again' : 'Start Playing'}
          </button>
        )}

        {hasActiveRound === null && (
          <SearchBar
            onSelectCard={handleSelectCard}
            guessedNames={guessedNames}
            loading
            loadingLabel={isRoundRestoreRetrying ? 'Trying to connect...' : 'Loading...'}
          />
        )}

        {hasActiveRound && (
          <>
            <SearchBar
              onSelectCard={handleSelectCard}
              guessedNames={guessedNames}
              disabled={isSubmitting}
              loading={false}
            />
            <p className="app-guess-counter">
              {roundGuesses.length}/{MAX_GUESSES} guesses
            </p>
          </>
        )}

        <GuessesScroll watch={roundGuesses.length}>
          <StatsHeader />
          {roundGuesses.map((g) => (
            <CardDisplay key={g.id} cardName={g.cardName} comparisons={g.comparisons} playFlipSounds={!g.isRestored} />
          ))}
        </GuessesScroll>
      </div>
    </>
  )
}

export default UnlimitedPage

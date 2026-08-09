import { useState, useRef } from 'react'
import Background from './components/Background'
import SearchBar from './components/SearchBar'
import CardDisplay from './components/CardDisplay'
import StatsHeader from './components/StatsHeader'
import ResetButton from './components/ResetButton'
import WinPopup from './components/WinPopup'
import { cardNames } from './data/cards'
import './App.css'

interface Guess {
  id: number
  cardName: string
}

function pickSecretCard() {
  return cardNames[Math.floor(Math.random() * cardNames.length)]
}

function App() {
  const [guesses, setGuesses] = useState<Guess[]>([])
  const [resetCount, setResetCount] = useState(0)
  const [secretCard, setSecretCard] = useState(pickSecretCard)
  const nextId = useRef(0)
  console.log(secretCard)

  const handleSelectCard = (cardName: string) => {
    setGuesses((prev) => [{ id: nextId.current++, cardName }, ...prev])
  }

  const handleReset = () => {
    setGuesses([])
    setResetCount((prev) => prev + 1)
    setSecretCard(pickSecretCard())
  }

  const guessedNames = new Set(guesses.map((guess) => guess.cardName))
  const hasWon = guessedNames.has(secretCard)

  return (
    <>
    <Background />
    <ResetButton onReset={handleReset} />
    {hasWon && <WinPopup guessCount={guesses.length} />}
    <div className="app-content">
      <h1 className="app-title">Clashdle</h1>
      <SearchBar
        key={resetCount}
        onSelectCard={handleSelectCard}
        guessedNames={guessedNames}
        disabled={hasWon}
      />
      <div className="guesses-scroll">
        <StatsHeader />
        {guesses.map((guess) => (
          <CardDisplay key={guess.id} cardName={guess.cardName} secretCardName={secretCard} />
        ))}
      </div>
    </div>
    </>
  )
}

export default App

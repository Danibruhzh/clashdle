import { useState, useRef } from 'react'
import Background from './components/Background'
import SearchBar from './components/SearchBar'
import CardDisplay from './components/CardDisplay'
import StatsHeader from './components/StatsHeader'
import ResetButton from './components/ResetButton'
import './App.css'

interface Guess {
  id: number
  cardName: string
}

function App() {
  const [guesses, setGuesses] = useState<Guess[]>([])
  const [resetCount, setResetCount] = useState(0)
  const nextId = useRef(0)

  const handleSelectCard = (cardName: string) => {
    setGuesses((prev) => [{ id: nextId.current++, cardName }, ...prev])
  }

  const handleReset = () => {
    setGuesses([])
    setResetCount((prev) => prev + 1)
  }

  const guessedNames = new Set(guesses.map((guess) => guess.cardName))

  return (
    <>
    <Background />
    <ResetButton onReset={handleReset} />
    <div className="app-content">
      <h1 className="app-title">Clashdle</h1>
      <SearchBar key={resetCount} onSelectCard={handleSelectCard} guessedNames={guessedNames} />
      <StatsHeader />
      {guesses.map((guess) => (
        <CardDisplay key={guess.id} cardName={guess.cardName} />
      ))}
    </div>
    </>
  )
}

export default App

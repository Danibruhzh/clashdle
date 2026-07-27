import { useState } from 'react'
import Background from './components/Background'
import SearchBar from './components/SearchBar'
import CardDisplay from './components/CardDisplay'
import './App.css'

function App() {
  const [selectedCard, setSelectedCard] = useState('King Tower')

  return (
    <>
    <Background />
    <div className="app-content">
      <h3>Clashdle</h3>
      <SearchBar onSelectCard={setSelectedCard} />
      <CardDisplay cardName={selectedCard} />
    </div>
    </>
  )
}

export default App

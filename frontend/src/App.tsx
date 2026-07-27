import Background from './components/Background'
import SearchBar from './components/SearchBar'
import CardDisplay from './components/CardDisplay'
import './App.css'

function App() {

  return (
    <>
    <Background />
    <div className="app-content">
      <h3>Clashdle</h3>
      <SearchBar />
      <CardDisplay cardName="Evolution Knight" />
    </div>
    </>
  )
}

export default App

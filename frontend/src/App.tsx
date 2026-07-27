import Background from './components/Background'
import SearchBar from './components/SearchBar'
import './App.css'

function App() {

  return (
    <>
    <Background />
    <div className="app-content">
      <h3>Clashdle</h3>
      <SearchBar />
    </div>
    </>
  )
}

export default App

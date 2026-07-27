import allCards from '../data/all_cards.json'
import './CardDisplay.css'

const cards = allCards as Record<string, Record<string, string>>

interface CardDisplayProps {
  cardName: string
}

function CardDisplay({ cardName }: CardDisplayProps) {
  const stats = cards[cardName]

  if (!stats) {
    return <div className="card-display">No card found for "{cardName}"</div>
  }

  return (
    <div className="card-display">
      <div className="card-display-stats">
        <div className="card-display-stat card-display-name">
          <span className="card-display-stat-value">{cardName}</span>
        </div>
        {Object.entries(stats)
          .filter(([stat]) => stat !== '__NOTE__')
          .map(([stat, value]) => (
            <div className="card-display-stat" key={stat}>
              <span className="card-display-stat-label">{stat}</span>
              <span className="card-display-stat-value">{value}</span>
            </div>
          ))}
      </div>
    </div>
  )
}

export default CardDisplay

import allCards from '../data/all_cards.json'
import './CardDisplay.css'

type StatValue = string | Record<string, string>

const cards = allCards as Record<string, Record<string, StatValue>>

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
        <div className="card-display-stat card-display-name" style={{ animationDelay: '0s' }}>
          <span className="card-display-stat-value">{cardName}</span>
        </div>
        {Object.entries(stats)
          .filter(([stat]) => stat !== '__NOTE__')
          .map(([stat, value], index) => {
            const animationDelay = `${(index + 1) * 0.2}s`

            if (typeof value === 'string') {
              return (
                <div className="card-display-stat" key={stat} style={{ animationDelay }}>
                  <span className="card-display-stat-value">{value}</span>
                </div>
              )
            }

            const [subLabel, subValue] = Object.entries(value)[0]
            return (
              <div className="card-display-stat" key={stat} style={{ animationDelay }}>
                <span className="card-display-stat-sublabel">{subLabel}</span>
                <span className="card-display-stat-value">{subValue}</span>
              </div>
            )
          })}
      </div>
    </div>
  )
}

export default CardDisplay

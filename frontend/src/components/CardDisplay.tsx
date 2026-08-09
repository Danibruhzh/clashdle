import { cards } from '../data/cards'
import type { StatValue } from '../data/cards'
import { compareStat, statCategory } from '../utils/compareStats'
import type { StatComparison } from '../utils/compareStats'
import upArrow from '../images/up-arrow.png'
import downArrow from '../images/down-arrow.png'
import './CardDisplay.css'

interface CardDisplayProps {
  cardName: string
  secretCardName: string
}

function arrowStyle(comparison: StatComparison | undefined) {
  if (comparison === 'higher') return { backgroundImage: `url(${upArrow})` }
  if (comparison === 'lower') return { backgroundImage: `url(${downArrow})` }
  return {}
}

function getCardImagePath(cardName: string): string {
  const normalized = cardName.replace(/\./g, "")
  return `/card_images_trimmed/${normalized}.png`;
}

// Splits values like "384 (192 x2)" into a main number and a smaller,
// separately-lined bracketed part.
function renderStatValue(value: string) {
  const match = value.match(/^(\d+) (\(.+\))$/)
  if (!match) return value

  const [, main, bracket] = match
  return (
    <>
      {main}
      <span className="card-display-stat-bracket">{bracket}</span>
    </>
  )
}

function CardDisplay({ cardName, secretCardName }: CardDisplayProps) {
  const stats = cards[cardName]
  const secretStats = cards[secretCardName]

  if (!stats) {
    return <div className="card-display">No card found for "{cardName}"</div>
  }

  const secretByCategory = new Map<string, StatValue>(
    Object.entries(secretStats)
      .filter(([stat]) => stat !== '__NOTE__')
      .map(([stat, value]) => [statCategory(stat), value])
  )

  return (
    <div className="card-display">
      <div className="card-display-stats">
        <div className="card-display-stat card-display-name" style={{ animationDelay: '0s' }}>
          <img className="card-image" src={getCardImagePath(cardName)} alt={cardName} />
          <span className="card-display-name-overlay">{cardName}</span>
        </div>
        {Object.entries(stats)
          .filter(([stat]) => stat !== '__NOTE__')
          .map(([stat, value], index) => {
            const animationDelay = `${(index + 1) * 0.2}s`
            const secretValue = secretByCategory.get(statCategory(stat))
            const comparison =
              secretValue !== undefined
                ? compareStat(statCategory(stat), secretValue, value)
                : undefined
            const className = `card-display-stat${comparison ? ` card-display-stat--${comparison}` : ''}`
            const style = { animationDelay, ...arrowStyle(comparison) }

            if (typeof value === 'string') {
              return (
                <div className={className} key={stat} style={style}>
                  <span className="card-display-stat-value">{renderStatValue(value)}</span>
                </div>
              )
            }

            const [subLabel, subValue] = Object.entries(value)[0]
            return (
              <div className={className} key={stat} style={style}>
                <span className="card-display-stat-sublabel">{subLabel}</span>
                <span className="card-display-stat-value">{renderStatValue(subValue)}</span>
              </div>
            )
          })}
      </div>
    </div>
  )
}

export default CardDisplay

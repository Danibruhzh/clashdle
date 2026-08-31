import { cards } from '../data/cards'
import { statCategory } from '../utils/statCategory'
import type { StatComparison } from '../api/game'
import { getCardImagePath } from '../utils/cardImage'
import { playSound } from '../utils/sound'
import upArrow from '../images/up-arrow.png'
import downArrow from '../images/down-arrow.png'
import './CardDisplay.css'

// onAnimationStart fires when the CSS flip-in animation actually begins —
// i.e. after its animation-delay elapses — so this naturally lines each
// box's sound up with its own staggered flip without redoing the timing
// math (index * 0.2s, see the delay below) in JS.
function playFlipSound() {
  playSound('/flip%20sound.mp3')
}

interface CardDisplayProps {
  cardName: string
  comparisons: Record<string, StatComparison>
  // False for a row restored from a page reload — only a live, first-time
  // guess should sound its flip. Defaults to true for a normal live guess.
  playFlipSounds?: boolean
}

function arrowStyle(comparison: StatComparison | undefined) {
  if (comparison === 'higher') return { backgroundImage: `url(${upArrow})` }
  if (comparison === 'lower') return { backgroundImage: `url(${downArrow})` }
  return {}
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

function CardDisplay({ cardName, comparisons, playFlipSounds = true }: CardDisplayProps) {
  const stats = cards[cardName]

  if (!stats) {
    return <div className="card-display">No card found for "{cardName}"</div>
  }

  const handleFlip = playFlipSounds ? playFlipSound : undefined

  return (
    <div className="card-display">
      <div className="card-display-stats">
        <div
          className="card-display-stat card-display-name"
          style={{ animationDelay: '0s' }}
          onAnimationStart={handleFlip}
          onMouseEnter={() => playSound('/grabcard.mp3')}
        >
          <img className="card-image" src={getCardImagePath(cardName)} alt={cardName} />
          <span className="card-display-name-overlay">{cardName}</span>
        </div>
        {Object.entries(stats)
          .filter(([stat]) => stat !== '__NOTE__')
          .map(([stat, value], index) => {
            const animationDelay = `${(index + 1) * 0.2}s`
            const comparison = comparisons[statCategory(stat)]
            const className = `card-display-stat${comparison ? ` card-display-stat--${comparison}` : ''}`
            const style = { animationDelay, ...arrowStyle(comparison) }

            if (typeof value === 'string') {
              return (
                <div className={className} key={stat} style={style} onAnimationStart={handleFlip}>
                  <span className="card-display-stat-value">{renderStatValue(value)}</span>
                </div>
              )
            }

            const [subLabel, subValue] = Object.entries(value)[0]
            return (
              <div className={className} key={stat} style={style} onAnimationStart={handleFlip}>
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

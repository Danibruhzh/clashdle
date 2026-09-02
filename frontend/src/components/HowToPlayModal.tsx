import upArrow from '../images/up-arrow.png'
import downArrow from '../images/down-arrow.png'
import { getCardImagePath } from '../utils/cardImage'
import './HowToPlayModal.css'

interface HowToPlayModalProps {
  onClose: () => void
}

const STAT_GLOSSARY = [
  { name: 'Cost', description: 'How much Elixir it takes to play the card.' },
  { name: 'Type', description: 'Troop, Building, Spell, or Tower Troop.' },
  { name: 'Rarity', description: 'Common, Rare, Epic, Legendary, or Champion.' },
  { name: 'Target', description: "What it's able to attack — Ground, Air & Ground, Buildings, or Friendly troops." },
  { name: 'Hitpoints', description: 'How much damage it can take before dying.' },
  { name: 'Damage', description: 'Damage dealt per hit.' },
  { name: 'Damage Per Second', description: 'Damage output per second, accounting for attack speed.' },
  { name: 'Special Damage', description: 'Extra effects some cards have, like Death Damage or Charge Damage.' },
]

// A real example — guessing Knight when the secret card is Archers — using
// both cards' actual stats, so every value and every color/arrow below is
// exactly what the real game would show. secretValue is Archers' own stat,
// never shown colored, since on its own it isn't a comparison result, just
// a fact.
const EXAMPLE_ROWS: {
  stat: string
  guessValue: string
  secretValue: string
  kind: 'match' | 'mismatch' | 'higher' | 'lower'
}[] = [
  { stat: 'Cost', guessValue: '3', secretValue: '3', kind: 'match' },
  { stat: 'Type', guessValue: 'Troop', secretValue: 'Troop', kind: 'match' },
  { stat: 'Rarity', guessValue: 'Common', secretValue: 'Common', kind: 'match' },
  { stat: 'Target', guessValue: 'Ground', secretValue: 'Air & Ground', kind: 'mismatch' },
  { stat: 'Hitpoints', guessValue: '1766', secretValue: '304', kind: 'lower' },
  { stat: 'Damage', guessValue: '202', secretValue: '112', kind: 'lower' },
  { stat: 'Damage Per Second', guessValue: '168', secretValue: '124', kind: 'lower' },
  { stat: 'Special Damage', guessValue: 'N/A', secretValue: 'N/A', kind: 'match' },
]

function exampleRowStyle(kind: (typeof EXAMPLE_ROWS)[number]['kind']) {
  if (kind === 'higher') return { backgroundImage: `url(${upArrow})` }
  if (kind === 'lower') return { backgroundImage: `url(${downArrow})` }
  return {}
}

function HowToPlayModal({ onClose }: HowToPlayModalProps) {
  return (
    <div className="how-to-play-backdrop" onClick={onClose}>
      <div className="how-to-play-panel" onClick={(e) => e.stopPropagation()}>
        <div className="how-to-play-header">
          <h2>How to Play</h2>
          <button className="how-to-play-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <p className="how-to-play-intro">
          Guess today's secret Clash Royale card. Each guess compares it against the answer
          across 8 stats.
        </p>

        <div className="how-to-play-legend">
          <div className="how-to-play-legend-box how-to-play-legend-box--match">
            <span className="how-to-play-legend-label">Cost</span>
            <span className="how-to-play-legend-value">4</span>
          </div>
          <div
            className="how-to-play-legend-box how-to-play-legend-box--higher"
            style={{ backgroundImage: `url(${upArrow})` }}
          >
            <span className="how-to-play-legend-label">Hitpoints</span>
            <span className="how-to-play-legend-value">1200</span>
          </div>
          <div className="how-to-play-legend-box how-to-play-legend-box--mismatch">
            <span className="how-to-play-legend-label">Type</span>
            <span className="how-to-play-legend-value">Spell</span>
          </div>
        </div>

        <div className="how-to-play-legend-rules">
          <div className="how-to-play-legend-rule">
            <span className="how-to-play-swatch how-to-play-swatch--match" />
            <span>Exact match</span>
          </div>
          <div className="how-to-play-legend-rule">
            <span className="how-to-play-swatch how-to-play-swatch--mismatch" />
            <span>No match</span>
          </div>
          <div className="how-to-play-legend-rule">
            <span
              className="how-to-play-swatch how-to-play-swatch--arrow"
              style={{ backgroundImage: `url(${upArrow})` }}
            />
            <span>No match, and the answer is higher</span>
          </div>
          <div className="how-to-play-legend-rule">
            <span
              className="how-to-play-swatch how-to-play-swatch--arrow"
              style={{ backgroundImage: `url(${downArrow})` }}
            />
            <span>No match, and the answer is lower</span>
          </div>
        </div>
        <p className="how-to-play-legend-note">
          Arrows only show up on number stats — Cost, Hitpoints, Damage, Damage Per Second,
          Special Damage, and Rarity. Type and Target are always just a match or not.
        </p>

        <h3 className="how-to-play-section-title">What Each Stat Means</h3>
        <dl className="how-to-play-glossary">
          {STAT_GLOSSARY.map(({ name, description }) => (
            <div className="how-to-play-glossary-item" key={name}>
              <dt>{name}</dt>
              <dd>{description}</dd>
            </div>
          ))}
        </dl>

        <ul className="how-to-play-rules">
          <li>A new card every day, at your own local midnight.</li>
          <li>Can't guess the same card twice.</li>
        </ul>

        <div className="how-to-play-divider" />

        <ul className="how-to-play-footnotes">
          <li>Not sure of a name? Browse every card via the cards icon!</li>
          <li>Win daily to build a streak!.</li>
        </ul>

        <div className="how-to-play-divider" />

        <h3 className="how-to-play-section-title">Example</h3>
        <p className="how-to-play-example-intro">
          Say you guess <strong>Knight</strong> — this is what the row of feedback looks like:
        </p>
        <div className="how-to-play-example-card">
          <div className="how-to-play-mini-stat how-to-play-mini-stat--name">
            <img className="how-to-play-mini-image" src={getCardImagePath('Knight')} alt="Knight" />
            <span className="how-to-play-mini-name-overlay">Knight</span>
          </div>
          {EXAMPLE_ROWS.map(({ stat, guessValue, kind }) => (
            <div
              className={`how-to-play-mini-stat how-to-play-mini-stat--${kind}`}
              key={stat}
              style={exampleRowStyle(kind)}
            >
              <span className="how-to-play-mini-stat-label">{stat}</span>
              <span className="how-to-play-mini-stat-value">{guessValue}</span>
            </div>
          ))}
        </div>

        <p className="how-to-play-example-intro">
          In this example, the secret card was actually <strong>Archers</strong> — here's what
          it looks like once you guess it correctly:
        </p>
        <div className="how-to-play-example-card">
          <div className="how-to-play-mini-stat how-to-play-mini-stat--name">
            <img className="how-to-play-mini-image" src={getCardImagePath('Archers')} alt="Archers" />
            <span className="how-to-play-mini-name-overlay">Archers</span>
          </div>
          {EXAMPLE_ROWS.map(({ stat, secretValue }) => (
            // Guessing Archers itself would be a win — every stat matches
            // itself by definition, so this row is all green.
            <div className="how-to-play-mini-stat how-to-play-mini-stat--match" key={stat}>
              <span className="how-to-play-mini-stat-label">{stat}</span>
              <span className="how-to-play-mini-stat-value">{secretValue}</span>
            </div>
          ))}
        </div>

        <p className="how-to-play-example-summary">
          Cost, Type, Rarity, and Special Damage all matched — you're close! Target didn't
          match, and Archers has less Hitpoints, Damage, and Damage Per Second than Knight.
        </p>
      </div>
    </div>
  )
}

export default HowToPlayModal

import type { ReactNode } from 'react'
import upArrow from '../images/up-arrow.png'
import downArrow from '../images/down-arrow.png'
import { getCardImagePath } from '../utils/cardImage'
import { useScrollHint } from '../utils/useScrollHint'
import './HowToPlayModal.css'

interface HowToPlayModalProps {
  onClose: () => void
}

const STAT_GLOSSARY: { name: string; description: ReactNode[] }[] = [
  {
    name: 'Cost',
    description: [
      <>The <i>Elixir Cost</i> needed to play the card.</>,
      <>The cost of <b>Spawnees</b> (e.g. <strong>Cursed Hog</strong>) and <b>multiple-entity cards</b> (e.g. <strong>Rascal Girl</strong>) will be the <b>cost of the original card.</b></>,
      <>For entities summoned by an <b>ability</b>, the cost is the <b>ability's cost</b> instead.</>,
    ],
  },
  {
    name: 'Type',
    description: [
      <>The first part is the <b>Entity Type</b>: <i>Troop</i>, <i>Building</i>, <i>Spell</i>, or <i>Tower Troop</i>.</>,
      <>The second part is the <b>Card Type</b>: <i>Normal</i>, <i>Evolution</i>, <i>Hero</i>, <i>Spawnee</i>, or <i>Ability Spawnee</i>.</>,
      <><b>Partial Match</b> means <b>only one</b> of those two parts is correct.</>,
    ],
  },
  {
    name: 'Rarity',
    description: [<><i>Common</i>, <i>Rare</i>, <i>Epic</i>, <i>Legendary</i>, or <i>Champion</i>.</>],
  },
  {
    name: 'Target',
    description: [<><i>Ground</i>, <i>Air & Ground</i>, <i>Buildings</i>, or <i>Friendly</i>.</>],
  },
  {
    name: 'Hitpoints',
    description: [<>How much damage it can take before dying. This always refers to <b>Max Hitpoints</b> and includes <b>shields</b>.</>],
  },
  {
    name: 'Damage',
    description: [<>Damage dealt <b>per attack</b>, assuming it's attacking a single target.</>],
  },
  {
    name: 'Damage Per Second',
    description: ['Damage output per second on a single target, accounting for attack speed.'],
  },
  {
    name: 'Special Damage',
    description: [<>Any <b>extra damage effects</b> a card has, like <i>Death Damage</i> or <i>Charge Damage</i>.</>],
  },
]

const EXAMPLE_ROWS: {
  stat: string
  guessValue: string
  secretValue: string
  kind: 'match' | 'partial' | 'mismatch' | 'higher' | 'lower'
}[] = [
    { stat: 'Cost', guessValue: '3', secretValue: '3', kind: 'match' },
    { stat: 'Type', guessValue: 'Troop, Hero', secretValue: 'Troop, Normal', kind: 'partial' },
    { stat: 'Rarity', guessValue: 'Rare', secretValue: 'Common', kind: 'lower' },
    { stat: 'Target', guessValue: 'Air & Ground', secretValue: 'Air & Ground', kind: 'match' },
    { stat: 'Hitpoints', guessValue: '837', secretValue: '304', kind: 'lower' },
    { stat: 'Damage', guessValue: '312', secretValue: '112', kind: 'lower' },
    { stat: 'Damage Per Second', guessValue: '208', secretValue: '124', kind: 'lower' },
    { stat: 'Special Damage', guessValue: '399', secretValue: 'N/A', kind: 'mismatch' },
  ]

function exampleRowStyle(kind: (typeof EXAMPLE_ROWS)[number]['kind']) {
  if (kind === 'higher') return { backgroundImage: `url(${upArrow})` }
  if (kind === 'lower') return { backgroundImage: `url(${downArrow})` }
  return {}
}

function HowToPlayModal({ onClose }: HowToPlayModalProps) {
  const { ref: panelRef, showScrollHint } = useScrollHint()

  return (
    <div className="how-to-play-backdrop" onClick={onClose}>
      <div
        className={`how-to-play-panel-frame${showScrollHint ? '' : ' how-to-play-panel-frame--scroll-end'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="how-to-play-panel" ref={panelRef}>
          <div className="how-to-play-header">
            <h2>How to Play Clashdle</h2>
            <button className="how-to-play-close" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>

        <p className="how-to-play-intro">
          Guess today's secret card from Supercell's <strong>Clash Royale</strong> in 8 tries.
          <br />
          Each guess is compared against the answer across 8 stats.
        </p>

        <section className="how-to-play-disclaimers" aria-label="Disclaimers">
          <h3 className="how-to-play-section-title">Disclaimers:</h3>
          <p>
            All stats are relative to <b>one entity</b> of a card, even for multiple-entity cards.
            <br />
            (e.g., <strong>Archers</strong> shows stats for one <strong>Archer</strong>).
          </p>

          <p>
            Clashdle is based on <b>Level 11</b> stats.
          </p>

          <p>
            The selection is <b>not limited to cards.</b> 
              <br />
            It includes <i>Heroes</i>, <i>Evolutions</i>, <i> Spawnees</i> (e.g. <strong>Lava Pup</strong>, <strong>Elixir Blob</strong>), and even <i>Abilities</i> (e.g. <strong>Trusty Turret</strong>).
          </p>
          <p>
            Some cards are not included because they have identical stats to one
            of their counterparts (e.g. Evolution Goblin Giant) or have no distinct
            stats (e.g. Goblin Gang).
          </p>
        </section>

        <div className="how-to-play-divider" />

        <h3 className="how-to-play-section-title">What Each Stat Means</h3>

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
            <span className="how-to-play-swatch how-to-play-swatch--partial" />
            <span>Partial Type match</span>
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

        <dl className="how-to-play-glossary">
          {STAT_GLOSSARY.map(({ name, description }) => (
            <div className="how-to-play-glossary-item" key={name}>
              <dt>{name}</dt>
              <dd>
                {description.map((line, index) => (
                  <span className="how-to-play-glossary-line" key={index}>
                    {line}
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>

        <div className="how-to-play-divider" />

        <h3 className="how-to-play-section-title">Example</h3>
        <p className="how-to-play-example-intro">
          Say you guess <strong>Hero Mega Minion</strong> — this is what the row of feedback looks like:
        </p>
        <div className="how-to-play-example-card">
          <div className="how-to-play-mini-stat how-to-play-mini-stat--name">
            <img className="how-to-play-mini-image" src={getCardImagePath('Hero Mega Minion')} alt="Hero Mega Minion" />
            <span className="how-to-play-mini-name-overlay">Hero Mega Minion</span>
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
          In this example, the secret card was actually <strong>Archers</strong>. Here's what
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

        <div className="how-to-play-divider" />

        <h3 className="how-to-play-section-title">Quick Tips</h3>
        <ul className="how-to-play-footnotes">
          <li>Need a refresher? Open <b>How to Play</b> any time via the question mark icon!</li>
          <li>Not sure of a name? Check out the <b>Card Browser</b> via the cards icon!</li>
          <li>Open the <b>Stats Panel</b> to review your wins, losses, and guess distribution!</li>
          <li>Win daily to build a <b>streak</b>!</li>
          <li>Log in to appear on the <b>leaderboard</b>!</li>
          <li>Use <b>Profile</b> to save your stats online!</li>
          <li>Finished the <b>Daily Game</b>? Sign up to play <b>Unlimited Mode</b>!</li>
          <li>A new card every day, at your own local midnight!</li>
        </ul>

        </div>
      </div>
    </div>
  )
}

export default HowToPlayModal

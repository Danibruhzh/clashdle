import './CardDisplay.css'
import './StatsHeader.css'

const STAT_LABELS = [
  'Name',
  'Cost',
  'Type',
  'Rarity',
  'Target',
  'Hitpoints',
  'Damage',
  'Damage Per Second',
  'Special Damage',
]

function StatsHeader() {
  return (
    <div className="card-display stats-header">
      <div className="card-display-stats">
        {STAT_LABELS.map((label) => (
          <div className="card-display-stat stats-header-cell" key={label}>
            <span className="card-display-stat-value">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default StatsHeader

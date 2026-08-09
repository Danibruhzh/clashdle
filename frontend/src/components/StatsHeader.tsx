import './StatsHeader.css'

const STAT_LABELS = [
  'Card',
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
    <div className="stats-header">
      {STAT_LABELS.map((label) => (
        <span className="stats-header-cell" key={label}>
          {label}
        </span>
      ))}
    </div>
  )
}

export default StatsHeader

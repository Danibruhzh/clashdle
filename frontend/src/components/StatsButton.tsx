import './StatsButton.css'

interface StatsButtonProps {
  onOpen: () => void
}

function StatsButton({ onOpen }: StatsButtonProps) {
  return (
    <button className="stats-button" onClick={onOpen}>
      Stats
    </button>
  )
}

export default StatsButton

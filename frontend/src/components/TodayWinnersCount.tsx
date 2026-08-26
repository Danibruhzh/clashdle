import './TodayWinnersCount.css'

interface TodayWinnersCountProps {
  count: number | null
}

function TodayWinnersCount({ count }: TodayWinnersCountProps) {
  if (count === null) return null

  return (
    <p className="today-winners-count">
      {count} {count === 1 ? 'person has' : 'people have'} already guessed today's card
    </p>
  )
}

export default TodayWinnersCount

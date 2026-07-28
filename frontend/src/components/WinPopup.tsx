import './WinPopup.css'

interface WinPopupProps {
  guessCount: number
}

function WinPopup({ guessCount }: WinPopupProps) {
  return (
    <div className="win-popup">
      You guessed the card correctly in {guessCount} guess{guessCount === 1 ? '' : 'es'}!
    </div>
  )
}

export default WinPopup

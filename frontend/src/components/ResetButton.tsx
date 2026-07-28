import './ResetButton.css'

interface ResetButtonProps {
  onReset: () => void
}

function ResetButton({ onReset }: ResetButtonProps) {
  return (
    <button className="reset-button" onClick={onReset}>
      Reset
    </button>
  )
}

export default ResetButton

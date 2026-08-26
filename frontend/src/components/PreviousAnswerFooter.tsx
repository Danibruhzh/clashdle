import './PreviousAnswerFooter.css'

interface PreviousAnswerFooterProps {
  cardName: string | null
}

function PreviousAnswerFooter({ cardName }: PreviousAnswerFooterProps) {
  if (!cardName) return null

  return <p className="previous-answer-footer">Yesterday's card was {cardName}</p>
}

export default PreviousAnswerFooter

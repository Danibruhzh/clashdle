import allCardsJson from './all_cards.json'

export type StatValue = string | Record<string, string>
export type CardStats = Record<string, StatValue>

const allCards = allCardsJson as Record<string, CardStats>

function hasAllStatsMissing(stats: CardStats): boolean {
  return Object.entries(stats)
    .filter(([key]) => key !== '__NOTE__')
    .every(([, value]) => value === 'N/A')
}

export const cards = Object.fromEntries(
  Object.entries(allCards).filter(([, stats]) => !hasAllStatsMissing(stats))
)
export const cardNames = Object.keys(cards)

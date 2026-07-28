import allCardsJson from './all_cards.json'

export type StatValue = string | Record<string, string>
export type CardStats = Record<string, StatValue>

export const cards = allCardsJson as Record<string, CardStats>
export const cardNames = Object.keys(cards)

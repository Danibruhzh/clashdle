import type { StatValue } from '../data/cards'

export type StatComparison = 'match' | 'mismatch' | 'higher' | 'lower'

const NUMERIC_CATEGORIES = new Set([
  'Cost',
  'Hitpoints',
  'Damage',
  'Damage Per Second',
  'Special Damage',
])

// Mirrors organize_cards.py's categorize(): variant keys like
// "Damage (Stage 3)" or "Rascal Girl Target" still belong to a base category.
export function statCategory(key: string): string {
  if (key.includes('Special Damage')) return 'Special Damage'
  if (key.includes('Damage Per Second')) return 'Damage Per Second'
  if (key.includes('Damage')) return 'Damage'
  if (key.includes('Cost')) return 'Cost'
  if (key.includes('Type')) return 'Type'
  if (key.includes('Rarity')) return 'Rarity'
  if (key.includes('Target')) return 'Target'
  if (key.includes('Hitpoints')) return 'Hitpoints'
  return key
}

function extractValueString(value: StatValue): string {
  return typeof value === 'string' ? value : Object.values(value)[0]
}

function parseStatNumber(value: StatValue): number | null {
  const match = extractValueString(value).match(/^\d+/)
  return match ? Number(match[0]) : null
}

export function compareStat(category: string, secretValue: StatValue, guessValue: StatValue): StatComparison {
  if (NUMERIC_CATEGORIES.has(category)) {
    const secretNumber = parseStatNumber(secretValue)
    const guessNumber = parseStatNumber(guessValue)

    if (secretNumber === null || guessNumber === null) {
      return secretNumber === guessNumber ? 'match' : 'mismatch'
    }

    if (secretNumber === guessNumber) {
      return 'match'
    }

    return secretNumber > guessNumber ? 'higher' : 'lower'
  }

  return extractValueString(secretValue) === extractValueString(guessValue)
    ? 'match'
    : 'mismatch'
}

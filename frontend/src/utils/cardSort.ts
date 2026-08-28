import { cards } from '../data/cards'
import type { StatValue } from '../data/cards'

export type SortOption =
  | 'name-asc'
  | 'elixir-asc'
  | 'elixir-desc'
  | 'hitpoints-asc'
  | 'hitpoints-desc'
  | 'damage-asc'
  | 'damage-desc'
  | 'rarity-asc'
  | 'rarity-desc'

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'name-asc', label: 'Name (A–Z)' },
  { value: 'elixir-asc', label: 'Elixir (Low–High)' },
  { value: 'elixir-desc', label: 'Elixir (High–Low)' },
  { value: 'hitpoints-asc', label: 'Hitpoints (Low–High)' },
  { value: 'hitpoints-desc', label: 'Hitpoints (High–Low)' },
  { value: 'damage-asc', label: 'Damage (Low–High)' },
  { value: 'damage-desc', label: 'Damage (High–Low)' },
  { value: 'rarity-asc', label: 'Rarity (Common–Champion)' },
  { value: 'rarity-desc', label: 'Rarity (Champion–Common)' },
]

// Mirrors services/game.py's RARITY_FIELDS ordering.
const RARITY_RANK: Record<string, number> = {
  Common: 1,
  Rare: 2,
  Epic: 3,
  Legendary: 4,
  Champion: 5,
}

// Mirrors CardDisplay.tsx's renderStatValue unwrapping: a stat can be a
// plain string or a {label: value} dict (multi-stage/sub-entity cards, e.g.
// Evolution Inferno Dragon's Damage: {"Stage 4": "844"}) — take whichever
// string is actually there before parsing a number out of it.
function extractValueString(value: StatValue | undefined): string | undefined {
  if (value === undefined) return undefined
  return typeof value === 'string' ? value : Object.values(value)[0]
}

function extractNumber(value: StatValue | undefined): number | null {
  const text = extractValueString(value)
  if (!text) return null
  const match = text.match(/^\d+/)
  return match ? Number(match[0]) : null
}

function rarityRank(name: string): number | null {
  const text = extractValueString(cards[name]?.Rarity)
  return text ? (RARITY_RANK[text] ?? null) : null
}

function statNumber(name: string, category: 'Cost' | 'Hitpoints' | 'Damage'): number | null {
  return extractNumber(cards[name]?.[category])
}

// Cards missing a value for the chosen stat always sort after cards that
// have one, regardless of direction — never lets a "no data" card look like
// the strongest or weakest. Ties (including two missing values) fall back
// to alphabetical, so the order stays stable and predictable either way.
function compareByStat(
  a: string,
  b: string,
  getValue: (name: string) => number | null,
  direction: 1 | -1
): number {
  const aValue = getValue(a)
  const bValue = getValue(b)
  if (aValue === null && bValue === null) return a.localeCompare(b)
  if (aValue === null) return 1
  if (bValue === null) return -1
  return (aValue - bValue) * direction || a.localeCompare(b)
}

export function sortCardNames(names: string[], sortOption: SortOption): string[] {
  const sorted = [...names]
  switch (sortOption) {
    case 'elixir-asc':
      return sorted.sort((a, b) => compareByStat(a, b, (n) => statNumber(n, 'Cost'), 1))
    case 'elixir-desc':
      return sorted.sort((a, b) => compareByStat(a, b, (n) => statNumber(n, 'Cost'), -1))
    case 'hitpoints-asc':
      return sorted.sort((a, b) => compareByStat(a, b, (n) => statNumber(n, 'Hitpoints'), 1))
    case 'hitpoints-desc':
      return sorted.sort((a, b) => compareByStat(a, b, (n) => statNumber(n, 'Hitpoints'), -1))
    case 'damage-asc':
      return sorted.sort((a, b) => compareByStat(a, b, (n) => statNumber(n, 'Damage'), 1))
    case 'damage-desc':
      return sorted.sort((a, b) => compareByStat(a, b, (n) => statNumber(n, 'Damage'), -1))
    case 'rarity-asc':
      return sorted.sort((a, b) => compareByStat(a, b, rarityRank, 1))
    case 'rarity-desc':
      return sorted.sort((a, b) => compareByStat(a, b, rarityRank, -1))
    case 'name-asc':
    default:
      return sorted.sort((a, b) => a.localeCompare(b))
  }
}

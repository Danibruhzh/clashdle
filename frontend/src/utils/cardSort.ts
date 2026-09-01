import { cards } from '../data/cards'
import type { StatValue } from '../data/cards'

export type SortField = 'name' | 'elixir' | 'hitpoints' | 'damage' | 'dps' | 'rarity'
export type SortDirection = 'asc' | 'desc'

export const SORT_FIELDS: { value: SortField; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'elixir', label: 'Elixir' },
  { value: 'hitpoints', label: 'Hitpoints' },
  { value: 'damage', label: 'Damage' },
  { value: 'dps', label: 'Damage Per Second' },
  { value: 'rarity', label: 'Rarity' },
]

// Mirrors services/game.py's RARITY_FIELDS ordering. Exported for
// cardCategories.ts's rarity grouping, so both stay in sync with one
// definition.
export const RARITY_RANK: Record<string, number> = {
  Common: 1,
  Rare: 2,
  Epic: 3,
  Legendary: 4,
  Champion: 5,
}

// Mirrors CardDisplay.tsx's renderStatValue unwrapping: a stat can be a
// plain string or a {label: value} dict (multi-stage/sub-entity cards, e.g.
// Evolution Inferno Dragon's Damage: {"Stage 4": "844"}) — take whichever
// string is actually there before parsing a number out of it. Exported for
// cardCategories.ts, so both read categorical fields (Type, Target, Rarity)
// the same way.
export function extractValueString(value: StatValue | undefined): string | undefined {
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

// A card's own name for sorting purposes, plus how it ranks against its own
// base/Evolution/Hero siblings — e.g. "Evolution Valkyrie" strips down to
// "Valkyrie" (so it alphabetizes next to the base card instead of off under
// "E"), variantRank 1 keeps it right after the base card (0) and before the
// Hero version (2). A card with no such prefix, or a prefixed name with no
// matching base card, is its own group of one.
function nameSortKey(name: string): { base: string; variantRank: number } {
  if (name.startsWith('Evolution ')) return { base: name.slice('Evolution '.length), variantRank: 1 }
  if (name.startsWith('Hero ')) return { base: name.slice('Hero '.length), variantRank: 2 }
  return { base: name, variantRank: 0 }
}

// The one place "alphabetical" actually means anything in this file — used
// directly for the Name field, and as every other field's tie-break (two
// cards with the same Elixir/Hitpoints/etc., or both missing a value). A
// card's rank among its own base/Evo/Hero siblings never flips with
// direction, so a group always reads base → Evo → Hero either way.
function compareNames(a: string, b: string, direction: 1 | -1): number {
  const keyA = nameSortKey(a)
  const keyB = nameSortKey(b)
  return keyA.base.localeCompare(keyB.base) * direction || keyA.variantRank - keyB.variantRank
}

function statNumber(
  name: string,
  category: 'Cost' | 'Hitpoints' | 'Damage' | 'Damage Per Second'
): number | null {
  return extractNumber(cards[name]?.[category])
}

// Cards missing a value for the chosen stat always sort after cards that
// have one, regardless of direction — never lets a "no data" card look like
// the strongest or weakest. Ties (including two missing values) fall back
// to compareNames, so the order stays stable and predictable either way —
// and still groups a card with its own Evo/Hero siblings even when this is
// only a tie-break, not the primary sort.
function compareByStat(
  a: string,
  b: string,
  getValue: (name: string) => number | null,
  direction: 1 | -1
): number {
  const aValue = getValue(a)
  const bValue = getValue(b)
  if (aValue === null && bValue === null) return compareNames(a, b, 1)
  if (aValue === null) return 1
  if (bValue === null) return -1
  return (aValue - bValue) * direction || compareNames(a, b, 1)
}

export function sortCardNames(names: string[], field: SortField, direction: SortDirection): string[] {
  const sorted = [...names]
  const dir = direction === 'asc' ? 1 : -1

  switch (field) {
    case 'name':
      return sorted.sort((a, b) => compareNames(a, b, dir))
    case 'elixir':
      return sorted.sort((a, b) => compareByStat(a, b, (n) => statNumber(n, 'Cost'), dir))
    case 'hitpoints':
      return sorted.sort((a, b) => compareByStat(a, b, (n) => statNumber(n, 'Hitpoints'), dir))
    case 'damage':
      return sorted.sort((a, b) => compareByStat(a, b, (n) => statNumber(n, 'Damage'), dir))
    case 'dps':
      return sorted.sort((a, b) => compareByStat(a, b, (n) => statNumber(n, 'Damage Per Second'), dir))
    case 'rarity':
      return sorted.sort((a, b) => compareByStat(a, b, rarityRank, dir))
  }
}

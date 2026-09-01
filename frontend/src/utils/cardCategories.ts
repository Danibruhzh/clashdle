import { cards } from '../data/cards'
import { extractValueString, RARITY_RANK } from './cardSort'

export type CategoryDimension = 'elixir' | 'type' | 'rarity' | 'target'

export const CATEGORY_DIMENSIONS: { value: CategoryDimension; label: string }[] = [
  { value: 'elixir', label: 'Elixir Cost' },
  { value: 'type', label: 'Type' },
  { value: 'rarity', label: 'Rarity' },
  { value: 'target', label: 'Target' },
]

export interface Category {
  label: string
  names: string[]
}

// Clone and Rage are the only two cards that target friendly troops rather
// than the enemy's — their raw Target values ("Friendly Troops" and
// "Friendly Troops & Buildings") are different strings, which would
// otherwise land them in two separate one-card buckets instead of the one
// meaningful "Friendly" category a player would actually want to browse by.
const FRIENDLY_TARGET_CARDS = new Set(['Clone', 'Rage'])

const MISSING_LABEL = 'N/A'

function groupBy(names: string[], keyOf: (name: string) => string): Map<string, string[]> {
  const groups = new Map<string, string[]>()
  for (const name of names) {
    const key = keyOf(name)
    const group = groups.get(key)
    if (group) group.push(name)
    else groups.set(key, [name])
  }
  return groups
}

// Ranks buckets by their position in a fixed order list (falling back to
// alphabetical for anything unlisted, appended after every listed label) —
// used where a meaningful fixed order exists (Type, Target), as opposed to
// elixirCategories/rarityCategories's own numeric/rank-based ordering.
function sortByOrder(groups: Map<string, string[]>, order: string[]): Category[] {
  const rank = new Map(order.map((label, i) => [label, i]))
  return [...groups.entries()]
    .sort(([a], [b]) => {
      const rankA = rank.get(a) ?? Infinity
      const rankB = rank.get(b) ?? Infinity
      return rankA !== rankB ? rankA - rankB : a.localeCompare(b)
    })
    .map(([label, names]) => ({ label, names }))
}

const TYPE_ORDER = ['Troop', 'Spell', 'Building', 'Tower Troop']
const TARGET_ORDER = ['Ground', 'Air & Ground', 'Buildings', 'Friendly', MISSING_LABEL]

function elixirCategories(names: string[]): Category[] {
  const groups = groupBy(names, (name) => extractValueString(cards[name]?.Cost) ?? MISSING_LABEL)
  return [...groups.entries()]
    .sort(([a], [b]) => {
      if (a === MISSING_LABEL) return 1
      if (b === MISSING_LABEL) return -1
      return Number(a) - Number(b)
    })
    .map(([cost, groupNames]) => ({
      label: cost === MISSING_LABEL ? 'Unknown Cost' : `${cost} Elixir`,
      names: groupNames,
    }))
}

function typeCategories(names: string[]): Category[] {
  return sortByOrder(
    groupBy(names, (name) => extractValueString(cards[name]?.Type) ?? MISSING_LABEL),
    TYPE_ORDER
  )
}

function rarityCategories(names: string[]): Category[] {
  const groups = groupBy(names, (name) => extractValueString(cards[name]?.Rarity) ?? MISSING_LABEL)
  return [...groups.entries()]
    .sort(([a], [b]) => {
      const rankA = RARITY_RANK[a] ?? Infinity
      const rankB = RARITY_RANK[b] ?? Infinity
      return rankA - rankB
    })
    .map(([rarity, groupNames]) => ({ label: rarity, names: groupNames }))
}

function targetCategories(names: string[]): Category[] {
  const groups = groupBy(names, (name) => {
    if (FRIENDLY_TARGET_CARDS.has(name)) return 'Friendly'
    const target = extractValueString(cards[name]?.Target) ?? MISSING_LABEL
    // Pre-existing scrape inconsistency: Rune Giant is "Building" (singular)
    // while every other building-targeting card is "Buildings" (plural) —
    // same real category, so they're folded into one bucket here.
    return target === 'Building' ? 'Buildings' : target
  })
  return sortByOrder(groups, TARGET_ORDER)
}

// Splits a card list into visually separate categories along one dimension.
// A card only ever belongs to one category — including the Target
// dimension's Clone/Rage special case above.
export function categorizeCards(names: string[], dimension: CategoryDimension): Category[] {
  switch (dimension) {
    case 'elixir':
      return elixirCategories(names)
    case 'type':
      return typeCategories(names)
    case 'rarity':
      return rarityCategories(names)
    case 'target':
      return targetCategories(names)
  }
}

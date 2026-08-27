// Mirrors organize_cards.py's categorize(): variant keys like
// "Damage (Stage 3)" or "Rascal Girl Target" still belong to a base category.
// Used to map a card's raw stat keys to the category the backend's
// comparisons are keyed by (see services/game.py's FIELD_TO_STAT_NAME) — the
// actual comparison logic lives server-side now, this is just for rendering.
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

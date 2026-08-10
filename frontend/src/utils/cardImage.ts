export function getCardImagePath(cardName: string): string {
  const normalized = cardName.replace(/\./g, '')
  return `/card_images_trimmed/${normalized}.png`
}

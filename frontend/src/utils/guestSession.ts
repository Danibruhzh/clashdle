// Identifies this browser's daily guesses without using a cookie. Safari can
// block cross-site cookies, which made refresh restore unreliable for some iOS
// players. A browser-generated id in a plain header avoids that problem.

const GUEST_SESSION_KEY = 'clashdle-guest-session-id'

function generateId(): string {
  if ('randomUUID' in crypto) return crypto.randomUUID()
  // Rare fallback for browsers without crypto.randomUUID. This only needs to
  // avoid accidental collisions; it is not a secret.
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

let cachedId: string | null = null

export function getGuestSessionId(): string {
  if (cachedId) return cachedId

  try {
    const existing = localStorage.getItem(GUEST_SESSION_KEY)
    if (existing) {
      cachedId = existing
      return existing
    }
    const created = generateId()
    localStorage.setItem(GUEST_SESSION_KEY, created)
    cachedId = created
    return created
  } catch {
    // If localStorage is unavailable, use an id for this page load only.
    // Refresh restore cannot work in that browser state.
    cachedId = generateId()
    return cachedId
  }
}

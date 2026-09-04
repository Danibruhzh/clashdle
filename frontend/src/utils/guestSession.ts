// Identifies "this browser's guesses today" to the backend without relying
// on a cookie. A cross-site cookie (frontend and backend are on different
// domains) gets silently blocked by Safari's Intelligent Tracking Prevention
// regardless of SameSite=None; Secure — which is why guesses stopped
// surviving a refresh for some iOS players even though the cookie was set
// correctly. A plain header carrying an id this browser generates and stores
// itself sidesteps that entirely: nothing for ITP to block, since it was
// never a cookie in the first place.

const GUEST_SESSION_KEY = 'clashdle-guest-session-id'

function generateId(): string {
  if ('randomUUID' in crypto) return crypto.randomUUID()
  // Fallback for the rare browser without crypto.randomUUID — this id never
  // needs to be cryptographically strong, just unique enough not to collide.
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
    // localStorage unavailable (private browsing, etc.) — fall back to an
    // id that only lives for this page load. Guesses won't survive a
    // refresh in that case, same as it would've been before this existed.
    cachedId = generateId()
    return cachedId
  }
}

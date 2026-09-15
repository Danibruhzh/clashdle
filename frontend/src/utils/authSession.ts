// Where a logged-in player's JWT lives on this browser. localStorage + a
// header (see api/auth.ts's Authorization: Bearer usage), not a cookie —
// same reasoning as utils/guestSession.ts: the frontend and backend are on
// different domains, and Safari's ITP silently blocks cross-site cookies
// regardless of SameSite=None; Secure. One consistent pattern for both.

const AUTH_TOKEN_KEY = 'clashdle-auth-token'
export const AUTH_SESSION_EVENT = 'clashdle-auth-session-change'

function notifyAuthSessionChange(): void {
  window.dispatchEvent(new Event(AUTH_SESSION_EVENT))
}

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAuthToken(token: string): void {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token)
  } catch {
    // Storage full/unavailable — login just won't persist past this page
    // load, same tradeoff as every other localStorage write in this app.
  }
  notifyAuthSessionChange()
}

export function clearAuthToken(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY)
  } catch {
    // Nothing to do if storage itself is unavailable.
  }
  notifyAuthSessionChange()
}

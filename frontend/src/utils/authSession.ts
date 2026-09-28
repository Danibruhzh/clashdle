// Logged-in sessions live in localStorage and travel as an Authorization
// header. We use the same pattern as guestSession.ts because Safari can block
// cross-site cookies when the frontend and backend are on different domains.

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
    // If storage is full or unavailable, login still works for this page load.
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

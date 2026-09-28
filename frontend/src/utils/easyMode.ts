// Persists Card Browser's Easy Mode toggle. The browser modal unmounts when it
// closes, so component state alone would reset the choice on every reopen.

const EASY_MODE_KEY = 'clashdle-easy-mode'

export function getEasyMode(): boolean {
  try {
    return localStorage.getItem(EASY_MODE_KEY) === 'true'
  } catch {
    // If localStorage is unavailable, default to off.
    return false
  }
}

export function setEasyMode(value: boolean): void {
  try {
    localStorage.setItem(EASY_MODE_KEY, String(value))
  } catch {
    // If storage is full or unavailable, the toggle just will not persist.
  }
}

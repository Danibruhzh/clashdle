// Whether Card Browser's Easy Mode toggle is on. CardBrowser fully unmounts
// when closed (App only renders it while showCardBrowser is true), so its
// own useState resets on every reopen — this persists the choice the same
// way streak.ts/guessHistogram.ts persist other guest-side preferences.

const EASY_MODE_KEY = 'clashdle-easy-mode'

export function getEasyMode(): boolean {
  try {
    return localStorage.getItem(EASY_MODE_KEY) === 'true'
  } catch {
    // localStorage unavailable (private browsing, etc.) — just default off.
    return false
  }
}

export function setEasyMode(value: boolean): void {
  try {
    localStorage.setItem(EASY_MODE_KEY, String(value))
  } catch {
    // Storage full/unavailable — the toggle just won't persist this time.
  }
}

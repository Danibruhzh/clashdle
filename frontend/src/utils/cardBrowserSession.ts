// Card Browser's Easy Mode category/sort selections, held in a plain module
// variable rather than localStorage — CardBrowser fully unmounts on close
// (see easyMode.ts), which would otherwise reset these back to their
// defaults every reopen. A module variable survives that remount (it's
// outside React state entirely) but still resets to the defaults on a real
// page reload/new tab, unlike the Easy Mode toggle itself, which is meant to
// stick around across sessions.

import type { SortDirection, SortField } from './cardSort'
import type { CategoryDimension } from './cardCategories'

export interface CardBrowserSession {
  categoryDimension: CategoryDimension
  sortField: SortField
  sortDirection: SortDirection
}

const DEFAULT_SESSION: CardBrowserSession = {
  categoryDimension: 'elixir',
  sortField: 'name',
  sortDirection: 'asc',
}

let session: CardBrowserSession = { ...DEFAULT_SESSION }

export function getCardBrowserSession(): CardBrowserSession {
  return session
}

export function updateCardBrowserSession(changes: Partial<CardBrowserSession>): void {
  session = { ...session, ...changes }
}

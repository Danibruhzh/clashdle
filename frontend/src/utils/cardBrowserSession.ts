// Card Browser's Easy Mode category and sort selections live in this module
// instead of localStorage. That keeps them around while the browser modal
// opens and closes, but still resets them on a real page reload.

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

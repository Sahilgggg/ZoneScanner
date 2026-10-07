// Scanner universes and the user's custom stock list. The index lists
// themselves come from the backend (official NSE lists) in real-data mode, or
// from the bundled copies in ../shared/universes.js in demo mode.

import { NIFTY_50, NIFTY_NEXT_50, normalizeSymbol } from '@shared/universes.js'

export const DEFAULT_CUSTOM_LIST = ['USHAMART', 'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'SBIN', 'TATASTEEL', 'ITC']

export const UNIVERSES = [
  { value: 'nifty50', label: 'NIFTY 50' },
  { value: 'nifty100', label: 'NIFTY 100' },
  { value: 'nifty500', label: 'NIFTY 500', needsRealData: true },
  { value: 'custom', label: 'Custom list' },
]

const CUSTOM_KEY = 'ds.customList'

export function parseSymbolList(text) {
  const seen = new Set()
  for (const part of text.split(/[\s,;]+/)) {
    const symbol = normalizeSymbol(part)
    if (symbol) seen.add(symbol)
  }
  return [...seen]
}

export function loadCustomList() {
  try {
    const saved = JSON.parse(localStorage.getItem(CUSTOM_KEY))
    if (Array.isArray(saved) && saved.length) return saved
  } catch {
    // storage unavailable or corrupt → fall back to the default list
  }
  return DEFAULT_CUSTOM_LIST
}

export function saveCustomList(symbols) {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(symbols))
  } catch {
    // ignore: the list still works for this session
  }
}

// Offline search suggestions (demo mode, or when the backend search fails).
export const ALL_SYMBOLS = [...new Set([...NIFTY_50, ...NIFTY_NEXT_50, ...DEFAULT_CUSTOM_LIST])].sort()

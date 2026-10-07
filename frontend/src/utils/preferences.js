// Small per-browser preferences (last timeframe, scanner filters, last stock)
// so choices survive switching pages and reloading. Stored in localStorage
// when available; falls back to memory for this session otherwise.

import { DEFAULT_SYMBOL, DEFAULT_TIMEFRAME, isValidTimeframe } from './constants.js'

const KEY = 'ds.prefs'

let prefs = {}
try {
  prefs = JSON.parse(localStorage.getItem(KEY)) ?? {}
} catch {
  prefs = {}
}

export function getPref(name, fallback) {
  return prefs[name] ?? fallback
}

export function setPref(name, value) {
  if (prefs[name] === value) return
  prefs = { ...prefs, [name]: value }
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs))
  } catch {
    // storage unavailable (private mode, blocked) → keep it in memory only
  }
}

// The timeframe last chosen on any page (shared by scanner and analyzer).
export function getPreferredTimeframe() {
  const saved = getPref('timeframe')
  return isValidTimeframe(saved) ? saved : DEFAULT_TIMEFRAME
}

// Scanner query string to restore (?u=…&cat=…&min=…), without the timeframe,
// which always comes from the shared preference above.
export function scannerPath() {
  return `/scanner${getPref('scannerSearch', '')}`
}

export function analyzerPath() {
  return `/analyzer/${encodeURIComponent(getPref('lastSymbol', DEFAULT_SYMBOL))}`
}

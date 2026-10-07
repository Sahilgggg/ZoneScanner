// Multi-stock scanner: runs the same engine over a list of symbols on every
// timeframe and groups the results into demand / supply categories.

import { TIMEFRAMES } from '../utils/constants.js'
import { DATA_SOURCE, getScanSummary } from './marketData.js'

export const CATEGORIES = [
  { id: 'demand-new', side: 'demand', status: 'FORMED', label: 'New Demand Zones' },
  { id: 'demand-approaching', side: 'demand', status: 'APPROACHING', label: 'Approaching Demand' },
  { id: 'demand-in', side: 'demand', status: 'IN_ZONE', label: 'In Demand Zone' },
  { id: 'demand-reacting', side: 'demand', status: 'REACTING', label: 'Reacting From Demand' },
  { id: 'demand-weakening', side: 'demand', status: 'WEAKENING', label: 'Weakening Demand' },
  { id: 'demand-broken', side: 'demand', status: 'BROKEN', label: 'Demand Broken' },
  { id: 'supply-new', side: 'supply', status: 'FORMED', label: 'New Supply Zones' },
  { id: 'supply-approaching', side: 'supply', status: 'APPROACHING', label: 'Approaching Supply' },
  { id: 'supply-in', side: 'supply', status: 'IN_ZONE', label: 'In Supply Zone' },
  { id: 'supply-reacting', side: 'supply', status: 'REACTING', label: 'Reacting From Supply' },
  { id: 'supply-weakening', side: 'supply', status: 'WEAKENING', label: 'Weakening Supply' },
  { id: 'supply-broken', side: 'supply', status: 'BROKEN', label: 'Supply Broken' },
]

export function getCategory(id) {
  return CATEGORIES.find((c) => c.id === id)
}

const yieldToBrowser = () => new Promise((resolve) => setTimeout(resolve, 0))

// With real data the backend does the work, so several stocks are requested
// at once. Demo data is computed in the browser, one stock at a time.
const CONCURRENCY = DATA_SOURCE === 'api' ? 6 : 1

// Returns { results: [{ symbol, quote, timeframes: { daily: [zones], … } }], errors, scannedAt }
export async function runScan(symbols, { onProgress, signal } = {}) {
  const results = []
  const errors = []
  let nextIndex = 0
  let done = 0

  async function worker() {
    while (nextIndex < symbols.length) {
      if (signal?.aborted) throw new DOMException('Scan cancelled', 'AbortError')
      const symbol = symbols[nextIndex++]
      try {
        results.push(await getScanSummary(symbol, { signal }))
      } catch (error) {
        if (signal?.aborted || error.name === 'AbortError' || error.name === 'CanceledError') {
          throw new DOMException('Scan cancelled', 'AbortError')
        }
        errors.push({ symbol, message: error.message })
      }
      onProgress?.(++done, symbols.length)
      if (CONCURRENCY === 1 && done % 4 === 0) await yieldToBrowser()
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, symbols.length) }, worker))
  return { results, errors, scannedAt: new Date() }
}

// For one timeframe: { [categoryId]: rows[] }. A stock appears in a category
// once, with its strongest matching zone (nearest for "approaching").
export function categorize(scan, timeframe, { minStrength = 0 } = {}) {
  const buckets = Object.fromEntries(CATEGORIES.map((c) => [c.id, []]))
  if (!scan) return buckets

  for (const { symbol, quote, timeframes } of scan.results) {
    const zones = (timeframes[timeframe] ?? []).filter((z) => z.strength >= minStrength)
    for (const category of CATEGORIES) {
      const matches = zones.filter((z) => z.side === category.side && z.status === category.status)
      if (!matches.length) continue
      const best = matches.reduce((a, b) => {
        if (category.status === 'APPROACHING') return Math.abs(b.distancePct) < Math.abs(a.distancePct) ? b : a
        return b.strength > a.strength ? b : a
      })
      buckets[category.id].push({ symbol, price: quote.price, changePct: quote.changePct, timeframe, zone: best })
    }
  }
  return buckets
}

// Counts per category for every timeframe: { daily: { 'demand-new': 3, … }, … }
export function countAllTimeframes(scan, options) {
  const out = {}
  for (const { value } of TIMEFRAMES) {
    const buckets = categorize(scan, value, options)
    out[value] = Object.fromEntries(Object.entries(buckets).map(([id, rows]) => [id, rows.length]))
  }
  return out
}

// Sorting for the results table.
export const SORT_COLUMNS = {
  symbol: (r) => r.symbol,
  price: (r) => r.price,
  changePct: (r) => r.changePct,
  zone: (r) => r.zone.zoneLow,
  distance: (r) => Math.abs(r.zone.distancePct),
  strength: (r) => r.zone.strength,
  touches: (r) => r.zone.touches,
}

export function sortRows(rows, { key, dir }) {
  const get = SORT_COLUMNS[key] ?? SORT_COLUMNS.strength
  const factor = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const va = get(a)
    const vb = get(b)
    if (typeof va === 'string') return va.localeCompare(vb) * factor
    return (va - vb) * factor
  })
}

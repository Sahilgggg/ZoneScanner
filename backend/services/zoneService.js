// Demand/supply zone analysis on real candles. Detection, status and scoring
// all come from the shared engine (../../shared/engine), the same code the
// frontend runs, so results are identical on both sides.

import { analyzeCandles } from '../../shared/engine/analyzeStock.js'
import { aggregateCandles } from '../../shared/engine/candles.js'
import { buildQuote, buildScanSummary } from '../../shared/engine/summary.js'
import { TIMEFRAME_KEYS } from '../../shared/timeframes.js'
import { isDbConnected } from '../config/db.js'
import { env } from '../config/env.js'
import { ScanSummary } from '../models/ScanSummary.js'
import { isFresh } from '../utils/marketHours.js'
import { getDailySeries } from './candleService.js'
import { getSectorOf } from './sectorService.js'

export async function getQuote(symbol) {
  const { candles, name } = await getDailySeries(symbol)
  return { symbol, name, ...buildQuote(candles) }
}

// Zones for one timeframe (without the candles, to keep the response small).
export async function getZones(symbol, timeframe) {
  const { candles: daily, name } = await getDailySeries(symbol)
  const { candles, ...analysis } = analyzeCandles(aggregateCandles(daily, timeframe))
  return { symbol, name, timeframe, quote: buildQuote(daily), candleCount: candles.length, ...analysis }
}

export async function getMultiTimeframe(symbol) {
  const { candles: daily } = await getDailySeries(symbol)
  return TIMEFRAME_KEYS.map((timeframe) => {
    const { demand, supply } = analyzeCandles(aggregateCandles(daily, timeframe))
    return { timeframe, demand, supply }
  })
}

// Scanner summaries are a few KB each, so all of them stay in RAM (and in
// MongoDB) even when the full histories (≈0.5 MB each) have been evicted.
// A freshly started server can then answer a NIFTY 500 scan quickly.
const summaryCache = new Map() // symbol → { summary, computedAt }

async function loadSummary(symbol) {
  const hit = summaryCache.get(symbol)
  if (hit) return hit
  if (!isDbConnected()) return null
  const doc = await ScanSummary.findOne({ symbol }, { summary: 1, computedAt: 1 }).lean().catch(() => null)
  return doc ? { summary: doc.summary, computedAt: doc.computedAt } : null
}

// Compact all-timeframe result used by the scanner.
export async function getScanSummary(symbol) {
  const cached = await loadSummary(symbol)
  if (cached && isFresh(cached.computedAt, env.cacheTtlMinutes, new Date(), cached.summary?.quote?.date)) {
    summaryCache.set(symbol, cached)
    return cached.summary
  }

  const [{ candles, name }, sector] = await Promise.all([getDailySeries(symbol), getSectorOf(symbol)])
  const entry = { summary: { name, sector, ...buildScanSummary(symbol, candles) }, computedAt: new Date() }
  summaryCache.set(symbol, entry)
  if (isDbConnected()) {
    ScanSummary.updateOne({ symbol }, { $set: entry }, { upsert: true }).catch((error) =>
      console.warn(`Could not cache summary for ${symbol}: ${error.message}`),
    )
  }
  return entry.summary
}

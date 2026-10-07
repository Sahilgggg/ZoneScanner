// Compact per-stock results used by the scanner: a quote plus the slim zones
// of every timeframe. Computed on the backend (real data) or in the browser
// (demo data) from the same daily candles.

import { TIMEFRAME_KEYS } from '../timeframes.js'
import { analyzeCandles } from './analyzeStock.js'
import { aggregateCandles } from './candles.js'

export function buildQuote(daily) {
  const last = daily[daily.length - 1]
  const prev = daily[daily.length - 2] ?? last
  return {
    price: last.close,
    change: last.close - prev.close,
    changePct: prev.close ? ((last.close - prev.close) / prev.close) * 100 : 0,
    volume: last.volume,
    date: last.time,
  }
}

export function slimZone(z) {
  return {
    id: z.id,
    side: z.side,
    zoneHigh: z.zoneHigh,
    zoneLow: z.zoneLow,
    formationDate: z.formationDate,
    pattern: z.pattern,
    strength: z.strength,
    fresh: z.fresh,
    touches: z.touches,
    status: z.status,
    distancePct: z.distancePct,
    tags: z.tags,
  }
}

export function buildScanSummary(symbol, daily) {
  const timeframes = {}
  for (const tf of TIMEFRAME_KEYS) {
    timeframes[tf] = analyzeCandles(aggregateCandles(daily, tf)).zones.map(slimZone)
  }
  return { symbol, quote: buildQuote(daily), timeframes }
}

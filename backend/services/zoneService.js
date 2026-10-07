// Demand/supply zone analysis on real candles. Detection, status and scoring
// all come from the shared engine (../../shared/engine), the same code the
// frontend runs, so results are identical on both sides.

import { analyzeCandles } from '../../shared/engine/analyzeStock.js'
import { aggregateCandles } from '../../shared/engine/candles.js'
import { buildQuote, buildScanSummary } from '../../shared/engine/summary.js'
import { TIMEFRAME_KEYS } from '../../shared/timeframes.js'
import { getDailySeries } from './candleService.js'

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

// Compact all-timeframe result used by the scanner.
export async function getScanSummary(symbol) {
  const { candles, name } = await getDailySeries(symbol)
  return { name, ...buildScanSummary(symbol, candles) }
}

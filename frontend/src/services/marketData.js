// Single place the UI gets market data and zone analysis from.
//
// DATA SOURCE (frontend/.env, restart `npm run dev` after changing):
//   VITE_DATA_SOURCE=api  → real NSE data from the Express backend (default)
//   VITE_DATA_SOURCE=demo → synthetic candles generated in the browser
//
// Zone analysis always uses the shared engine (../shared/engine), the same
// code the backend runs.

import { analyzeCandles } from '@shared/engine/analyzeStock.js'
import { aggregateCandles } from '@shared/engine/candles.js'
import { buildQuote, buildScanSummary } from '@shared/engine/summary.js'
import { NIFTY_50, NIFTY_NEXT_50 } from '@shared/universes.js'
import { generateDailyCandles } from '../data/demoMarket.js'
import { TIMEFRAMES } from '../utils/constants.js'
import * as api from './api.js'

export const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE === 'demo' ? 'demo' : 'api'

const dailyCache = new Map() // symbol → { candles, name, loadedAt }
const analysisCache = new Map()
const ANALYSIS_CACHE_LIMIT = 30
const CLIENT_CACHE_MS = 5 * 60000 // the backend has its own cache; keep the browser copy short

function remember(cache, key, value, limit) {
  cache.set(key, value)
  if (limit && cache.size > limit) cache.delete(cache.keys().next().value)
}

async function getDailySeries(symbol, { signal } = {}) {
  const cached = dailyCache.get(symbol)
  if (cached && (DATA_SOURCE === 'demo' || Date.now() - cached.loadedAt < CLIENT_CACHE_MS)) return cached

  let series
  if (DATA_SOURCE === 'api') {
    const data = await api.getCandles(symbol, 'daily', { signal })
    series = { candles: data.candles, name: data.name, loadedAt: Date.now() }
  } else {
    series = { candles: generateDailyCandles(symbol), name: null, loadedAt: Date.now() }
  }
  if (!series.candles?.length) throw new Error(`No price data found for ${symbol}.`)
  remember(dailyCache, symbol, series, 40)
  return series
}

// Full analysis (candles + zones) for one symbol and timeframe.
export async function getAnalysis(symbol, timeframe, options) {
  const series = await getDailySeries(symbol, options)
  const key = `${symbol}|${timeframe}|${series.loadedAt}`
  if (analysisCache.has(key)) return analysisCache.get(key)

  const analysis = {
    symbol,
    name: series.name,
    timeframe,
    quote: buildQuote(series.candles),
    ...analyzeCandles(aggregateCandles(series.candles, timeframe)),
  }
  remember(analysisCache, key, analysis, ANALYSIS_CACHE_LIMIT)
  return analysis
}

// Headline demand + supply zone for every timeframe.
export async function getMultiTimeframe(symbol, options) {
  const { candles } = await getDailySeries(symbol, options)
  return TIMEFRAMES.map(({ value }) => {
    const { demand, supply } = analyzeCandles(aggregateCandles(candles, value))
    return { timeframe: value, demand, supply }
  })
}

// Compact all-timeframe result for the scanner. With real data the backend
// computes it, so the browser never downloads 500 full price histories.
export async function getScanSummary(symbol, options) {
  if (DATA_SOURCE === 'api') return api.getSummary(symbol, options)
  return buildScanSummary(symbol, generateDailyCandles(symbol))
}

// Symbols of an index. Real mode uses NSE's official list via the backend.
export async function getUniverseSymbols(universe, options) {
  if (DATA_SOURCE === 'api') {
    const data = await api.getUniverse(universe, options)
    return { symbols: data.symbols, source: data.source }
  }
  if (universe === 'nifty50') return { symbols: NIFTY_50, source: 'bundled' }
  if (universe === 'nifty100') return { symbols: [...NIFTY_50, ...NIFTY_NEXT_50], source: 'bundled' }
  throw new Error('NIFTY 500 needs real data (VITE_DATA_SOURCE=api).')
}

import { normalizeSymbol, SYMBOL_PATTERN } from '../../shared/universes.js'
import { isValidTimeframe, TIMEFRAME_KEYS } from '../../shared/timeframes.js'
import { getCandles, getDailySeries } from '../services/candleService.js'
import { searchStocks } from '../services/indexService.js'
import { getMultiTimeframe, getQuote, getScanSummary, getZones } from '../services/zoneService.js'
import { badRequest } from '../utils/httpError.js'
import { buildQuote } from '../../shared/engine/summary.js'

function readSymbol(req) {
  const symbol = normalizeSymbol(req.params.symbol)
  if (!SYMBOL_PATTERN.test(symbol)) throw badRequest(`Invalid symbol "${req.params.symbol}".`)
  return symbol
}

function readTimeframe(req) {
  const timeframe = req.query.timeframe ?? 'daily'
  if (!isValidTimeframe(timeframe)) {
    throw badRequest(`Invalid timeframe "${timeframe}". Use one of: ${TIMEFRAME_KEYS.join(', ')}.`)
  }
  return timeframe
}

// GET /api/stocks/search?q=usha
export async function search(req, res) {
  res.json(await searchStocks(String(req.query.q ?? '')))
}

// GET /api/stocks/:symbol/candles?timeframe=weekly
export async function candles(req, res) {
  const symbol = readSymbol(req)
  const timeframe = readTimeframe(req)
  const [series, list] = await Promise.all([getDailySeries(symbol), getCandles(symbol, timeframe)])
  res.json({ symbol, name: series.name, timeframe, quote: buildQuote(series.candles), candles: list })
}

// GET /api/stocks/:symbol/quote
export async function quote(req, res) {
  res.json(await getQuote(readSymbol(req)))
}

// GET /api/stocks/:symbol/zones?timeframe=daily
export async function zones(req, res) {
  res.json(await getZones(readSymbol(req), readTimeframe(req)))
}

// GET /api/stocks/:symbol/multi-timeframe
export async function multiTimeframe(req, res) {
  res.json(await getMultiTimeframe(readSymbol(req)))
}

// GET /api/stocks/:symbol/summary — scanner result for all timeframes
export async function summary(req, res) {
  res.json(await getScanSummary(readSymbol(req)))
}

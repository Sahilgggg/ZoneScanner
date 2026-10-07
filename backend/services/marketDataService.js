// Downloads NSE daily candles from Yahoo Finance's public chart endpoint
// (NSE symbols use the ".NS" suffix there). Prices are split-adjusted, not
// dividend-adjusted, and the latest candle can be ~15 minutes delayed.

import { env } from '../config/env.js'
import { badGateway, notFound } from '../utils/httpError.js'
import { createLimiter, sleep } from '../utils/limiter.js'

const BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart'
const IST_OFFSET_SECONDS = 19800
const MAX_ATTEMPTS = 3

const limit = createLimiter(env.yahooConcurrency)

const round2 = (v) => Math.round(v * 100) / 100

function toYahooSymbol(symbol) {
  return `${encodeURIComponent(symbol)}.NS`
}

// Yahoo returns parallel arrays; turn them into candle objects, skipping
// empty days and fixing the occasional inconsistent old candle.
function parseChart(result) {
  const timestamps = result.timestamp ?? []
  const quote = result.indicators?.quote?.[0] ?? {}
  const byDay = new Map()
  for (let i = 0; i < timestamps.length; i++) {
    const open = quote.open?.[i]
    const high = quote.high?.[i]
    const low = quote.low?.[i]
    const close = quote.close?.[i]
    if ([open, high, low, close].some((v) => v === null || v === undefined || !Number.isFinite(v))) continue
    const time = new Date((timestamps[i] + IST_OFFSET_SECONDS) * 1000).toISOString().slice(0, 10)
    byDay.set(time, {
      time,
      open: round2(open),
      high: round2(Math.max(open, high, low, close)),
      low: round2(Math.min(open, high, low, close)),
      close: round2(close),
      volume: Math.max(0, Math.round(quote.volume?.[i] ?? 0)),
    })
  }
  return [...byDay.values()].sort((a, b) => (a.time < b.time ? -1 : 1))
}

async function requestChart(symbol, fromDate) {
  const period1 = fromDate ? Math.floor(new Date(`${fromDate}T00:00:00Z`).getTime() / 1000) : 0
  const period2 = Math.floor(Date.now() / 1000) + 86400
  const url = `${BASE_URL}/${toYahooSymbol(symbol)}?period1=${period1}&period2=${period2}&interval=1d&events=split`

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response
    try {
      response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (stock-scanner)', Accept: 'application/json' },
        signal: AbortSignal.timeout(20000),
      })
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) throw badGateway(`Could not reach Yahoo Finance: ${error.message}`)
      await sleep(500 * attempt)
      continue
    }

    if (response.status === 404) throw notFound(`No NSE price data found for "${symbol}".`)
    if (response.status === 429 || response.status >= 500) {
      if (attempt === MAX_ATTEMPTS) throw badGateway(`Yahoo Finance returned ${response.status} for ${symbol}.`)
      await sleep(1000 * attempt * attempt)
      continue
    }
    if (!response.ok) throw badGateway(`Yahoo Finance returned ${response.status} for ${symbol}.`)

    const body = await response.json()
    const result = body?.chart?.result?.[0]
    if (!result) {
      const description = body?.chart?.error?.description
      throw notFound(description ? `${symbol}: ${description}` : `No NSE price data found for "${symbol}".`)
    }
    return { candles: parseChart(result), name: result.meta?.longName || result.meta?.shortName || null }
  }
  throw badGateway(`Yahoo Finance request failed for ${symbol}.`)
}

// Full history when `fromDate` is omitted, otherwise candles from that day on.
export function fetchDailyCandles(symbol, fromDate) {
  return limit(() => requestChart(symbol, fromDate))
}

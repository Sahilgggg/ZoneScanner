// Cached access to daily candles.
//
//   memory cache → MongoDB → Yahoo Finance
//
// A cached series younger than CACHE_TTL_MINUTES is used as is. An older one
// is topped up by downloading only the last few days and merging them in.
// Concurrent requests for the same symbol share one download.

import { aggregateCandles } from '../../shared/engine/candles.js'
import { isDbConnected } from '../config/db.js'
import { env } from '../config/env.js'
import { PriceHistory } from '../models/PriceHistory.js'
import { isFresh as isMarketDataFresh } from '../utils/marketHours.js'
import { fetchDailyCandles } from './marketDataService.js'

const memory = new Map() // symbol → { candles, name, fetchedAt }, least recently used first
const inFlight = new Map() // symbol → Promise
const OVERLAP_DAYS = 10 // re-download a little history so revised candles get replaced

// Fresh within CACHE_TTL_MINUTES, or until the next session if fetched after the close.
const isFresh = (entry) =>
  Boolean(entry) && isMarketDataFresh(entry.fetchedAt, env.cacheTtlMinutes, new Date(), entry.candles?.at(-1)?.time)

// Small LRU so a full NIFTY 500 scan doesn't hold every history in RAM.
function remember(symbol, entry) {
  memory.delete(symbol)
  memory.set(symbol, entry)
  while (memory.size > env.memoryCacheSymbols) memory.delete(memory.keys().next().value)
}

function recall(symbol) {
  const entry = memory.get(symbol)
  if (entry) remember(symbol, entry)
  return entry
}

function daysBefore(time, days) {
  return new Date(new Date(`${time}T00:00:00Z`).getTime() - days * 86400000).toISOString().slice(0, 10)
}

function merge(existing, latest) {
  if (!latest.length) return existing
  const cutoff = latest[0].time
  return [...existing.filter((c) => c.time < cutoff), ...latest]
}

async function loadFromDb(symbol) {
  if (!isDbConnected()) return null
  const doc = await PriceHistory.findOne({ symbol }).lean()
  return doc ? { candles: doc.candles, name: doc.name, fetchedAt: doc.fetchedAt } : null
}

async function saveToDb(symbol, entry) {
  if (!isDbConnected()) return
  try {
    await PriceHistory.updateOne(
      { symbol },
      { $set: { candles: entry.candles, name: entry.name, fetchedAt: entry.fetchedAt, source: 'yahoo' } },
      { upsert: true },
    )
  } catch (error) {
    console.warn(`Could not cache ${symbol} in MongoDB: ${error.message}`)
  }
}

async function refresh(symbol) {
  const cached = recall(symbol) ?? (await loadFromDb(symbol))
  if (isFresh(cached)) {
    remember(symbol, cached)
    return cached
  }

  let entry
  if (cached?.candles?.length) {
    try {
      const fromDate = daysBefore(cached.candles[cached.candles.length - 1].time, OVERLAP_DAYS)
      const latest = await fetchDailyCandles(symbol, fromDate)
      entry = { candles: merge(cached.candles, latest.candles), name: latest.name ?? cached.name, fetchedAt: new Date() }
    } catch (error) {
      // Serve slightly old data rather than failing completely.
      console.warn(`Refresh failed for ${symbol}, serving cached data: ${error.message}`)
      remember(symbol, cached)
      return cached
    }
  } else {
    const full = await fetchDailyCandles(symbol)
    entry = { candles: full.candles, name: full.name, fetchedAt: new Date() }
  }

  remember(symbol, entry)
  await saveToDb(symbol, entry)
  return entry
}

export async function getDailySeries(symbol) {
  const hit = recall(symbol)
  if (isFresh(hit)) return hit
  if (!inFlight.has(symbol)) {
    inFlight.set(
      symbol,
      refresh(symbol).finally(() => inFlight.delete(symbol)),
    )
  }
  return inFlight.get(symbol)
}

export async function getCandles(symbol, timeframe) {
  const { candles } = await getDailySeries(symbol)
  return aggregateCandles(candles, timeframe)
}

export function cacheStats() {
  return { symbolsInMemory: memory.size, downloading: inFlight.size }
}

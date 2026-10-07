// Sector support.
//
// Each stock's sector is its NSE "Industry" from the official NIFTY 500 list.
// Yahoo only has history for a few official sector indices, so we build our
// own EQUAL-WEIGHTED sector index per industry from its NIFTY 500 members:
//
//   index_close(t) = index_close(t-1) × (1 + average member return on day t)
//
// with open/high/low built the same way from each member's open/high/low
// relative to its previous close. The shared zone engine then finds demand
// and supply zones on these sector indices exactly as it does for stocks.
//
// Building all sectors needs every NIFTY 500 history, so it runs in the
// background, is stored in MongoDB, and is rebuilt every SECTOR_TTL_HOURS.

import { analyzeCandles } from '../../shared/engine/analyzeStock.js'
import { aggregateCandles } from '../../shared/engine/candles.js'
import { buildQuote, slimZone } from '../../shared/engine/summary.js'
import { TIMEFRAME_KEYS } from '../../shared/timeframes.js'
import { isDbConnected } from '../config/db.js'
import { env } from '../config/env.js'
import { SectorHistory } from '../models/SectorHistory.js'
import { notFound } from '../utils/httpError.js'
import { createLimiter } from '../utils/limiter.js'
import { getDailySeries } from './candleService.js'
import { getIndex } from './indexService.js'

const INDEX_BASE = 1000
const MAX_DAILY_RETURN = 0.35 // ignore obviously bad data points beyond ±35% in a day
const MIN_START_MEMBERS = 3 // the index starts once this many members have data
// A daily-rebalanced equal-weight index drifts upward over decades, so it is
// built over a fixed recent window (starting at 1000) to stay readable.
const HISTORY_YEARS = 15
// Bump when the construction changes so stored indices are rebuilt.
const INDEX_VERSION = 2

const sectors = new Map() // slug → { slug, name, members, candles, builtAt, summary }
const build = { running: null, done: 0, total: 0, startedAt: null, lastError: null }
let loadedFromDb = false

export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const round2 = (v) => Math.round(v * 100) / 100
const clampReturn = (r) => Math.max(-MAX_DAILY_RETURN, Math.min(MAX_DAILY_RETURN, r))

// ---------- Sector membership ----------

let membershipCache = { fetchedAt: null, bySymbol: new Map(), bySlug: new Map() }

export async function getSectorMembership() {
  const index = await getIndex('nifty500')
  if (membershipCache.fetchedAt === index.fetchedAt && membershipCache.bySymbol.size) return membershipCache

  const bySymbol = new Map()
  const bySlug = new Map()
  for (const stock of index.stocks) {
    if (!stock.industry) continue
    const slug = slugify(stock.industry)
    bySymbol.set(stock.symbol, { slug, name: stock.industry })
    if (!bySlug.has(slug)) bySlug.set(slug, { slug, name: stock.industry, members: [] })
    bySlug.get(slug).members.push(stock.symbol)
  }
  membershipCache = { fetchedAt: index.fetchedAt, bySymbol, bySlug }
  return membershipCache
}

// Sector of one stock, or null (e.g. stocks outside NIFTY 500).
export async function getSectorOf(symbol) {
  try {
    return (await getSectorMembership()).bySymbol.get(symbol) ?? null
  } catch {
    return null
  }
}

// ---------- Building the equal-weighted index ----------

async function buildSectorCandles(members, onMemberDone) {
  const byDay = new Map() // time → { o, h, l, c, n, value }
  const limit = createLimiter(4)

  await Promise.all(
    members.map((symbol) =>
      limit(async () => {
        try {
          const { candles } = await getDailySeries(symbol)
          for (let i = 1; i < candles.length; i++) {
            const prev = candles[i - 1].close
            if (!(prev > 0)) continue
            const c = candles[i]
            let day = byDay.get(c.time)
            if (!day) byDay.set(c.time, (day = { o: 0, h: 0, l: 0, c: 0, n: 0, value: 0 }))
            day.o += clampReturn(c.open / prev - 1)
            day.h += clampReturn(c.high / prev - 1)
            day.l += clampReturn(c.low / prev - 1)
            day.c += clampReturn(c.close / prev - 1)
            day.n++
            day.value += (c.volume || 0) * c.close
          }
        } catch (error) {
          console.warn(`Sector build: skipped ${symbol} (${error.message})`)
        } finally {
          onMemberDone?.()
        }
      }),
    ),
  )

  const cutoff = new Date()
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - HISTORY_YEARS)
  const fromDay = cutoff.toISOString().slice(0, 10)
  const days = [...byDay.keys()].filter((t) => t >= fromDay).sort()
  const minStart = Math.min(MIN_START_MEMBERS, members.length)
  const start = days.findIndex((t) => byDay.get(t).n >= minStart)
  if (start < 0) return []

  const candles = []
  let level = INDEX_BASE
  for (const time of days.slice(start)) {
    const d = byDay.get(time)
    const open = level * (1 + d.o / d.n)
    const close = level * (1 + d.c / d.n)
    candles.push({
      time,
      open: round2(open),
      high: round2(Math.max(level * (1 + d.h / d.n), open, close)),
      low: round2(Math.min(level * (1 + d.l / d.n), open, close)),
      close: round2(close),
      volume: Math.round(d.value),
    })
    level = close
  }
  return candles
}

function summarize(entry) {
  const timeframes = {}
  for (const tf of TIMEFRAME_KEYS) {
    const { demand, supply, zones } = analyzeCandles(aggregateCandles(entry.candles, tf))
    timeframes[tf] = {
      demand: demand ? slimZone(demand) : null,
      supply: supply ? slimZone(supply) : null,
      zones: zones.map(slimZone),
    }
  }
  return {
    slug: entry.slug,
    name: entry.name,
    memberCount: entry.members.length,
    builtAt: entry.builtAt,
    quote: entry.candles.length ? buildQuote(entry.candles) : null,
    timeframes,
  }
}

function store(entry) {
  sectors.set(entry.slug, { ...entry, summary: summarize(entry) })
}

async function loadFromDbOnce() {
  if (loadedFromDb || !isDbConnected()) return
  loadedFromDb = true
  try {
    const docs = await SectorHistory.find().lean()
    for (const doc of docs) if (!sectors.has(doc.slug)) store(doc)
  } catch (error) {
    console.warn(`Could not load sectors from MongoDB: ${error.message}`)
  }
}

async function buildAll() {
  const { bySlug } = await getSectorMembership()
  const groups = [...bySlug.values()].sort((a, b) => a.members.length - b.members.length)
  build.total = groups.reduce((sum, g) => sum + g.members.length, 0)
  build.done = 0
  build.startedAt = new Date()
  build.lastError = null

  for (const group of groups) {
    const candles = await buildSectorCandles(group.members, () => build.done++)
    if (!candles.length) continue
    const entry = {
      slug: group.slug,
      name: group.name,
      members: group.members,
      candles,
      builtAt: new Date(),
      version: INDEX_VERSION,
    }
    store(entry)
    if (isDbConnected()) {
      await SectorHistory.updateOne({ slug: entry.slug }, { $set: entry }, { upsert: true }).catch((error) =>
        console.warn(`Could not cache sector ${entry.slug}: ${error.message}`),
      )
    }
  }
  console.log(`Sector indices built: ${sectors.size} sectors in ${Math.round((Date.now() - build.startedAt) / 1000)}s`)
}

function isStale() {
  if (sectors.size === 0) return true
  if ([...sectors.values()].some((s) => s.version !== INDEX_VERSION)) return true
  const oldest = Math.min(...[...sectors.values()].map((s) => new Date(s.builtAt).getTime()))
  return Date.now() - oldest > env.sectorTtlHours * 3600000
}

// Starts a background (re)build when needed; never waits for it.
function ensureFresh() {
  if (build.running || !isStale()) return
  build.running = buildAll()
    .catch((error) => {
      build.lastError = error.message
      console.error(`Sector build failed: ${error.message}`)
    })
    .finally(() => {
      build.running = null
    })
}

function buildStatus() {
  return {
    building: Boolean(build.running),
    progress: build.running ? { done: build.done, total: build.total } : null,
    lastError: build.lastError,
  }
}

// ---------- Public API ----------

// All sectors with their headline zones per timeframe. While a build is
// running, previously built sectors (if any) are returned with building: true.
export async function listSectors() {
  await loadFromDbOnce()
  ensureFresh()
  const list = [...sectors.values()].map(({ summary }) => {
    const { timeframes, ...rest } = summary
    // Headline zones only; the full zone list is served per sector.
    const headline = Object.fromEntries(
      Object.entries(timeframes).map(([tf, v]) => [tf, { demand: v.demand, supply: v.supply }]),
    )
    return { ...rest, timeframes: headline }
  })
  list.sort((a, b) => b.memberCount - a.memberCount)
  return { ...buildStatus(), sectors: list }
}

async function requireSector(slug) {
  await loadFromDbOnce()
  ensureFresh()
  const entry = sectors.get(slug)
  if (!entry) {
    const { bySlug } = await getSectorMembership()
    if (!bySlug.has(slug)) throw notFound(`Unknown sector "${slug}".`)
    const error = new Error('Sector index is still being built. Try again in a minute.')
    error.status = 503
    throw error
  }
  return entry
}

export async function getSector(slug) {
  const entry = await requireSector(slug)
  return { ...entry.summary, members: entry.members, ...buildStatus() }
}

export async function getSectorCandles(slug, timeframe) {
  const entry = await requireSector(slug)
  return {
    slug,
    name: entry.name,
    memberCount: entry.members.length,
    timeframe,
    quote: entry.summary.quote,
    candles: aggregateCandles(entry.candles, timeframe),
  }
}

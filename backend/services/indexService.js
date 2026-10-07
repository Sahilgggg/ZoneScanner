// Index constituents (NIFTY 50 / 100 / 500) from NSE's published CSV files,
// cached in memory and MongoDB. Falls back to the bundled lists in
// ../../shared/universes.js if NSE cannot be reached (NIFTY 500 has no
// bundled copy).

import { INDEXES, NIFTY_50, NIFTY_NEXT_50 } from '../../shared/universes.js'
import { isDbConnected } from '../config/db.js'
import { env } from '../config/env.js'
import { IndexList } from '../models/IndexList.js'
import { badGateway, notFound } from '../utils/httpError.js'

const NSE_CSV = {
  nifty50: 'https://archives.nseindia.com/content/indices/ind_nifty50list.csv',
  nifty100: 'https://archives.nseindia.com/content/indices/ind_nifty100list.csv',
  nifty500: 'https://archives.nseindia.com/content/indices/ind_nifty500list.csv',
}

const BUNDLED = {
  nifty50: NIFTY_50,
  nifty100: [...NIFTY_50, ...NIFTY_NEXT_50],
}

const memory = new Map()

const isFresh = (entry) => entry && Date.now() - new Date(entry.fetchedAt).getTime() < env.indexTtlHours * 3600000

// Columns: Company Name, Industry, Symbol, Series, ISIN Code
function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/)
  const header = lines.shift().split(',').map((h) => h.trim().toLowerCase())
  const col = (name) => header.indexOf(name)
  const iName = col('company name')
  const iIndustry = col('industry')
  const iSymbol = col('symbol')
  if (iSymbol < 0) throw new Error('Unexpected CSV format from NSE')
  return lines
    .map((line) => line.split(','))
    // NSE sometimes lists placeholder rows such as "DUMMYHEG" during index changes.
    .filter((cells) => cells[iSymbol] && !cells[iSymbol].trim().toUpperCase().startsWith('DUMMY'))
    .map((cells) => ({
      symbol: cells[iSymbol].trim().toUpperCase(),
      name: cells[iName]?.trim() ?? '',
      industry: cells[iIndustry]?.trim() ?? '',
    }))
}

async function downloadFromNse(index) {
  const response = await fetch(NSE_CSV[index], {
    headers: { 'User-Agent': 'Mozilla/5.0 (stock-scanner)', Accept: 'text/csv' },
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(`NSE returned ${response.status}`)
  const stocks = parseCsv(await response.text())
  if (stocks.length === 0) throw new Error('NSE list was empty')
  return { index, source: 'nse', stocks, fetchedAt: new Date() }
}

export async function getIndex(index) {
  const meta = INDEXES.find((i) => i.id === index)
  if (!meta) throw notFound(`Unknown index "${index}". Use one of: ${INDEXES.map((i) => i.id).join(', ')}.`)

  let entry = memory.get(index)
  if (!isFresh(entry) && isDbConnected()) {
    const doc = await IndexList.findOne({ index }).lean()
    if (doc) entry = doc
  }

  if (!isFresh(entry)) {
    try {
      entry = await downloadFromNse(index)
      if (isDbConnected()) {
        await IndexList.updateOne({ index }, { $set: entry }, { upsert: true }).catch((error) =>
          console.warn(`Could not cache ${index} in MongoDB: ${error.message}`),
        )
      }
    } catch (error) {
      console.warn(`Could not download ${index} from NSE: ${error.message}`)
      if (!entry) {
        if (!BUNDLED[index]) throw badGateway(`Could not download the ${meta.label} list from NSE. Try again later.`)
        entry = {
          index,
          source: 'bundled',
          stocks: BUNDLED[index].map((symbol) => ({ symbol, name: '', industry: '' })),
          fetchedAt: new Date(0), // stale on purpose so NSE is retried next time
        }
      }
    }
  }

  memory.set(index, entry)
  return {
    id: index,
    label: meta.label,
    source: entry.source,
    fetchedAt: entry.fetchedAt,
    count: entry.stocks.length,
    stocks: entry.stocks,
    symbols: entry.stocks.map((s) => s.symbol),
  }
}

// Search symbols and company names within NIFTY 500.
export async function searchStocks(query, max = 10) {
  const q = query.trim().toUpperCase()
  if (!q) return []
  let stocks
  try {
    stocks = (await getIndex('nifty500')).stocks
  } catch {
    stocks = (await getIndex('nifty100')).stocks
  }
  const scored = []
  for (const s of stocks) {
    const symbolPos = s.symbol.indexOf(q)
    const namePos = s.name.toUpperCase().indexOf(q)
    if (symbolPos < 0 && namePos < 0) continue
    // Exact symbol, then symbol prefix, then symbol contains, then name match.
    const rank = s.symbol === q ? 0 : symbolPos === 0 ? 1 : symbolPos > 0 ? 2 : 3
    scored.push({ rank, s })
  }
  scored.sort((a, b) => a.rank - b.rank || a.s.symbol.localeCompare(b.s.symbol))
  return scored.slice(0, max).map(({ s }) => ({ symbol: s.symbol, name: s.name, industry: s.industry }))
}

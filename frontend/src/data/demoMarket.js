// DEMO DATA ONLY. Generates synthetic daily OHLCV candles so the app works
// before the backend exists. Prices are NOT real market prices.
//
// Each symbol gets its own fixed random seed, so the same symbol always
// produces the same price history. The generator switches between trending,
// ranging and tight "base" regimes and adds occasional shock days, which
// produces realistic base → departure structures for the zone engine.

const HISTORY_YEARS = 20
const DAY_MS = 86400000

function hashString(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed) {
  let a = seed
  return function random() {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function gaussian(random) {
  const u = 1 - random()
  const v = random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function tradingDays(years) {
  const end = new Date()
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
  const startUtc = Date.UTC(end.getFullYear() - years, end.getMonth(), end.getDate())
  const days = []
  for (let t = startUtc; t <= endUtc; t += DAY_MS) {
    const dow = new Date(t).getUTCDay()
    if (dow !== 0 && dow !== 6) days.push(new Date(t).toISOString().slice(0, 10))
  }
  return days
}

function pickRegime(random) {
  const r = random()
  const length = 8 + Math.floor(random() * 45)
  if (r < 0.33) return { length, drift: 0.002 + random() * 0.003, vol: 0.013 + random() * 0.01 }
  if (r < 0.58) return { length, drift: -(0.0015 + random() * 0.003), vol: 0.014 + random() * 0.01 }
  if (r < 0.82) return { length, drift: 0, vol: 0.011 }
  return { length: 4 + Math.floor(random() * 10), drift: 0, vol: 0.006 } // tight base
}

const round2 = (v) => Math.round(v * 100) / 100

export function generateDailyCandles(symbol) {
  const random = mulberry32(hashString(symbol))
  const dates = tradingDays(HISTORY_YEARS)
  const targetPrice = Math.exp(Math.log(60) + random() * Math.log(80)) // ₹60 – ₹4,800
  const baseVolume = 2e5 + random() * 4e6

  // 1) Simulate a log-price path.
  const raw = []
  let logPrice = 0
  let trend = 0
  let regime = pickRegime(random)
  let left = regime.length
  for (let i = 0; i < dates.length; i++) {
    if (left-- <= 0) {
      regime = pickRegime(random)
      left = regime.length
    }
    trend += 0.0004 // long-run upward drift (~10% a year)
    let ret = regime.drift + regime.vol * gaussian(random) - 0.003 * (logPrice - trend)
    if (random() < 0.015) ret += (random() < 0.55 ? 1 : -1) * (0.04 + random() * 0.05)
    const gap = gaussian(random) * regime.vol * 0.3
    const prevLog = logPrice
    logPrice += ret
    raw.push({
      openLog: prevLog + gap,
      closeLog: logPrice,
      upperWick: Math.abs(gaussian(random)) * regime.vol * 0.5,
      lowerWick: Math.abs(gaussian(random)) * regime.vol * 0.5,
      volume: baseVolume * Math.exp(gaussian(random) * 0.35) * (1 + (2.5 * Math.abs(ret)) / 0.02),
    })
  }

  // 2) Scale so the last close lands on the target price.
  const scale = targetPrice / Math.exp(logPrice)
  return raw.map((r, i) => {
    const open = round2(Math.exp(r.openLog) * scale)
    const close = round2(Math.exp(r.closeLog) * scale)
    const high = round2(Math.max(open, close) * Math.exp(r.upperWick))
    const low = round2(Math.min(open, close) * Math.exp(-r.lowerWick))
    return { time: dates[i], open, high: Math.max(high, open, close), low: Math.min(low, open, close), close, volume: Math.round(r.volume) }
  })
}

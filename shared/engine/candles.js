// Candle helpers. A candle is { time: 'YYYY-MM-DD', open, high, low, close, volume }.

const DAY_MS = 86400000

function periodKey(time, timeframe) {
  const year = Number(time.slice(0, 4))
  const month = Number(time.slice(5, 7))
  switch (timeframe) {
    case 'weekly': {
      const date = new Date(`${time}T00:00:00Z`)
      const daysSinceMonday = (date.getUTCDay() + 6) % 7
      return new Date(date.getTime() - daysSinceMonday * DAY_MS).toISOString().slice(0, 10)
    }
    case 'monthly':
      return time.slice(0, 7)
    case 'quarterly':
      return `${year}-Q${Math.ceil(month / 3)}`
    case 'halfyearly':
      return `${year}-H${month <= 6 ? 1 : 2}`
    case 'yearly':
      return String(year)
    default:
      return time
  }
}

// Builds higher-timeframe candles from daily candles. Each candle is stamped
// with the first trading day of its period. The latest period may still be
// in progress.
export function aggregateCandles(daily, timeframe) {
  if (timeframe === 'daily') return daily
  const out = []
  let current = null
  let currentKey = null
  for (const c of daily) {
    const key = periodKey(c.time, timeframe)
    if (key !== currentKey) {
      current = { time: c.time, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume }
      out.push(current)
      currentKey = key
    } else {
      current.high = Math.max(current.high, c.high)
      current.low = Math.min(current.low, c.low)
      current.close = c.close
      current.volume += c.volume
    }
  }
  return out
}

// Wilder's Average True Range; the first `period` values use a running mean.
export function computeATR(candles, period) {
  const atr = new Array(candles.length)
  let sum = 0
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i]
    const tr =
      i === 0
        ? c.high - c.low
        : Math.max(c.high - c.low, Math.abs(c.high - candles[i - 1].close), Math.abs(c.low - candles[i - 1].close))
    if (i < period) {
      sum += tr
      atr[i] = sum / (i + 1)
    } else {
      atr[i] = (atr[i - 1] * (period - 1) + tr) / period
    }
  }
  return atr
}

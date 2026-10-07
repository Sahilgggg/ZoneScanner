// NSE session awareness for cache freshness. Daily candles cannot change
// between the end of one session and the start of the next, so data fetched
// after the last close stays valid overnight and over weekends. (Exchange
// holidays are not modelled; on those days data is simply re-checked.)

const IST_MS = 5.5 * 3600000
const DAY_MS = 86400000
const SESSION_START = 9 * 60 // 09:00 IST (pre-open)
const SESSION_END = 15 * 60 + 45 // 15:45 IST (after close, data settled)

const isWeekend = (istDate) => istDate.getUTCDay() === 0 || istDate.getUTCDay() === 6
const minutesOfDay = (istDate) => istDate.getUTCHours() * 60 + istDate.getUTCMinutes()

// Wall-clock IST represented as a UTC Date (so getUTC* returns IST fields).
const toIst = (date) => new Date(date.getTime() + IST_MS)

export function isMarketSession(now = new Date()) {
  const ist = toIst(now)
  const m = minutesOfDay(ist)
  return !isWeekend(ist) && m >= SESSION_START && m < SESSION_END
}

// The most recent weekday 15:45 IST at or before `now`.
export function lastSessionEnd(now = new Date()) {
  const ist = toIst(now)
  let end = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), 15, 45)
  if (ist.getTime() < end) end -= DAY_MS
  while (isWeekend(new Date(end))) end -= DAY_MS
  return new Date(end - IST_MS)
}

// IST date ('YYYY-MM-DD') of the most recent completed session.
export function lastSessionDate(now = new Date()) {
  return toIst(lastSessionEnd(now)).toISOString().slice(0, 10)
}

// Fresh if younger than the TTL, or — while the market is shut — fetched
// after the last close AND already containing that session's candle
// (`lastCandleDate`), so incomplete data heals itself on the next request.
export function isFresh(fetchedAt, ttlMinutes, now = new Date(), lastCandleDate = null) {
  if (!fetchedAt) return false
  const t = new Date(fetchedAt).getTime()
  if (now.getTime() - t < ttlMinutes * 60000) return true
  if (isMarketSession(now) || t < lastSessionEnd(now).getTime()) return false
  return !lastCandleDate || lastCandleDate >= lastSessionDate(now)
}

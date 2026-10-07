// Finds demand and supply zones using one shared, direction-aware routine.
//
// A zone is: 1..N base candles (small bodies) followed by an explosive
// leg-out candle in the zone's direction, with enough total departure.
//
//   Demand (dir = +1): leg-out is bullish.
//     zone high (proximal) = highest body top of the base candles
//     zone low  (distal)   = lowest low of the base + leg-out candle
//   Supply (dir = -1): leg-out is bearish.
//     zone low  (proximal) = lowest body bottom of the base candles
//     zone high (distal)   = highest high of the base + leg-out candle
//
// Pattern comes from the leg-in (the candles before the base):
//   Demand: rally in → RBR, drop in → DBR
//   Supply: rally in → RBD, drop in → DBD
// Confluence flags: break of structure, fair-value gap, volume, strong reversal.

const bodyTop = (c) => Math.max(c.open, c.close)
const bodyBottom = (c) => Math.min(c.open, c.close)

export function isBaseCandle(c, cfg) {
  const range = c.high - c.low
  if (range <= 0) return true
  return Math.abs(c.close - c.open) / range <= cfg.baseBodyRatio
}

export function isExplosiveCandle(c, dir, atr, cfg) {
  const range = c.high - c.low
  if (range <= 0) return false
  const directionalBody = (c.close - c.open) * dir
  return directionalBody > 0 && directionalBody / range >= cfg.legBodyRatio && range >= cfg.legMinRangeATR * atr
}

function averageVolume(candles, from, to) {
  const start = Math.max(0, from)
  if (to < start) return 0
  let sum = 0
  for (let k = start; k <= to; k++) sum += candles[k].volume || 0
  return sum / (to - start + 1)
}

function buildZone(candles, atr, s, e, dir, side, cfg) {
  const n = candles.length
  const isDemand = dir === 1
  const legOut = e + 1
  const ref = atr[e] || 1e-9

  let proximal = isDemand ? -Infinity : Infinity
  let distal = isDemand ? Infinity : -Infinity
  for (let k = s; k <= e; k++) {
    const c = candles[k]
    if (isDemand) {
      proximal = Math.max(proximal, bodyTop(c))
      distal = Math.min(distal, c.low)
    } else {
      proximal = Math.min(proximal, bodyBottom(c))
      distal = Math.max(distal, c.high)
    }
  }
  distal = isDemand ? Math.min(distal, candles[legOut].low) : Math.max(distal, candles[legOut].high)

  const zoneHigh = isDemand ? proximal : distal
  const zoneLow = isDemand ? distal : proximal
  const height = zoneHigh - zoneLow
  if (!(height > 0) || height > cfg.maxZoneHeightATR * ref) return null

  // Departure: how far price travelled from the proximal line right after the base.
  const departureEnd = Math.min(n - 1, legOut + cfg.departureCandles - 1)
  let extreme = isDemand ? -Infinity : Infinity
  for (let k = legOut; k <= departureEnd; k++) {
    extreme = isDemand ? Math.max(extreme, candles[k].high) : Math.min(extreme, candles[k].low)
  }
  const departureATR = (isDemand ? extreme - proximal : proximal - extreme) / ref
  if (departureATR < cfg.minDepartureATR) return null

  // Leg-in direction → pattern.
  const legInStart = Math.max(0, s - cfg.legInCandles)
  const legInMove = candles[s - 1].close - candles[legInStart].open
  const legInUp = legInMove > 0
  const legInATR = Math.abs(legInMove) / ref
  const pattern = isDemand ? (legInUp ? 'RBR' : 'DBR') : legInUp ? 'RBD' : 'DBD'
  const reversal =
    (pattern === 'DBR' || pattern === 'RBD') &&
    legInATR >= cfg.reversalLegInATR &&
    departureATR >= cfg.reversalDepartureATR

  // Break of structure: departure takes out the swing extreme of the lookback.
  const bosStart = Math.max(0, s - cfg.bosLookback)
  let swing = isDemand ? -Infinity : Infinity
  for (let k = bosStart; k < s; k++) {
    swing = isDemand ? Math.max(swing, candles[k].high) : Math.min(swing, candles[k].low)
  }
  const breakOfStructure = s > bosStart && (isDemand ? extreme > swing : extreme < swing)

  // Fair-value gap (imbalance) inside the departure.
  let imbalance = false
  for (let k = legOut; k <= departureEnd && k + 1 < n; k++) {
    const before = candles[k - 1]
    const after = candles[k + 1]
    if (isDemand ? after.low > before.high : after.high < before.low) {
      imbalance = true
      break
    }
  }

  const priorVolume = averageVolume(candles, s - cfg.volumeLookback, s - 1)
  const departureVolume = averageVolume(candles, legOut, departureEnd)
  const volumeRatio = priorVolume > 0 ? departureVolume / priorVolume : 0

  return {
    id: `${side}-${candles[s].time}`,
    side,
    baseStart: s,
    baseEnd: e,
    legOutIndex: legOut,
    departureEnd,
    formationDate: candles[s].time,
    zoneHigh,
    zoneLow,
    pattern,
    baseCandles: e - s + 1,
    departureATR,
    legInATR,
    breakOfStructure,
    imbalance,
    reversal,
    volumeRatio,
    volumeConfirmed: volumeRatio >= cfg.volumeConfirmRatio,
    atrAtFormation: ref,
  }
}

export function detectZones(candles, atr, side, cfg) {
  const dir = side === 'demand' ? 1 : -1
  const n = candles.length
  const zones = []
  let s = 1 // index 0 has no leg-in
  while (s < n - 1) {
    if (!isBaseCandle(candles[s], cfg)) {
      s++
      continue
    }
    let e = s
    while (e + 1 < n && e - s + 1 < cfg.baseMaxCandles && isBaseCandle(candles[e + 1], cfg)) e++
    const legOut = e + 1
    if (legOut < n && isExplosiveCandle(candles[legOut], dir, atr[e], cfg)) {
      const zone = buildZone(candles, atr, s, e, dir, side, cfg)
      if (zone) {
        zones.push(zone)
        s = legOut + 1
        continue
      }
    }
    s++
  }
  return zones
}

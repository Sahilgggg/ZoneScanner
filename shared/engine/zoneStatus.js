// Walks every candle after a zone's departure to count touches, detect a
// break, and decide the zone's current lifecycle status.
//
// Statuses (precedence top → bottom):
//   BROKEN      a candle closed beyond the distal line
//   IN_ZONE     latest close is inside the zone
//   REACTING    recent touch + rejection + confirmation candle closing back
//               outside the zone, in the zone's direction
//   FORMED      new zone (formed in the last few candles), not yet tested
//   WEAKENING   price is near the zone, but it has been tested many times or deeply
//   APPROACHING price is within `approachATR` of the proximal line
//   FRESH       never tested, price still far away
//   TESTED      tested before, price far away again

export function evaluateZone(zone, candles, atrNow, cfg) {
  const isDemand = zone.side === 'demand'
  const { zoneHigh, zoneLow } = zone
  const height = Math.max(zoneHigh - zoneLow, 1e-9)
  const n = candles.length
  const last = n - 1

  let touches = 0
  let wasTouching = false
  let lastTouchIndex = -1
  let maxPenetration = 0
  let brokenIndex = -1
  // Best move away from the zone before its first test (for risk/reward).
  let peak = isDemand ? candles[zone.legOutIndex].high : candles[zone.legOutIndex].low

  for (let k = zone.legOutIndex; k < n; k++) {
    const c = candles[k]
    if (k > zone.departureEnd) {
      const touching = isDemand ? c.low <= zoneHigh : c.high >= zoneLow
      if (touching) {
        if (!wasTouching) touches++
        wasTouching = true
        lastTouchIndex = k
        const penetration = isDemand ? (zoneHigh - c.low) / height : (c.high - zoneLow) / height
        maxPenetration = Math.max(maxPenetration, Math.min(penetration, 1))
      } else {
        wasTouching = false
      }
      if (isDemand ? c.close < zoneLow : c.close > zoneHigh) {
        brokenIndex = k
        break
      }
    }
    if (touches === 0) peak = isDemand ? Math.max(peak, c.high) : Math.min(peak, c.low)
  }

  const price = candles[last].close
  const atr = atrNow || zone.atrAtFormation
  const riskReward = (isDemand ? peak - zoneHigh : zoneLow - peak) / height

  // Positive = price is away from the zone on the "correct" side.
  const distance = isDemand ? price - zoneHigh : zoneLow - price
  const distancePct = (distance / price) * 100
  const distanceATR = distance / atr

  let status
  if (brokenIndex >= 0) {
    status = 'BROKEN'
  } else if (price <= zoneHigh && price >= zoneLow) {
    status = 'IN_ZONE'
  } else if (isReacting(zone, candles, lastTouchIndex, price, cfg)) {
    status = 'REACTING'
  } else if (last - zone.legOutIndex < cfg.newZoneCandles && touches === 0) {
    status = 'FORMED'
  } else if (distanceATR <= cfg.approachATR) {
    const weak = touches >= cfg.weakeningTouches || maxPenetration >= cfg.deepPenetration
    status = weak ? 'WEAKENING' : 'APPROACHING'
  } else {
    status = touches === 0 ? 'FRESH' : 'TESTED'
  }

  return {
    status,
    touches,
    fresh: touches === 0,
    lastTouchIndex,
    maxPenetration,
    brokenIndex,
    brokenDate: brokenIndex >= 0 ? candles[brokenIndex].time : null,
    recentlyBroken: brokenIndex >= 0 && last - brokenIndex < cfg.brokenLookback,
    riskReward,
    distancePct,
    distanceATR,
  }
}

// Enter zone → rejection → confirmation candle → close back outside the zone.
function isReacting(zone, candles, lastTouchIndex, price, cfg) {
  const last = candles.length - 1
  if (lastTouchIndex < 0 || last - lastTouchIndex >= cfg.reactionLookback) return false

  const isDemand = zone.side === 'demand'
  const { zoneHigh, zoneLow } = zone
  if (isDemand ? price <= zoneHigh : price >= zoneLow) return false

  const t = candles[lastTouchIndex]
  const range = t.high - t.low || 1e-9
  const rejection = isDemand
    ? (Math.min(t.open, t.close) - t.low) / range >= cfg.rejectionWickRatio || t.close > zoneHigh
    : (t.high - Math.max(t.open, t.close)) / range >= cfg.rejectionWickRatio || t.close < zoneLow
  if (!rejection) return false

  for (let k = lastTouchIndex; k <= last; k++) {
    const c = candles[k]
    const confirmed = isDemand ? c.close > c.open && c.close > zoneHigh : c.close < c.open && c.close < zoneLow
    if (confirmed) return true
  }
  return false
}

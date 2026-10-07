// All thresholds and score weights for zone detection in one place, so they
// can be tuned later by backtesting. Units marked "ATR" are multiples of the
// Average True Range of the timeframe being analysed, which keeps the same
// rules meaningful on daily and yearly candles alike.

export const ZONE_CONFIG = {
  atrPeriod: 14,

  // --- Candle classification ---
  baseBodyRatio: 0.5, // body / range ≤ this → base (indecision) candle
  baseMaxCandles: 4, // a base is 1..4 consecutive base candles
  legBodyRatio: 0.55, // body / range ≥ this → explosive candle
  legMinRangeATR: 1.0, // explosive candle range ≥ this × ATR

  // --- Departure (leg-out) ---
  departureCandles: 3, // window after the base used to measure the departure
  minDepartureATR: 1.5, // move from the proximal line within that window
  maxZoneHeightATR: 2.5, // wider zones are rejected as low quality

  // --- Leg-in / context ---
  legInCandles: 3,
  reversalLegInATR: 2.0, // DBR / RBD with a leg-in this big …
  reversalDepartureATR: 2.0, // … and a departure this big = strong reversal
  bosLookback: 20, // departure beyond the swing of the last N candles = break of structure
  volumeLookback: 20,
  volumeConfirmRatio: 1.3, // leg-out avg volume ≥ 1.3 × prior avg volume

  // --- Lifecycle ---
  approachATR: 1.5, // within this distance of the proximal line → approaching
  reactionLookback: 5, // a touch within the last N candles can be a reaction
  rejectionWickRatio: 0.4, // wick ≥ 40% of range on the touch candle = rejection
  newZoneCandles: 5, // formed within the last N candles and untouched → new
  brokenLookback: 5, // broken within the last N candles → shown as "broken"
  weakeningTouches: 3, // this many tests → weakening
  deepPenetration: 0.75, // a test reaching 75% into the zone → weakening

  // --- Output ---
  maxZonesPerSide: 4,
  maxBrokenPerSide: 2,

  // --- Strength score weights (sum = 100) ---
  weights: {
    departure: 25,
    baseQuality: 15,
    breakOfStructure: 15,
    volume: 10,
    freshness: 15,
    riskReward: 10,
    imbalance: 5,
    pattern: 5,
  },
}

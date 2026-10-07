// Turns a detected + evaluated zone into a 0–100 strength score. Each factor
// produces a 0..1 value that is multiplied by its weight from config.weights.
// Returning the breakdown makes it easy to inspect and backtest later.

const clamp01 = (v) => Math.max(0, Math.min(1, v))

const BASE_COUNT_QUALITY = { 1: 1, 2: 1, 3: 0.8, 4: 0.6 }
const FRESHNESS = [1, 0.6, 0.3]

export function scoreZone(zone, evaluation, cfg) {
  const w = cfg.weights
  const heightATR = (zone.zoneHigh - zone.zoneLow) / zone.atrAtFormation

  const factors = {
    departure: clamp01(zone.departureATR / 3),
    baseQuality:
      (BASE_COUNT_QUALITY[zone.baseCandles] ?? 0.4) * 0.6 + clamp01(1 - (heightATR - 0.5) / 2) * 0.4,
    breakOfStructure: zone.breakOfStructure ? 1 : 0,
    volume: zone.volumeConfirmed ? 1 : zone.volumeRatio >= 1 ? 0.4 : 0,
    freshness: evaluation.brokenIndex >= 0 ? 0 : (FRESHNESS[evaluation.touches] ?? 0),
    riskReward: clamp01(evaluation.riskReward / 3),
    imbalance: zone.imbalance ? 1 : 0,
    pattern: zone.reversal ? 1 : zone.pattern === 'DBR' || zone.pattern === 'RBD' ? 0.6 : 0.3,
  }

  let total = 0
  const breakdown = {}
  for (const [key, value] of Object.entries(factors)) {
    breakdown[key] = Math.round(value * w[key] * 10) / 10
    total += value * w[key]
  }
  return { strength: Math.round(total), breakdown }
}

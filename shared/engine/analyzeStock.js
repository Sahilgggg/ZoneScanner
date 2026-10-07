// Entry point of the engine: candles in → zones with status and score out.
// Pure JavaScript with no browser or React dependencies, so the same files
// can later be copied into the Node backend unchanged.

import { computeATR } from './candles.js'
import { ZONE_CONFIG } from './config.js'
import { detectZones } from './zoneDetector.js'
import { evaluateZone } from './zoneStatus.js'
import { scoreZone } from './zoneScore.js'

// Lower = more actionable; used to pick the headline zone per side.
const STATUS_PRIORITY = {
  IN_ZONE: 0,
  REACTING: 1,
  APPROACHING: 2,
  WEAKENING: 3,
  FORMED: 4,
  FRESH: 5,
  TESTED: 6,
  BROKEN: 7,
}

function overlapRatio(a, b) {
  const overlap = Math.min(a.zoneHigh, b.zoneHigh) - Math.max(a.zoneLow, b.zoneLow)
  if (overlap <= 0) return 0
  const smaller = Math.min(a.zoneHigh - a.zoneLow, b.zoneHigh - b.zoneLow)
  return smaller > 0 ? overlap / smaller : 1
}

function buildTags(zone) {
  const tags = []
  if (zone.reversal) tags.push('Strong reversal')
  if (zone.breakOfStructure) tags.push(zone.side === 'demand' ? 'Breakout origin' : 'Breakdown origin')
  if (zone.imbalance) tags.push('FVG')
  if (zone.volumeConfirmed) tags.push('Volume')
  return tags
}

function selectSide(zones, cfg) {
  // Drop overlapping duplicates, keeping the stronger zone.
  const active = zones.filter((z) => z.status !== 'BROKEN').sort((a, b) => b.strength - a.strength)
  const kept = []
  for (const z of active) {
    if (kept.every((k) => overlapRatio(k, z) < 0.5)) kept.push(z)
  }
  kept.sort((a, b) => a.distanceATR - b.distanceATR)

  const broken = zones
    .filter((z) => z.status === 'BROKEN' && z.recentlyBroken)
    .sort((a, b) => b.brokenIndex - a.brokenIndex)
    .slice(0, cfg.maxBrokenPerSide)

  return [...kept.slice(0, cfg.maxZonesPerSide), ...broken]
}

export function pickPrimaryZone(zones) {
  let best = null
  for (const z of zones) {
    if (
      !best ||
      STATUS_PRIORITY[z.status] < STATUS_PRIORITY[best.status] ||
      (STATUS_PRIORITY[z.status] === STATUS_PRIORITY[best.status] && Math.abs(z.distanceATR) < Math.abs(best.distanceATR))
    ) {
      best = z
    }
  }
  return best
}

export function analyzeCandles(candles, cfg = ZONE_CONFIG) {
  if (!candles || candles.length < 3) {
    return { candles: candles ?? [], zones: [], demandZones: [], supplyZones: [], demand: null, supply: null, price: null, atr: null }
  }

  const atr = computeATR(candles, cfg.atrPeriod)
  const atrNow = atr[candles.length - 1]

  const bySide = {}
  for (const side of ['demand', 'supply']) {
    const evaluated = detectZones(candles, atr, side, cfg).map((zone) => {
      const evaluation = evaluateZone(zone, candles, atrNow, cfg)
      const { strength, breakdown } = scoreZone(zone, evaluation, cfg)
      return { ...zone, ...evaluation, strength, scoreBreakdown: breakdown, tags: buildTags(zone) }
    })
    bySide[side] = selectSide(evaluated, cfg)
  }

  return {
    candles,
    zones: [...bySide.demand, ...bySide.supply],
    demandZones: bySide.demand,
    supplyZones: bySide.supply,
    demand: pickPrimaryZone(bySide.demand),
    supply: pickPrimaryZone(bySide.supply),
    price: candles[candles.length - 1].close,
    atr: atrNow,
  }
}

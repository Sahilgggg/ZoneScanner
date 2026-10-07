// Shared constants used across the frontend. The engine and the future
// backend use the same timeframe keys, status keys and pattern codes.

export const DEFAULT_SYMBOL = 'USHAMART'
export const DEFAULT_TIMEFRAME = 'daily'

export const TIMEFRAMES = [
  { value: 'daily', label: 'Daily', short: '1D' },
  { value: 'weekly', label: 'Weekly', short: '1W' },
  { value: 'monthly', label: 'Monthly', short: '1M' },
  { value: 'quarterly', label: 'Quarterly', short: '3M' },
  { value: 'halfyearly', label: 'Half-Yearly', short: '6M' },
  { value: 'yearly', label: 'Yearly', short: '1Y' },
]

export function isValidTimeframe(value) {
  return TIMEFRAMES.some((tf) => tf.value === value)
}

export function timeframeLabel(value) {
  return TIMEFRAMES.find((tf) => tf.value === value)?.label ?? value
}

// Zone lifecycle, in order: FORMED → FRESH → APPROACHING → IN_ZONE → REACTING → WEAKENING → BROKEN
// TESTED = tested once or twice before, and price has moved away again.
export const ZONE_STATUS = {
  FORMED: { label: 'New', tone: 'info' },
  FRESH: { label: 'Fresh', tone: 'info' },
  APPROACHING: { label: 'Approaching', tone: 'warn' },
  IN_ZONE: { label: 'In Zone', tone: 'accent' },
  REACTING: { label: 'Reacting', tone: 'good' },
  TESTED: { label: 'Tested', tone: 'neutral' },
  WEAKENING: { label: 'Weakening', tone: 'muted' },
  BROKEN: { label: 'Broken', tone: 'bad' },
}

export function statusLabel(status) {
  return ZONE_STATUS[status]?.label ?? status ?? '—'
}

export const PATTERN_LABELS = {
  RBR: 'Rally-Base-Rally',
  DBR: 'Drop-Base-Rally',
  DBD: 'Drop-Base-Drop',
  RBD: 'Rally-Base-Drop',
}

export function patternLabel(code) {
  return PATTERN_LABELS[code] ?? code ?? '—'
}

// Strength bands. The score itself comes from the engine (shared/engine/zoneScore.js).
export function strengthBand(score) {
  if (!Number.isFinite(score)) return { label: '—', tone: 'muted' }
  if (score >= 80) return { label: 'Strong', tone: 'good' }
  if (score >= 60) return { label: 'Good', tone: 'info' }
  if (score >= 40) return { label: 'Medium', tone: 'warn' }
  return { label: 'Weak', tone: 'bad' }
}

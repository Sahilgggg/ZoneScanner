const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const plain = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })

const compact = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 })

export function formatPrice(value) {
  return Number.isFinite(value) ? inr.format(value) : '—'
}

export function formatNumber(value) {
  return Number.isFinite(value) ? plain.format(value) : '—'
}

export function formatVolume(value) {
  return Number.isFinite(value) ? compact.format(value) : '—'
}

// "₹465.00 – ₹485.00"
export function formatPriceRange(low, high) {
  if (!Number.isFinite(low) || !Number.isFinite(high)) return '—'
  return `${formatPrice(low)} – ${formatPrice(high)}`
}

// "465–485" (compact, for tables)
export function formatRange(low, high) {
  if (!Number.isFinite(low) || !Number.isFinite(high)) return '—'
  return `${formatNumber(low)}–${formatNumber(high)}`
}

export function formatPercent(value) {
  if (!Number.isFinite(value)) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

// Accepts an ISO string, a Date, or a UNIX timestamp in seconds (the format
// Lightweight Charts uses).
export function formatDate(value) {
  if (value === null || value === undefined || value === '') return '—'
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Distance from price to a zone's proximal line, as shown in tables.
export function formatZoneDistance(zone) {
  if (!zone) return '—'
  if (zone.status === 'BROKEN') return 'Broken'
  if (zone.status === 'IN_ZONE') return 'Inside'
  return Number.isFinite(zone.distancePct) ? `${formatNumber(zone.distancePct)}%` : '—'
}

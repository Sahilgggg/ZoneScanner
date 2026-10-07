// Sector confirmation: a stock's demand (or supply) setup is "confirmed by its
// sector" when the sector index's own demand (or supply) zone on the same
// timeframe is in play — price approaching it, inside it, or reacting from it.

export const SECTOR_CONFIRM_STATUSES = new Set(['APPROACHING', 'IN_ZONE', 'REACTING'])

export function sectorZone(sector, timeframe, side) {
  return sector?.timeframes?.[timeframe]?.[side] ?? null
}

export function sectorConfirms(sector, timeframe, side) {
  const zone = sectorZone(sector, timeframe, side)
  return Boolean(zone && SECTOR_CONFIRM_STATUSES.has(zone.status))
}

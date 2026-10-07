import { statusLabel, ZONE_STATUS } from '../utils/constants.js'
import { sectorConfirms, sectorZone } from '../utils/sectors.js'

// A stock's sector plus the status of the sector index's zone on the same
// side (demand/supply) and timeframe. A ✓ marks sector confirmation.
export default function SectorBadge({ sector, sectorData, timeframe, side }) {
  if (!sector) return <span className="muted">—</span>
  const zone = sectorZone(sectorData, timeframe, side)
  const confirms = sectorConfirms(sectorData, timeframe, side)
  const sideLabel = side === 'demand' ? 'demand' : 'supply'

  return (
    <span
      className="sector-cell"
      title={
        zone
          ? `${sector.name} index — ${sideLabel} zone: ${statusLabel(zone.status)}${confirms ? ' (confirms)' : ''}`
          : `${sector.name} index — no ${sideLabel} zone${sectorData ? '' : ' (sector data loading)'}`
      }
    >
      <span className="sector-name">{sector.name}</span>
      {zone && (
        <span className={`badge badge-sm tone-${ZONE_STATUS[zone.status]?.tone ?? 'neutral'}`}>
          {confirms && '✓ '}
          {statusLabel(zone.status)}
        </span>
      )}
    </span>
  )
}

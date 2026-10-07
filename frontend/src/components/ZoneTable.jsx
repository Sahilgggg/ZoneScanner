import { patternLabel, statusLabel, strengthBand, ZONE_STATUS } from '../utils/constants.js'
import { formatDate, formatRange, formatZoneDistance } from '../utils/format.js'

// Every zone detected on the current timeframe. Clicking a row selects it.
export default function ZoneTable({ zones, selectedZoneId, onSelect }) {
  return (
    <section className="card">
      <div className="card-header">
        <h2 className="card-title">Zones on this timeframe</h2>
        <span className="muted small">{zones.length} zones</span>
      </div>
      {zones.length === 0 ? (
        <p className="muted">No qualifying demand or supply zones on this timeframe.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th className="num">Zone</th>
                <th>Pattern</th>
                <th>Formed</th>
                <th className="num">Strength</th>
                <th className="num">Touches</th>
                <th className="num">Distance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((z) => {
                const band = strengthBand(z.strength)
                return (
                  <tr
                    key={z.id}
                    className={z.id === selectedZoneId ? 'row-clickable active' : 'row-clickable'}
                    onClick={() => onSelect(z)}
                  >
                    <td className={z.side === 'demand' ? 'text-demand' : 'text-supply'}>
                      {z.side === 'demand' ? 'Demand' : 'Supply'}
                    </td>
                    <td className="num">{formatRange(z.zoneLow, z.zoneHigh)}</td>
                    <td title={patternLabel(z.pattern)}>{z.pattern}</td>
                    <td>{formatDate(z.formationDate)}</td>
                    <td className="num">
                      <span className={`tone-${band.tone}`}>{z.strength}</span>
                    </td>
                    <td className="num">{z.touches}</td>
                    <td className="num">{formatZoneDistance(z)}</td>
                    <td>
                      <span className={`badge tone-${ZONE_STATUS[z.status]?.tone ?? 'neutral'}`}>
                        {statusLabel(z.status)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

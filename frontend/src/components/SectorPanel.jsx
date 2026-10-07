import { statusLabel, timeframeLabel, ZONE_STATUS } from '../utils/constants.js'
import { formatPercent, formatZoneDistance } from '../utils/format.js'
import { sectorConfirms } from '../utils/sectors.js'

function ZoneCell({ zone }) {
  if (!zone) return <span className="muted">—</span>
  return (
    <span className="sector-zone">
      <span className={`badge badge-sm tone-${ZONE_STATUS[zone.status]?.tone ?? 'neutral'}`}>{statusLabel(zone.status)}</span>
      <span className="muted small">{formatZoneDistance(zone)}</span>
    </span>
  )
}

// Every sector's equal-weighted index with its demand and supply zone status
// on the selected timeframe. Click a row to filter the results to that sector.
export default function SectorPanel({ sectorsState, timeframe, activeSlug, onSelect, onOpenChart }) {
  const { data, error } = sectorsState
  const sectors = data?.sectors ?? []

  let note = null
  if (error && !sectors.length) note = <span className="error-text">Sectors unavailable: {error}</span>
  else if (data?.building) {
    const p = data.progress
    note = (
      <span className="muted">
        Building sector indices{p?.total ? ` · ${p.done}/${p.total} stocks` : ''}… (first time only, a few minutes)
      </span>
    )
  }

  return (
    <section className="card">
      <div className="card-header">
        <h2 className="card-title">
          Sectors · {timeframeLabel(timeframe)}
          <span className="muted small"> · equal-weighted indices of NIFTY 500 stocks by NSE industry</span>
        </h2>
        {note}
      </div>
      {sectors.length === 0 ? (
        !note && <p className="muted">No sector data yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Sector</th>
                <th className="num">Stocks</th>
                <th className="num">Day</th>
                <th>Demand zone</th>
                <th>Supply zone</th>
                <th aria-label="Chart" />
              </tr>
            </thead>
            <tbody>
              {sectors.map((s) => {
                const tf = s.timeframes?.[timeframe] ?? {}
                const inDemand = sectorConfirms(s, timeframe, 'demand')
                const inSupply = sectorConfirms(s, timeframe, 'supply')
                return (
                  <tr
                    key={s.slug}
                    className={s.slug === activeSlug ? 'row-clickable active' : 'row-clickable'}
                    onClick={() => onSelect(s.slug === activeSlug ? null : s.slug)}
                    title={s.slug === activeSlug ? 'Click to show all sectors' : 'Click to filter results to this sector'}
                  >
                    <td>
                      <span className={inDemand ? 'text-demand' : inSupply ? 'text-supply' : undefined}>{s.name}</span>
                    </td>
                    <td className="num">{s.memberCount}</td>
                    <td className={`num ${s.quote?.changePct >= 0 ? 'text-demand' : 'text-supply'}`}>
                      {formatPercent(s.quote?.changePct)}
                    </td>
                    <td>
                      <ZoneCell zone={tf.demand} />
                    </td>
                    <td>
                      <ZoneCell zone={tf.supply} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenChart(s)
                        }}
                      >
                        Chart
                      </button>
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

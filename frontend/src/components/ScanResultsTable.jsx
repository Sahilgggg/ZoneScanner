import { Link } from 'react-router-dom'
import SectorBadge from './SectorBadge.jsx'
import { statusLabel, strengthBand, timeframeLabel, ZONE_STATUS } from '../utils/constants.js'
import { formatPercent, formatPrice, formatRange, formatZoneDistance } from '../utils/format.js'

function SortHeader({ label, column, sort, onSort, num }) {
  const active = sort.key === column
  return (
    <th className={num ? 'num' : undefined} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="sort-button" onClick={() => onSort(column)}>
        {label}
        <span className="sort-arrow">{active ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</span>
      </button>
    </th>
  )
}

// Stocks in one scanner category. Clicking a row opens the chart preview.
// `sectorsBySlug` (real data only) adds a Sector column showing whether the
// stock's sector index is also in play on the same side and timeframe.
export default function ScanResultsTable({ rows, sort, onSort, selectedSymbol, onSelect, sectorsBySlug = null }) {
  if (!rows.length) {
    return <p className="muted results-empty">No stocks in this category for the selected timeframe and filters.</p>
  }

  const header = { sort, onSort }
  return (
    <div className="table-wrap">
      <table className="table results">
        <thead>
          <tr>
            <SortHeader label="Symbol" column="symbol" {...header} />
            <SortHeader label="Price" column="price" num {...header} />
            <SortHeader label="Chg %" column="changePct" num {...header} />
            <SortHeader label="Zone" column="zone" num {...header} />
            <SortHeader label="Distance" column="distance" num {...header} />
            <SortHeader label="Strength" column="strength" num {...header} />
            <th>Fresh</th>
            <SortHeader label="Touches" column="touches" num {...header} />
            <th>Pattern</th>
            <th>Status</th>
            {sectorsBySlug && <th>Sector</th>}
            <th>Timeframe</th>
            <th aria-label="Open analyzer" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const band = strengthBand(r.zone.strength)
            return (
              <tr
                key={r.symbol}
                className={r.symbol === selectedSymbol ? 'row-clickable active' : 'row-clickable'}
                onClick={() => onSelect(r)}
              >
                <td>
                  <button
                    type="button"
                    className="link-button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelect(r)
                    }}
                  >
                    {r.symbol}
                  </button>
                </td>
                <td className="num">{formatPrice(r.price)}</td>
                <td className={`num ${r.changePct >= 0 ? 'text-demand' : 'text-supply'}`}>{formatPercent(r.changePct)}</td>
                <td className={`num ${r.zone.side === 'demand' ? 'text-demand' : 'text-supply'}`}>
                  {formatRange(r.zone.zoneLow, r.zone.zoneHigh)}
                </td>
                <td className="num">{formatZoneDistance(r.zone)}</td>
                <td className="num">
                  <span className="strength">
                    <span className="strength-bar">
                      <span className={`strength-fill fill-${band.tone}`} style={{ width: `${r.zone.strength}%` }} />
                    </span>
                    {r.zone.strength}
                  </span>
                </td>
                <td>{r.zone.fresh ? 'Yes' : 'No'}</td>
                <td className="num">{r.zone.touches}</td>
                <td>{r.zone.pattern}</td>
                <td>
                  <span className={`badge tone-${ZONE_STATUS[r.zone.status]?.tone ?? 'neutral'}`}>
                    {statusLabel(r.zone.status)}
                  </span>
                </td>
                {sectorsBySlug && (
                  <td>
                    <SectorBadge
                      sector={r.sector}
                      sectorData={sectorsBySlug.get(r.sector?.slug)}
                      timeframe={r.timeframe}
                      side={r.zone.side}
                    />
                  </td>
                )}
                <td>{timeframeLabel(r.timeframe)}</td>
                <td>
                  <Link
                    className="open-link"
                    to={`/analyzer/${encodeURIComponent(r.symbol)}?tf=${r.timeframe}&zone=${encodeURIComponent(r.zone.id)}`}
                    onClick={(e) => e.stopPropagation()}
                    title="Open in analyzer"
                  >
                    Open ↗
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

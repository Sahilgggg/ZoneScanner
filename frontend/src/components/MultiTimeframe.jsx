import { statusLabel, TIMEFRAMES, ZONE_STATUS } from '../utils/constants.js'
import { formatRange } from '../utils/format.js'

function StatusBadge({ status }) {
  if (!status) return <span className="muted">—</span>
  const tone = ZONE_STATUS[status]?.tone ?? 'neutral'
  return <span className={`badge tone-${tone}`}>{statusLabel(status)}</span>
}

// One row per timeframe with the nearest demand and supply zone.
// Expected rows shape (produced by the backend):
// [{ timeframe: 'daily', demand: { zoneLow, zoneHigh, status } | null,
//    supply: { zoneLow, zoneHigh, status } | null }]
// Rows that are missing still render, so clicking a timeframe always works.
export default function MultiTimeframe({ symbol, rows = [], activeTimeframe, onSelect }) {
  const byTimeframe = new Map(rows.map((row) => [row.timeframe, row]))

  return (
    <section className="card">
      <div className="card-header">
        <h2 className="card-title">Multi-timeframe overview · {symbol}</h2>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Timeframe</th>
              <th className="num">Demand</th>
              <th>Demand status</th>
              <th className="num">Supply</th>
              <th>Supply status</th>
            </tr>
          </thead>
          <tbody>
            {TIMEFRAMES.map((tf) => {
              const row = byTimeframe.get(tf.value)
              const isActive = tf.value === activeTimeframe
              return (
                <tr
                  key={tf.value}
                  className={isActive ? 'row-clickable active' : 'row-clickable'}
                  onClick={() => onSelect(tf.value)}
                >
                  <td>
                    <button
                      type="button"
                      className="link-button"
                      aria-current={isActive ? 'true' : undefined}
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelect(tf.value)
                      }}
                    >
                      {tf.label}
                    </button>
                  </td>
                  <td className="num text-demand">{formatRange(row?.demand?.zoneLow, row?.demand?.zoneHigh)}</td>
                  <td>
                    <StatusBadge status={row?.demand?.status} />
                  </td>
                  <td className="num text-supply">{formatRange(row?.supply?.zoneLow, row?.supply?.zoneHigh)}</td>
                  <td>
                    <StatusBadge status={row?.supply?.status} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

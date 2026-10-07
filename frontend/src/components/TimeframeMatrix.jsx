import { CATEGORIES } from '../services/scanner.js'
import { TIMEFRAMES } from '../utils/constants.js'

// Category × timeframe grid of stock counts. Clicking a cell selects that
// timeframe and category together.
export default function TimeframeMatrix({ counts, activeTimeframe, activeCategory, onSelect }) {
  return (
    <section className="card">
      <div className="card-header">
        <h2 className="card-title">All timeframes</h2>
        <span className="muted small">Number of stocks per category</span>
      </div>
      <div className="table-wrap">
        <table className="table matrix">
          <thead>
            <tr>
              <th>Category</th>
              {TIMEFRAMES.map((tf) => (
                <th key={tf.value} className={tf.value === activeTimeframe ? 'num active-col' : 'num'}>
                  {tf.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((c) => (
              <tr key={c.id}>
                <td className={c.side === 'demand' ? 'text-demand' : 'text-supply'}>{c.label}</td>
                {TIMEFRAMES.map((tf) => {
                  const count = counts?.[tf.value]?.[c.id] ?? 0
                  const active = tf.value === activeTimeframe && c.id === activeCategory
                  return (
                    <td key={tf.value} className="num">
                      <button
                        type="button"
                        className={`matrix-cell${active ? ' active' : ''}${count === 0 ? ' zero' : ''}`}
                        onClick={() => onSelect(tf.value, c.id)}
                        aria-label={`${c.label}, ${tf.label}: ${count} stocks`}
                      >
                        {count}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

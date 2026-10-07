import { CATEGORIES } from '../services/scanner.js'

const SIDES = [
  { side: 'demand', title: 'Demand' },
  { side: 'supply', title: 'Supply' },
]

// Two columns of category tiles with stock counts. Clicking a tile selects it.
export default function CategoryBoard({ buckets, activeId, onSelect, loading }) {
  return (
    <div className="board">
      {SIDES.map(({ side, title }) => (
        <section key={side} className={`card board-side board-${side}`}>
          <h2 className="board-title">{title}</h2>
          <div className="board-grid">
            {CATEGORIES.filter((c) => c.side === side).map((c) => (
              <button
                key={c.id}
                type="button"
                className={c.id === activeId ? 'board-tile active' : 'board-tile'}
                aria-pressed={c.id === activeId}
                onClick={() => onSelect(c.id)}
              >
                {loading ? (
                  <span className="board-count-loading" aria-label="Loading" />
                ) : (
                  <span className="board-count">{buckets[c.id]?.length ?? 0}</span>
                )}
                <span className="board-label">{c.label}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

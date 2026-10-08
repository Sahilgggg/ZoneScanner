// Decorative, hand-tuned candlestick illustration for the home page: a
// drop-base-rally demand zone, a supply zone above, and price returning to
// the demand zone and reacting. Pure SVG + CSS animation, no data needed.

// Closing prices on an arbitrary 0–100 scale; each candle opens at the
// previous close.
const CLOSES = [
  72, 70, 70.8, 67, 64.5, 65.2, 61, 57, // drop (leg-in)
  56.2, 56.9, 55.8, 56.5, // base
  61.5, 66.5, 70.5, 73.5, // rally (departure)
  72.6, 75, 74.2, 77, 78.8, 80.1, // grind higher
  80.6, 79.9, // supply base
  75.5, 71.8, // drop away
  70.4, 67.2, 64.6, 62, 59.3, // return to demand
  58.1, 60.2, 62.4, 64.1, 65.6, // rejection, confirmation, reaction
]

const W = 640
const H = 360
const PAD_X = 24
const PAD_TOP = 24
const PAD_BOTTOM = 36
const P_MIN = 52
const P_MAX = 84

const step = (W - PAD_X * 2) / (CLOSES.length + 6) // leaves room for the price tag
const y = (p) => PAD_TOP + ((P_MAX - p) / (P_MAX - P_MIN)) * (H - PAD_TOP - PAD_BOTTOM)
const x = (i) => PAD_X + step * (i + 0.5)

const CANDLES = CLOSES.map((close, i) => {
  const open = i === 0 ? 73.2 : CLOSES[i - 1]
  const wick = 0.45 + ((i * 7) % 4) * 0.28
  let low = Math.min(open, close) - wick
  let high = Math.max(open, close) + wick * 0.8
  if (i >= 8 && i <= 12) low = Math.min(open, close) - 1.9 // wicky base → visible demand zone
  if (i === 22 || i === 23) high = Math.max(open, close) + 1.7 // wicky supply base
  if (i === 31) low = 55.4 // long lower wick into the zone (rejection)
  return { i, open, close, high, low }
})

function zoneFrom(start, end, side) {
  const slice = CANDLES.slice(start, end + 1)
  const legOut = CANDLES[end + 1]
  if (side === 'demand') {
    return {
      top: Math.max(...slice.map((c) => Math.max(c.open, c.close))),
      bottom: Math.min(...slice.map((c) => c.low), legOut.low),
      x: x(start) - step / 2,
    }
  }
  return {
    top: Math.max(...slice.map((c) => c.high), legOut.high),
    bottom: Math.min(...slice.map((c) => Math.min(c.open, c.close))),
    x: x(start) - step / 2,
  }
}

const DEMAND = zoneFrom(8, 11, 'demand')
const SUPPLY = zoneFrom(22, 23, 'supply')
const LAST = CANDLES[CANDLES.length - 1]
const BODY = Math.max(4, step * 0.58)

export default function HeroChart() {
  const zoneRight = W - PAD_X
  return (
    <svg className="hero-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Illustration of a demand zone and a supply zone on a candlestick chart">
      <defs>
        <linearGradient id="hc-demand" x1="0" x2="1">
          <stop offset="0" stopColor="var(--demand)" stopOpacity="0.22" />
          <stop offset="1" stopColor="var(--demand)" stopOpacity="0.08" />
        </linearGradient>
        <linearGradient id="hc-supply" x1="0" x2="1">
          <stop offset="0" stopColor="var(--supply)" stopOpacity="0.2" />
          <stop offset="1" stopColor="var(--supply)" stopOpacity="0.07" />
        </linearGradient>
      </defs>

      {/* grid */}
      {[0, 1, 2, 3, 4].map((k) => {
        const gy = PAD_TOP + (k * (H - PAD_TOP - PAD_BOTTOM)) / 4
        return <line key={k} x1={PAD_X} x2={W - PAD_X} y1={gy} y2={gy} className="hc-grid" />
      })}

      {/* supply zone */}
      <g className="hc-zone hc-zone-supply">
        <rect x={SUPPLY.x} y={y(SUPPLY.top)} width={zoneRight - SUPPLY.x} height={y(SUPPLY.bottom) - y(SUPPLY.top)} fill="url(#hc-supply)" />
        <line x1={SUPPLY.x} x2={zoneRight} y1={y(SUPPLY.bottom)} y2={y(SUPPLY.bottom)} className="hc-edge" />
        <g transform={`translate(${SUPPLY.x + 6}, ${y(SUPPLY.top) - 22})`}>
          <rect width="128" height="18" rx="9" className="hc-pill" />
          <text x="10" y="12.5" className="hc-pill-text">SUPPLY · RBD · 74</text>
        </g>
      </g>

      {/* demand zone */}
      <g className="hc-zone hc-zone-demand">
        <rect x={DEMAND.x} y={y(DEMAND.top)} width={zoneRight - DEMAND.x} height={y(DEMAND.bottom) - y(DEMAND.top)} fill="url(#hc-demand)" />
        <line x1={DEMAND.x} x2={zoneRight} y1={y(DEMAND.top)} y2={y(DEMAND.top)} className="hc-edge" />
        <g transform={`translate(${DEMAND.x + 6}, ${y(DEMAND.bottom) + 8})`}>
          <rect width="138" height="18" rx="9" className="hc-pill" />
          <text x="10" y="12.5" className="hc-pill-text">DEMAND · DBR · 87</text>
        </g>
      </g>

      {/* candles */}
      {CANDLES.map((c) => {
        const up = c.close >= c.open
        const top = y(Math.max(c.open, c.close))
        const bottom = y(Math.min(c.open, c.close))
        return (
          <g key={c.i} className={`hc-candle ${up ? 'hc-up' : 'hc-down'}`} style={{ '--i': c.i }}>
            <line x1={x(c.i)} x2={x(c.i)} y1={y(c.high)} y2={y(c.low)} />
            <rect x={x(c.i) - BODY / 2} y={top} width={BODY} height={Math.max(1.5, bottom - top)} rx="1.5" />
          </g>
        )
      })}

      {/* reaction marker */}
      <g className="hc-marker" transform={`translate(${x(31)}, ${y(55.4) + 14})`}>
        <circle r="10" className="hc-marker-ring" />
        <path d="M0 4V-4M-3.5 -0.5L0 -4l3.5 3.5" className="hc-marker-arrow" />
      </g>

      {/* current price line */}
      <line x1={PAD_X} x2={W - PAD_X} y1={y(LAST.close)} y2={y(LAST.close)} className="hc-price-line" />
      <g transform={`translate(${W - PAD_X - 64}, ${y(LAST.close) - 10})`}>
        <rect width="64" height="20" rx="6" className="hc-price-tag" />
        <text x="32" y="14" textAnchor="middle" className="hc-price-text">
          PRICE
        </text>
      </g>
    </svg>
  )
}

import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import HeroChart from '../components/HeroChart.jsx'
import { IconArrowRight, IconGauge, IconLayers, IconLifecycle, IconRadar, IconSectors, IconZones } from '../components/Icons.jsx'
import StockSearch from '../components/StockSearch.jsx'
import { useSectors } from '../hooks/useSectors.js'
import { DATA_SOURCE } from '../services/marketData.js'
import { statusLabel, ZONE_STATUS } from '../utils/constants.js'
import { analyzerPath, scannerPath } from '../utils/preferences.js'
import { sectorConfirms, sectorZone } from '../utils/sectors.js'

const STATS = [
  { value: '500', label: 'NSE stocks, scanned together' },
  { value: '6', label: 'timeframes, from daily to yearly' },
  { value: '20', label: 'sector indices, built from their members' },
  { value: '12', label: 'live categories, demand and supply' },
]

const FEATURES = [
  {
    icon: IconZones,
    title: 'Demand & supply detection',
    text: 'Finds Rally-Base-Rally, Drop-Base-Rally and their supply mirrors — tight bases followed by an explosive departure, measured in ATR so the same rules hold on every timeframe.',
  },
  {
    icon: IconLifecycle,
    title: 'Zone lifecycle',
    text: 'Each zone moves from New to Fresh, Approaching, In Zone, Reacting, Weakening and Broken. A touch is only a reaction after a rejection and a confirming close.',
  },
  {
    icon: IconGauge,
    title: 'Strength score, 0–100',
    text: 'Departure, base quality, break of structure, volume, freshness, risk/reward and imbalance — every zone shows how its score was made.',
  },
  {
    icon: IconLayers,
    title: 'Every timeframe',
    text: 'Move any chart between 1D, 1W, 1M, 3M, 6M and 1Y in a click, and see where higher-timeframe zones agree with your entry.',
  },
  {
    icon: IconSectors,
    title: 'Sector confirmation',
    text: 'Equal-weighted indices for twenty NSE sectors show when a stock and its whole sector are sitting in the same zone.',
  },
  {
    icon: IconRadar,
    title: 'A market-wide scanner',
    text: 'NIFTY 50, 100, 500 or your own list, sorted into twelve categories. One click opens the chart with the zone already marked.',
  },
]

const STEPS = [
  {
    n: 'i.',
    title: 'Price pauses',
    text: 'One to four small-bodied candles where buyers and sellers are briefly in balance. This is the base.',
  },
  {
    n: 'ii.',
    title: 'Price leaves in a hurry',
    text: 'A strong candle departs the base by at least 1.5× ATR. Orders are left unfilled — the base becomes a zone.',
  },
  {
    n: 'iii.',
    title: 'Price comes back',
    text: 'We follow every touch, rejection and confirming close, and grade the zone as it reacts, weakens or breaks.',
  },
]

const LIFECYCLE = ['FORMED', 'FRESH', 'APPROACHING', 'IN_ZONE', 'REACTING', 'WEAKENING', 'BROKEN']

function SectionLabel({ n, title, lead }) {
  return (
    <header className="section-label">
      <span className="section-num">§ {n}</span>
      <div>
        <h2 className="section-title">{title}</h2>
        {lead && <p className="section-lead">{lead}</p>}
      </div>
    </header>
  )
}

function today() {
  return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function SectorColumn({ title, side, sectors }) {
  return (
    <div className="pulse-col">
      <h3 className={`pulse-title ${side === 'demand' ? 'text-demand' : 'text-supply'}`}>
        {title} <span className="muted">({sectors.length})</span>
      </h3>
      {sectors.length === 0 ? (
        <p className="muted">Nothing in a {side} zone right now.</p>
      ) : (
        <ul className="leader-list">
          {sectors.map((s) => {
            const zone = sectorZone(s, 'daily', side)
            const cat = zone.status === 'REACTING' ? 'reacting' : zone.status === 'IN_ZONE' ? 'in' : 'approaching'
            return (
              <li key={s.slug}>
                <Link to={`/scanner?u=nifty500&tf=daily&sec=${s.slug}&cat=${side}-${cat}`} className="leader-row">
                  <span className="leader-name">{s.name}</span>
                  <span className="leader-dots" aria-hidden="true" />
                  <span className={`badge tone-${ZONE_STATUS[zone.status]?.tone ?? 'neutral'}`}>{statusLabel(zone.status)}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function SectorPulse() {
  const { data, error } = useSectors()
  if (DATA_SOURCE !== 'api' || (error && !data)) return null

  const sectors = data?.sectors ?? []
  const loading = !data || (data.building && sectors.length === 0)

  return (
    <section className="home-section">
      <SectionLabel
        n="03"
        title="Sector pulse, today"
        lead="Live from the scanner: sectors whose own index is approaching, inside or reacting from a zone on the daily chart."
      />
      {loading ? (
        <div className="pulse">
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      ) : (
        <div className="pulse">
          <SectorColumn title="In demand" side="demand" sectors={sectors.filter((s) => sectorConfirms(s, 'daily', 'demand'))} />
          <SectorColumn title="In supply" side="supply" sectors={sectors.filter((s) => sectorConfirms(s, 'daily', 'supply'))} />
        </div>
      )}
    </section>
  )
}

export default function HomePage() {
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'ZoneScanner — Demand & Supply Zones for NSE'
  }, [])

  return (
    <div className="home">
      <div className="dateline">
        <span>{today()}</span>
        <span className="dateline-mid">The NSE price-action edition</span>
        <span>Daily → Yearly</span>
      </div>

      {/* ---------- Hero ---------- */}
      <section className="hero">
        <div className="hero-copy">
          <span className="kicker">Demand &amp; supply, mapped for you</span>
          <h1 className="hero-title">
            See where the <em>big money</em> left its footprints.
          </h1>
          <p className="byline">
            <span className="monograms" aria-hidden="true">
              <span>S</span>
              <span>Y</span>
            </span>
            Built by <strong>Sahil</strong> &amp; <strong>Yash</strong>
          </p>
          <p className="hero-lead">
            ZoneScanner reads the price action of every NIFTY 500 stock on six timeframes, finds the bases where large
            buyers and sellers stepped in, and tells you which demand and supply zones price is approaching, testing or
            reacting from — right now.
          </p>
          <div className="hero-actions">
            <Link to={scannerPath()} className="btn btn-primary btn-lg">
              Open the scanner <IconArrowRight size={18} />
            </Link>
            <Link to={analyzerPath()} className="btn btn-outline btn-lg">
              Analyze a stock
            </Link>
          </div>
          <div className="hero-search">
            <StockSearch onSelect={(symbol) => navigate(`/analyzer/${encodeURIComponent(symbol)}`)} />
          </div>
        </div>

        <figure className="hero-figure">
          <div className="figure-frame">
            <HeroChart />
          </div>
          <figcaption>
            <span className="fig-label">Fig. 1</span>
            Price drops into a tight base and leaves sharply upward — the base becomes a <span className="text-demand">demand
            zone</span> (score 87). Weeks later price returns, is rejected, and reacts.
          </figcaption>
        </figure>
      </section>

      {/* ---------- Ledger ---------- */}
      <section className="ledger">
        {STATS.map((s) => (
          <div key={s.label} className="ledger-cell">
            <span className="ledger-number">{s.value}</span>
            <span className="ledger-caption">{s.label}</span>
          </div>
        ))}
      </section>

      {/* ---------- What it does ---------- */}
      <section className="home-section">
        <SectionLabel
          n="01"
          title="What ZoneScanner does"
          lead="Our own clearly defined, rule-based price-action system. Every rule and weight is written down, so results can be understood, questioned and backtested."
        />
        <div className="feature-grid">
          {FEATURES.map(({ icon: FeatureIcon, title, text }) => (
            <article key={title} className="feature">
              <span className="feature-icon">
                <FeatureIcon size={20} />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="home-section">
        <SectionLabel n="02" title="How a zone is born" />
        <div className="steps">
          {STEPS.map((s) => (
            <article key={s.n} className="step">
              <span className="step-n">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </article>
          ))}
        </div>
        <div className="lifecycle">
          <span className="lifecycle-label">Lifecycle</span>
          <ol className="lifecycle-track">
            {LIFECYCLE.map((key) => (
              <li key={key}>
                <span className={`badge tone-${ZONE_STATUS[key]?.tone ?? 'neutral'}`}>{statusLabel(key)}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <SectorPulse />

      {/* ---------- CTA ---------- */}
      <section className="cta">
        <div>
          <h2>Ready to find your next zone?</h2>
          <p>Scan the market, open any chart and change timeframes in one click.</p>
        </div>
        <Link to={scannerPath()} className="btn btn-primary btn-lg">
          Open the scanner <IconArrowRight size={18} />
        </Link>
      </section>

      <p className="disclaimer">
        ZoneScanner is an educational, rule-based scanning tool — not investment advice. Prices come from a delayed,
        unofficial source; always confirm on your broker&apos;s chart before acting.
      </p>
    </div>
  )
}

import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import HeroChart from '../components/HeroChart.jsx'
import {
  IconArrowRight,
  IconGauge,
  IconLayers,
  IconLifecycle,
  IconRadar,
  IconSectors,
  IconSparkles,
  IconZones,
} from '../components/Icons.jsx'
import StockSearch from '../components/StockSearch.jsx'
import { useSectors } from '../hooks/useSectors.js'
import { DATA_SOURCE } from '../services/marketData.js'
import { statusLabel } from '../utils/constants.js'
import { analyzerPath, scannerPath } from '../utils/preferences.js'
import { sectorConfirms, sectorZone } from '../utils/sectors.js'

const STATS = [
  { value: '500', label: 'NSE stocks scanned' },
  { value: '6', label: 'timeframes, daily → yearly' },
  { value: '20', label: 'sector indices' },
  { value: '12', label: 'live signal categories' },
]

const FEATURES = [
  {
    icon: IconZones,
    title: 'Demand & supply detection',
    text: 'Finds Rally-Base-Rally, Drop-Base-Rally and their supply mirrors — tight bases followed by an explosive departure, measured in ATR so the same rules work on every timeframe.',
  },
  {
    icon: IconLifecycle,
    title: 'Zone lifecycle tracking',
    text: 'Every zone moves from New → Fresh → Approaching → In Zone → Reacting → Weakening → Broken. A touch only counts as a reaction after rejection and a confirmation close.',
  },
  {
    icon: IconGauge,
    title: 'Strength score 0–100',
    text: 'Departure, base quality, break of structure, volume, freshness, risk/reward and imbalance — each zone shows its full score breakdown.',
  },
  {
    icon: IconLayers,
    title: 'Multi-timeframe view',
    text: 'Switch any chart between 1D, 1W, 1M, 3M, 6M and 1Y instantly and see where higher-timeframe zones line up with your entry.',
  },
  {
    icon: IconSectors,
    title: 'Sector confirmation',
    text: 'Equal-weighted indices for 20 NSE sectors reveal when a stock and its whole sector are sitting in the same demand or supply zone.',
  },
  {
    icon: IconRadar,
    title: 'Market-wide scanner',
    text: 'Scan NIFTY 50, 100, 500 or your own list. Stocks are sorted into 12 categories — one click opens the chart with the zone highlighted.',
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Price pauses — the base',
    text: '1–4 small-bodied candles where buyers and sellers are briefly in balance.',
  },
  {
    n: '02',
    title: 'Price explodes — the departure',
    text: 'A strong candle leaves the base by at least 1.5× ATR. Unfilled orders are left behind — that base becomes a zone.',
  },
  {
    n: '03',
    title: 'Price returns — the test',
    text: 'We track every touch, rejection and confirmation candle, and grade the zone as it approaches, reacts, weakens or breaks.',
  },
]

const LIFECYCLE = [
  { key: 'FORMED', tone: 'info' },
  { key: 'FRESH', tone: 'info' },
  { key: 'APPROACHING', tone: 'warn' },
  { key: 'IN_ZONE', tone: 'accent' },
  { key: 'REACTING', tone: 'good' },
  { key: 'WEAKENING', tone: 'muted' },
  { key: 'BROKEN', tone: 'bad' },
]

function SectorPulse() {
  const { data, error } = useSectors()
  if (DATA_SOURCE !== 'api' || (error && !data)) return null

  const sectors = data?.sectors ?? []
  const inDemand = sectors.filter((s) => sectorConfirms(s, 'daily', 'demand'))
  const inSupply = sectors.filter((s) => sectorConfirms(s, 'daily', 'supply'))
  const loading = !data || (data.building && sectors.length === 0)

  const chip = (s, side) => (
    <Link
      key={`${side}-${s.slug}`}
      to={`/scanner?u=nifty500&tf=daily&sec=${s.slug}&cat=${side}-${sectorZone(s, 'daily', side).status === 'REACTING' ? 'reacting' : 'approaching'}`}
      className={`pulse-chip pulse-${side}`}
    >
      <span>{s.name}</span>
      <span className="pulse-status">{statusLabel(sectorZone(s, 'daily', side).status)}</span>
    </Link>
  )

  return (
    <section className="home-section">
      <div className="pulse card-glass">
        <div className="pulse-head">
          <span className="live-dot" aria-hidden="true" />
          <h2>Sector pulse · Daily</h2>
          <span className="muted small">Live from the scanner — sectors whose index is approaching, inside or reacting from a zone</span>
        </div>
        {loading ? (
          <div className="pulse-grid">
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        ) : (
          <div className="pulse-grid">
            <div>
              <h3 className="pulse-title text-demand">In demand ({inDemand.length})</h3>
              <div className="pulse-chips">{inDemand.length ? inDemand.map((s) => chip(s, 'demand')) : <span className="muted">No sector in a demand zone right now.</span>}</div>
            </div>
            <div>
              <h3 className="pulse-title text-supply">In supply ({inSupply.length})</h3>
              <div className="pulse-chips">{inSupply.length ? inSupply.map((s) => chip(s, 'supply')) : <span className="muted">No sector in a supply zone right now.</span>}</div>
            </div>
          </div>
        )}
      </div>
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
      {/* ---------- Hero ---------- */}
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <IconSparkles size={14} /> Price-action zones for NSE stocks
          </span>
          <h1 className="hero-title">
            See where the <span className="grad-text">big money</span> left its footprints.
          </h1>
          <p className="hero-lead">
            ZoneScanner reads the price action of every NIFTY 500 stock on six timeframes, finds the bases where large
            buyers and sellers stepped in, and tells you which demand and supply zones price is approaching, testing or
            reacting from — right now.
          </p>

          <div className="hero-actions">
            <Link to={scannerPath()} className="btn btn-primary btn-lg">
              Launch scanner <IconArrowRight size={18} />
            </Link>
            <Link to={analyzerPath()} className="btn btn-outline btn-lg">
              Analyze a stock
            </Link>
          </div>

          <div className="hero-search">
            <StockSearch onSelect={(symbol) => navigate(`/analyzer/${encodeURIComponent(symbol)}`)} />
          </div>

          <div className="byline">
            <span className="avatars" aria-hidden="true">
              <span className="avatar avatar-s">S</span>
              <span className="avatar avatar-y">Y</span>
            </span>
            <span>
              Built by <strong>Sahil</strong> &amp; <strong>Yash</strong>
            </span>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-frame card-glass">
            <div className="hero-frame-bar">
              <span className="dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="hero-frame-title">EXAMPLE · Daily</span>
              <span className="hero-frame-legend">
                <i className="lg lg-demand" /> Demand <i className="lg lg-supply" /> Supply
              </span>
            </div>
            <HeroChart />
          </div>
          <div className="float-card card-glass" aria-hidden="true">
            <span className="float-label">Demand zone</span>
            <span className="float-score">
              87<small>/100</small>
            </span>
            <span className="badge tone-good">Reacting</span>
          </div>
        </div>
      </section>

      {/* ---------- Stats ---------- */}
      <section className="stats card-glass">
        {STATS.map((s) => (
          <div key={s.label} className="stat-block">
            <span className="stat-number">{s.value}</span>
            <span className="stat-caption">{s.label}</span>
          </div>
        ))}
      </section>

      {/* ---------- What it does ---------- */}
      <section className="home-section">
        <div className="section-head">
          <span className="eyebrow">What ZoneScanner does</span>
          <h2 className="section-title">Everything a zone trader checks — done for 500 stocks at once.</h2>
          <p className="section-lead">
            Our own clearly defined, rule-based price-action system. Every rule and weight is transparent, so the results
            can be understood, questioned and backtested.
          </p>
        </div>
        <div className="feature-grid">
          {FEATURES.map(({ icon: FeatureIcon, title, text }) => (
            <article key={title} className="feature card-glass">
              <span className="feature-icon">
                <FeatureIcon size={22} />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="home-section">
        <div className="section-head">
          <span className="eyebrow">How it works</span>
          <h2 className="section-title">Base. Departure. Return.</h2>
        </div>
        <div className="steps">
          {STEPS.map((s) => (
            <article key={s.n} className="step card-glass">
              <span className="step-n">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </article>
          ))}
        </div>
        <div className="lifecycle card-glass">
          <span className="lifecycle-label">Zone lifecycle</span>
          <div className="lifecycle-track">
            {LIFECYCLE.map((step, i) => (
              <span key={step.key} className="lifecycle-step">
                <span className={`badge tone-${step.tone}`}>{statusLabel(step.key)}</span>
                {i < LIFECYCLE.length - 1 && <IconArrowRight size={14} className="lifecycle-arrow" />}
              </span>
            ))}
          </div>
        </div>
      </section>

      <SectorPulse />

      {/* ---------- CTA ---------- */}
      <section className="home-section">
        <div className="cta card-glass">
          <div>
            <h2>Ready to find your next zone?</h2>
            <p>Scan the market, open any chart and switch timeframes in one click.</p>
          </div>
          <Link to={scannerPath()} className="btn btn-primary btn-lg">
            Open the scanner <IconArrowRight size={18} />
          </Link>
        </div>
        <p className="disclaimer">
          ZoneScanner is an educational, rule-based scanning tool — not investment advice. Prices come from a delayed,
          unofficial source; always confirm on your broker&apos;s chart before acting.
        </p>
      </section>
    </div>
  )
}

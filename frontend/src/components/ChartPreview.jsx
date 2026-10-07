import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAnalysis, getSectorAnalysis } from '../services/marketData.js'
import { patternLabel, statusLabel, strengthBand, TIMEFRAMES, timeframeLabel, ZONE_STATUS } from '../utils/constants.js'
import { formatDate, formatNumber, formatPercent, formatPrice, formatPriceRange, formatRange, formatZoneDistance } from '../utils/format.js'
import SectorBadge from './SectorBadge.jsx'
import StockChart from './StockChart.jsx'
import TimeframeSelector from './TimeframeSelector.jsx'

// Slide-over panel showing a chart with its zones: a stock (`symbol`) or a
// sector index (`sector` = { slug, name }). Prev / Next (or ← / →) step
// through the current result list. The chart opens on the scan's timeframe;
// 1D…1Y (or keys 1–6) switch it.
export default function ChartPreview({
  symbol,
  sector = null,
  stockSector = null,
  sectorData = null,
  timeframe: scanTimeframe,
  zoneId,
  onClose,
  onPrev,
  onNext,
  position,
}) {
  const [timeframe, setTimeframe] = useState(scanTimeframe)
  const isSector = Boolean(sector)
  const title = isSector ? sector.name : symbol
  const key = `${isSector ? `sector:${sector.slug}` : symbol}|${timeframe}`
  const [result, setResult] = useState({ key: null, data: null, error: null })
  const [picked, setPicked] = useState({ key: null, id: null })

  useEffect(() => {
    let cancelled = false
    const load = isSector ? getSectorAnalysis(sector.slug, timeframe) : getAnalysis(symbol, timeframe)
    load
      .then((data) => !cancelled && setResult({ key, data, error: null }))
      .catch((error) => !cancelled && setResult({ key, data: null, error: error.message }))
    return () => {
      cancelled = true
    }
  }, [isSector, sector?.slug, symbol, timeframe, key])

  useEffect(() => {
    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && onPrev) onPrev()
      else if (e.key === 'ArrowRight' && onNext) onNext()
      else if (/^[1-6]$/.test(e.key)) setTimeframe(TIMEFRAMES[Number(e.key) - 1].value)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onPrev, onNext])

  const loading = result.key !== key
  const analysis = loading ? null : result.data
  const zones = useMemo(() => analysis?.zones ?? [], [analysis])
  // The scanner's zone only exists on the scan timeframe.
  const selectedId = picked.key === key ? picked.id : timeframe === scanTimeframe ? zoneId : null
  const zone = zones.find((z) => z.id === selectedId) ?? null
  const quote = analysis?.quote
  const fmt = isSector ? formatNumber : formatPrice

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={`${title} chart`} onClick={(e) => e.stopPropagation()}>
        <header className="drawer-header">
          <div className="price-symbol">
            <h2>{title}</h2>
            <span className="badge tone-neutral">{timeframeLabel(timeframe)}</span>
            {isSector && (
              <span className="muted small">
                Sector index · equal-weighted{analysis?.memberCount ? ` · ${analysis.memberCount} stocks` : ''}
              </span>
            )}
            {quote && (
              <span className="drawer-price">
                {fmt(quote.price)}{' '}
                <span className={quote.change >= 0 ? 'text-demand' : 'text-supply'}>{formatPercent(quote.changePct)}</span>
              </span>
            )}
          </div>
          <div className="drawer-actions">
            {position && <span className="muted small">{position}</span>}
            {(onPrev || onNext || position) && (
              <>
                <button type="button" className="btn btn-ghost btn-sm" onClick={onPrev} disabled={!onPrev} aria-label="Previous">
                  ←
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={onNext} disabled={!onNext} aria-label="Next">
                  →
                </button>
              </>
            )}
            {!isSector && (
              <Link
                className="btn btn-primary btn-sm"
                to={`/analyzer/${encodeURIComponent(symbol)}?tf=${timeframe}${zone ? `&zone=${encodeURIComponent(zone.id)}` : ''}`}
              >
                Open analyzer
              </Link>
            )}
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close chart">
              ✕
            </button>
          </div>
        </header>

        <div className="chart-toolbar">
          <TimeframeSelector value={timeframe} onChange={setTimeframe} compact />
          {!isSector && stockSector && (
            <span className="small">
              Sector:{' '}
              <SectorBadge sector={stockSector} sectorData={sectorData} timeframe={timeframe} side={zone?.side ?? 'demand'} />
            </span>
          )}
          {timeframe !== scanTimeframe && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTimeframe(scanTimeframe)}>
              Back to scan timeframe ({timeframeLabel(scanTimeframe)})
            </button>
          )}
          <span className="muted small chart-toolbar-hint">Keys 1–6 switch timeframe</span>
        </div>

        <div className="chart-holder">
          {result.error && !loading ? (
            <div className="chart-message error-text">{result.error}</div>
          ) : (
            <StockChart
              candles={analysis?.candles}
              zones={zones}
              selectedZoneId={zone?.id}
              onZoneClick={(z) => setPicked({ key, id: z?.id ?? null })}
              height={440}
            />
          )}
          {loading && <div className="chart-loading">Loading {title}…</div>}
        </div>

        {zone ? (
          <div className="drawer-zone">
            <div className={`drawer-zone-title ${zone.side === 'demand' ? 'text-demand' : 'text-supply'}`}>
              {zone.side === 'demand' ? 'Demand' : 'Supply'} {(isSector ? formatRange : formatPriceRange)(zone.zoneLow, zone.zoneHigh)}
            </div>
            <dl className="drawer-facts">
              <div>
                <dt>Status</dt>
                <dd>
                  <span className={`badge tone-${ZONE_STATUS[zone.status]?.tone ?? 'neutral'}`}>{statusLabel(zone.status)}</span>
                </dd>
              </div>
              <div>
                <dt>Strength</dt>
                <dd>
                  {zone.strength}/100 <span className={`tone-${strengthBand(zone.strength).tone}`}>{strengthBand(zone.strength).label}</span>
                </dd>
              </div>
              <div>
                <dt>Pattern</dt>
                <dd>{patternLabel(zone.pattern)}</dd>
              </div>
              <div>
                <dt>Formed</dt>
                <dd>{formatDate(zone.formationDate)}</dd>
              </div>
              <div>
                <dt>Touches</dt>
                <dd>
                  {zone.touches} ({zone.fresh ? 'fresh' : 'used'})
                </dd>
              </div>
              <div>
                <dt>Distance</dt>
                <dd>{formatZoneDistance(zone)}</dd>
              </div>
              <div>
                <dt>Departure</dt>
                <dd>{formatNumber(zone.departureATR)}× ATR</dd>
              </div>
              <div>
                <dt>Confluence</dt>
                <dd>{zone.tags.length ? zone.tags.join(', ') : '—'}</dd>
              </div>
            </dl>
          </div>
        ) : (
          !loading && <p className="muted drawer-hint">Click a zone on the chart to see its details.</p>
        )}
      </aside>
    </div>
  )
}

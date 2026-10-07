import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import ChartPreview from '../components/ChartPreview.jsx'
import MultiTimeframe from '../components/MultiTimeframe.jsx'
import StockChart from '../components/StockChart.jsx'
import StockSearch from '../components/StockSearch.jsx'
import TimeframeSelector from '../components/TimeframeSelector.jsx'
import ZoneInfo from '../components/ZoneInfo.jsx'
import ZoneTable from '../components/ZoneTable.jsx'
import { useSectors } from '../hooks/useSectors.js'
import { DATA_SOURCE, getAnalysis, getMultiTimeframe } from '../services/marketData.js'
import { DEFAULT_SYMBOL, isValidTimeframe, statusLabel, timeframeLabel, ZONE_STATUS } from '../utils/constants.js'
import { formatDate, formatPercent, formatPrice, formatVolume } from '../utils/format.js'
import { getPreferredTimeframe, setPref } from '../utils/preferences.js'
import { sectorConfirms, sectorZone } from '../utils/sectors.js'

// Status of the sector index's demand ("D") or supply ("S") zone; ✓ = confirms.
function SectorSide({ sectorData, timeframe, side }) {
  const zone = sectorZone(sectorData, timeframe, side)
  if (!zone) return null
  const confirms = sectorConfirms(sectorData, timeframe, side)
  return (
    <span className={`badge badge-sm tone-${ZONE_STATUS[zone.status]?.tone ?? 'neutral'}`} title={`Sector ${side} zone`}>
      {side === 'demand' ? 'D' : 'S'}: {confirms && '✓ '}
      {statusLabel(zone.status)}
    </span>
  )
}

// The URL is the source of truth: /analyzer/USHAMART?tf=weekly&zone=<id>
export default function StockAnalyzer() {
  const params = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const symbol = (params.symbol || DEFAULT_SYMBOL).toUpperCase()
  const tfParam = searchParams.get('tf')
  const timeframe = isValidTimeframe(tfParam) ? tfParam : getPreferredTimeframe()
  const viewKey = `${symbol}|${timeframe}`

  // Remember the timeframe (shared with the scanner) and the last stock viewed.
  useEffect(() => {
    setPref('timeframe', timeframe)
  }, [timeframe])
  useEffect(() => {
    setPref('lastSymbol', symbol)
  }, [symbol])

  // { key, data, error } — `loading` is derived: the stored key is not the current one.
  const [result, setResult] = useState({ key: null, data: null, error: null })
  const [mtf, setMtf] = useState({ symbol: null, rows: [] })
  // A zone picked by the user, scoped to one symbol + timeframe. A ?zone= in
  // the URL (from the scanner) preselects one until the user picks another.
  const [picked, setPicked] = useState({ key: null, id: null })

  useEffect(() => {
    let cancelled = false
    getAnalysis(symbol, timeframe)
      .then((data) => !cancelled && setResult({ key: viewKey, data, error: null }))
      .catch((error) => !cancelled && setResult({ key: viewKey, data: null, error: error.message }))
    return () => {
      cancelled = true
    }
  }, [symbol, timeframe, viewKey])

  useEffect(() => {
    let cancelled = false
    getMultiTimeframe(symbol)
      .then((rows) => !cancelled && setMtf({ symbol, rows }))
      .catch(() => !cancelled && setMtf({ symbol, rows: [] }))
    return () => {
      cancelled = true
    }
  }, [symbol])

  const loading = result.key !== viewKey
  const analysis = loading ? null : result.data
  const zones = useMemo(() => analysis?.zones ?? [], [analysis])
  const selectedId = picked.key === viewKey ? picked.id : searchParams.get('zone')
  const selectedZone = zones.find((z) => z.id === selectedId) ?? null

  function openStock(nextSymbol) {
    navigate(`/analyzer/${encodeURIComponent(nextSymbol)}?tf=${timeframe}`)
  }

  function changeTimeframe(nextTimeframe) {
    navigate(`/analyzer/${encodeURIComponent(symbol)}?tf=${nextTimeframe}`)
  }

  function selectZone(zone) {
    setPicked({ key: viewKey, id: zone?.id ?? null })
  }

  const quote = analysis?.quote
  const { bySlug: sectorsBySlug } = useSectors()
  const stockSector = analysis?.sector ?? null
  const sectorData = sectorsBySlug.get(stockSector?.slug)
  const [sectorChartOpen, setSectorChartOpen] = useState(false)
  const changeClass = quote?.change >= 0 ? 'text-demand' : 'text-supply'

  return (
    <div className="analyzer">
      <section className="toolbar">
        <StockSearch key={symbol} value={symbol} onSelect={openStock} />
      </section>

      <section className="price-strip card">
        <div className="price-symbol">
          <h1>{symbol}</h1>
          <span className="badge tone-neutral">NSE</span>
        </div>
        <div className="stat">
          <span className="stat-label">Current price</span>
          <span className="stat-value">
            {formatPrice(quote?.price)}
            {quote && <span className={`stat-change ${changeClass}`}>{formatPercent(quote.changePct)}</span>}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Volume</span>
          <span className="stat-value stat-value-sm">{formatVolume(quote?.volume)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Nearest demand</span>
          <span className="stat-value stat-value-sm text-demand">
            {analysis?.demand ? `${formatPrice(analysis.demand.zoneLow)} – ${formatPrice(analysis.demand.zoneHigh)}` : '—'}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Nearest supply</span>
          <span className="stat-value stat-value-sm text-supply">
            {analysis?.supply ? `${formatPrice(analysis.supply.zoneLow)} – ${formatPrice(analysis.supply.zoneHigh)}` : '—'}
          </span>
        </div>
        {DATA_SOURCE === 'api' && (
          <div className="stat">
            <span className="stat-label">Sector · {timeframeLabel(timeframe)}</span>
            {stockSector ? (
              <button
                type="button"
                className="stat-link stat-value stat-value-sm sector-cell"
                onClick={() => setSectorChartOpen(true)}
                disabled={!sectorData}
                title={sectorData ? 'Open the sector index chart' : 'Sector index is still being built'}
              >
                <span className="sector-name">{stockSector.name}</span>
                <SectorSide sectorData={sectorData} timeframe={timeframe} side="demand" />
                <SectorSide sectorData={sectorData} timeframe={timeframe} side="supply" />
              </button>
            ) : (
              <span className="stat-value stat-value-sm muted">{analysis ? 'Not in NIFTY 500' : '—'}</span>
            )}
          </div>
        )}
        <div className="stat">
          <span className="stat-label">Last candle</span>
          <span className="stat-value stat-value-sm">{formatDate(quote?.date)}</span>
        </div>
      </section>

      <div className="analyzer-grid">
        <section className="card chart-card">
          <div className="card-header chart-header">
            <div className="chart-header-main">
              <h2 className="card-title">
                {symbol} · {timeframeLabel(timeframe)}
                {analysis && <span className="muted small"> · {analysis.candles.length} candles</span>}
              </h2>
              <TimeframeSelector value={timeframe} onChange={changeTimeframe} compact />
            </div>
            <div className="legend">
              <span className="legend-item">
                <span className="swatch swatch-demand" /> Demand
              </span>
              <span className="legend-item">
                <span className="swatch swatch-supply" /> Supply
              </span>
              <span className="legend-item">
                <span className="swatch swatch-broken" /> Broken
              </span>
            </div>
          </div>
          {result.error && !loading ? (
            <div className="chart-message error-text">{result.error}</div>
          ) : (
            <div className="chart-holder">
              <StockChart
                candles={analysis?.candles}
                zones={zones}
                selectedZoneId={selectedZone?.id}
                onZoneClick={selectZone}
              />
              {loading && <div className="chart-loading">Loading {symbol}…</div>}
            </div>
          )}
        </section>
        <ZoneInfo zone={selectedZone} onClose={() => selectZone(null)} />
      </div>

      <ZoneTable zones={zones} selectedZoneId={selectedZone?.id} onSelect={selectZone} />

      {sectorChartOpen && stockSector && (
        <ChartPreview
          key={`sector:${stockSector.slug}|${timeframe}`}
          sector={stockSector}
          timeframe={timeframe}
          onClose={() => setSectorChartOpen(false)}
        />
      )}

      <MultiTimeframe
        symbol={symbol}
        rows={mtf.symbol === symbol ? mtf.rows : []}
        activeTimeframe={timeframe}
        onSelect={changeTimeframe}
      />
    </div>
  )
}

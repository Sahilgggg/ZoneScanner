import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import CategoryBoard from '../components/CategoryBoard.jsx'
import ChartPreview from '../components/ChartPreview.jsx'
import ScanResultsTable from '../components/ScanResultsTable.jsx'
import TimeframeMatrix from '../components/TimeframeMatrix.jsx'
import TimeframeSelector from '../components/TimeframeSelector.jsx'
import { loadCustomList, parseSymbolList, saveCustomList, UNIVERSES } from '../data/universes.js'
import { DATA_SOURCE, getUniverseSymbols } from '../services/marketData.js'
import { categorize, countAllTimeframes, getCategory, runScan, sortRows } from '../services/scanner.js'
import { DEFAULT_TIMEFRAME, isValidTimeframe, timeframeLabel } from '../utils/constants.js'

// Finished scans survive navigation to the analyzer and back.
const scanCache = new Map()

const STRENGTH_FILTERS = [
  { value: 0, label: 'Any strength' },
  { value: 40, label: '40+ (Medium)' },
  { value: 60, label: '60+ (Good)' },
  { value: 80, label: '80+ (Strong)' },
]

const DEFAULT_CATEGORY = 'demand-approaching'

const isAvailable = (u) => !(u.needsRealData && DATA_SOURCE !== 'api')

export default function ScannerPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const uParam = searchParams.get('u')
  const universe = UNIVERSES.some((u) => u.value === uParam && isAvailable(u)) ? uParam : 'nifty50'
  const tfParam = searchParams.get('tf')
  const timeframe = isValidTimeframe(tfParam) ? tfParam : DEFAULT_TIMEFRAME
  const categoryId = getCategory(searchParams.get('cat')) ? searchParams.get('cat') : DEFAULT_CATEGORY
  const minStrength = Number(searchParams.get('min')) || 0
  const category = getCategory(categoryId)

  const [customList, setCustomList] = useState(loadCustomList)
  const [customDraft, setCustomDraft] = useState(() => loadCustomList().join(', '))
  const [editingCustom, setEditingCustom] = useState(false)

  // Index constituents load asynchronously (official NSE list via the backend).
  const [index, setIndex] = useState({ universe: null, symbols: null, source: null, error: null })
  useEffect(() => {
    if (universe === 'custom') return
    let cancelled = false
    getUniverseSymbols(universe)
      .then(({ symbols, source }) => !cancelled && setIndex({ universe, symbols, source, error: null }))
      .catch((error) => !cancelled && setIndex({ universe, symbols: null, source: null, error: error.message }))
    return () => {
      cancelled = true
    }
  }, [universe])

  const indexReady = universe === 'custom' || index.universe === universe
  const indexError = universe !== 'custom' && indexReady ? index.error : null
  const symbols = universe === 'custom' ? customList : indexReady ? index.symbols : null
  const scanKey = symbols ? `${universe}:${symbols.join(',')}` : null

  const [scan, setScan] = useState({ key: null, data: null, error: null })
  const [progress, setProgress] = useState({ key: null, done: 0, total: 0 })
  const [rescanNonce, setRescanNonce] = useState(0)

  const [filterText, setFilterText] = useState('')
  const [sort, setSort] = useState({ key: 'strength', dir: 'desc' })
  const [preview, setPreview] = useState(null) // { symbol, zoneId }

  useEffect(() => {
    if (!symbols || symbols.length === 0 || scanCache.has(scanKey)) return
    const controller = new AbortController()
    runScan(symbols, {
      signal: controller.signal,
      onProgress: (done, total) => setProgress({ key: scanKey, done, total }),
    })
      .then((data) => {
        scanCache.set(scanKey, data)
        setScan({ key: scanKey, data, error: null })
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setScan({ key: scanKey, data: null, error: error.message })
      })
    return () => controller.abort()
  }, [scanKey, symbols, rescanNonce])

  const data = (scanKey && scanCache.get(scanKey)) ?? (scanKey && scan.key === scanKey ? scan.data : null)
  const error = indexError ?? (scanKey && scan.key === scanKey ? scan.error : null)
  const scanning = !data && !error && (symbols === null || symbols.length > 0)
  const total = symbols?.length ?? 0

  const buckets = useMemo(() => categorize(data, timeframe, { minStrength }), [data, timeframe, minStrength])
  const counts = useMemo(() => countAllTimeframes(data, { minStrength }), [data, minStrength])

  const rows = useMemo(() => {
    const q = filterText.trim().toUpperCase()
    const list = buckets[categoryId] ?? []
    return sortRows(q ? list.filter((r) => r.symbol.includes(q)) : list, sort)
  }, [buckets, categoryId, filterText, sort])

  function updateParams(patch) {
    const next = new URLSearchParams(searchParams)
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === undefined || v === '') next.delete(k)
      else next.set(k, String(v))
    }
    setSearchParams(next)
  }

  function handleSort(key) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'symbol' || key === 'distance' ? 'asc' : 'desc' }))
  }

  function rescan() {
    if (!scanKey) return
    scanCache.delete(scanKey)
    setScan({ key: null, data: null, error: null })
    setProgress({ key: scanKey, done: 0, total })
    setRescanNonce((n) => n + 1)
  }

  function saveCustom() {
    const list = parseSymbolList(customDraft)
    if (!list.length) return
    saveCustomList(list)
    setCustomList(list)
    setCustomDraft(list.join(', '))
    setEditingCustom(false)
  }

  // Preview navigation through the visible rows.
  const previewIndex = preview ? rows.findIndex((r) => r.symbol === preview.symbol) : -1
  const openRow = useCallback((r) => setPreview({ symbol: r.symbol, zoneId: r.zone.id }), [])
  const goPrev = previewIndex > 0 ? () => openRow(rows[previewIndex - 1]) : null
  const goNext = previewIndex >= 0 && previewIndex < rows.length - 1 ? () => openRow(rows[previewIndex + 1]) : null
  const closePreview = useCallback(() => setPreview(null), [])

  const progressPct = progress.key === scanKey && progress.total ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div className="scanner">
      <section className="toolbar">
        <div className="toolbar-group">
          <label className="field">
            <span className="field-label">Universe</span>
            <select className="select" value={universe} onChange={(e) => updateParams({ u: e.target.value })}>
              {UNIVERSES.map((u) => (
                <option key={u.value} value={u.value} disabled={!isAvailable(u)}>
                  {u.label}
                  {isAvailable(u) ? '' : ' — needs real data'}
                </option>
              ))}
            </select>
          </label>
          {universe === 'custom' && (
            <button type="button" className="btn btn-ghost" onClick={() => setEditingCustom((v) => !v)}>
              {editingCustom ? 'Close list' : `Edit list (${customList.length})`}
            </button>
          )}
          <label className="field">
            <span className="field-label">Min strength</span>
            <select className="select" value={minStrength} onChange={(e) => updateParams({ min: e.target.value === '0' ? null : e.target.value })}>
              {STRENGTH_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn-ghost" onClick={rescan} disabled={scanning}>
            ↻ Rescan
          </button>
        </div>
        <TimeframeSelector value={timeframe} onChange={(tf) => updateParams({ tf })} />
      </section>

      {universe === 'custom' && editingCustom && (
        <section className="card custom-editor">
          <label htmlFor="custom-list" className="field-label">
            NSE symbols separated by commas, spaces or new lines
          </label>
          <textarea
            id="custom-list"
            className="textarea"
            rows={3}
            value={customDraft}
            onChange={(e) => setCustomDraft(e.target.value)}
          />
          <div className="custom-actions">
            <span className="muted small">{parseSymbolList(customDraft).length} symbols</span>
            <button type="button" className="btn btn-primary" onClick={saveCustom}>
              Save &amp; scan
            </button>
          </div>
        </section>
      )}

      <div className="scan-status">
        {scanning ? (
          <>
            <span>
              {symbols === null
                ? 'Loading index constituents…'
                : `Scanning ${progress.key === scanKey ? progress.done : 0} / ${total} stocks on 6 timeframes…`}
            </span>
            <span className="progress">
              <span className="progress-fill" style={{ width: `${progressPct}%` }} />
            </span>
          </>
        ) : error ? (
          <span className="error-text">Scan failed: {error}</span>
        ) : data ? (
          data.results.length === 0 && data.errors.length > 0 ? (
            <span className="error-text">Scan failed: {data.errors[0].message}</span>
          ) : (
            <span className="muted">
              Scanned {data.results.length} stocks · {data.scannedAt.toLocaleTimeString('en-IN')}
              {DATA_SOURCE === 'demo' ? ' · demo data' : ' · NSE data via Yahoo Finance (delayed)'}
              {universe !== 'custom' && index.source === 'bundled' && ' · NSE list unavailable, using bundled list'}
              {data.errors.length > 0 && (
                <span className="error-text" title={data.errors.map((e) => `${e.symbol}: ${e.message}`).join('\n')}>
                  {' '}
                  · {data.errors.length} failed ({data.errors.slice(0, 5).map((e) => e.symbol).join(', ')}
                  {data.errors.length > 5 ? ', …' : ''})
                </span>
              )}
            </span>
          )
        ) : null}
      </div>

      <CategoryBoard buckets={buckets} activeId={categoryId} onSelect={(cat) => updateParams({ cat })} loading={scanning} />

      <section className="card">
        <div className="card-header results-header">
          <h2 className="card-title">
            <span className={category.side === 'demand' ? 'text-demand' : 'text-supply'}>{category.label}</span>
            <span className="muted"> · {timeframeLabel(timeframe)} · {rows.length} stocks</span>
          </h2>
          <input
            className="input input-sm"
            type="search"
            placeholder="Filter symbol"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            aria-label="Filter results by symbol"
          />
        </div>
        {scanning ? (
          <p className="muted results-empty">Scanning…</p>
        ) : (
          <ScanResultsTable rows={rows} sort={sort} onSort={handleSort} selectedSymbol={preview?.symbol} onSelect={openRow} />
        )}
      </section>

      <TimeframeMatrix
        counts={counts}
        activeTimeframe={timeframe}
        activeCategory={categoryId}
        onSelect={(tf, cat) => updateParams({ tf, cat })}
      />

      {preview && (
        <ChartPreview
          key={`${preview.symbol}|${timeframe}`}
          symbol={preview.symbol}
          timeframe={timeframe}
          zoneId={preview.zoneId}
          onClose={closePreview}
          onPrev={goPrev}
          onNext={goNext}
          position={previewIndex >= 0 ? `${previewIndex + 1} / ${rows.length}` : null}
        />
      )}
    </div>
  )
}

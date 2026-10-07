import { patternLabel, statusLabel, strengthBand, ZONE_STATUS } from '../utils/constants.js'
import { formatDate, formatNumber, formatPrice, formatZoneDistance } from '../utils/format.js'

function yesNo(value) {
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  return '—'
}

function Row({ label, children }) {
  return (
    <div className="detail-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

const FACTOR_LABELS = {
  departure: 'Departure',
  baseQuality: 'Base quality',
  breakOfStructure: 'Break of structure',
  volume: 'Volume',
  freshness: 'Freshness',
  riskReward: 'Risk / reward',
  imbalance: 'Imbalance (FVG)',
  pattern: 'Pattern',
}

// Details of the zone the user clicked on the chart (or in the zone table).
export default function ZoneInfo({ zone, onClose }) {
  if (!zone) {
    return (
      <aside className="card zone-info">
        <div className="card-header">
          <h2 className="card-title">Zone details</h2>
        </div>
        <p className="muted zone-empty">Click a demand or supply zone on the chart to see its details.</p>
      </aside>
    )
  }

  const isDemand = zone.side === 'demand'
  const band = strengthBand(zone.strength)
  const tone = ZONE_STATUS[zone.status]?.tone ?? 'neutral'

  return (
    <aside className={`card zone-info ${isDemand ? 'zone-demand' : 'zone-supply'}`}>
      <div className="card-header">
        <h2 className="card-title">{isDemand ? 'Demand zone' : 'Supply zone'}</h2>
        {onClose && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close zone details">
            ✕
          </button>
        )}
      </div>

      <div className="zone-score">
        <span className="zone-score-value">{formatNumber(zone.strength)}</span>
        <span className="zone-score-max">/100</span>
        <span className={`badge tone-${band.tone}`}>{band.label}</span>
      </div>

      {zone.tags?.length > 0 && (
        <div className="tag-row">
          {zone.tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      <dl className="detail-list">
        <Row label="Status">
          <span className={`badge tone-${tone}`}>{statusLabel(zone.status)}</span>
        </Row>
        <Row label="Zone high">{formatPrice(zone.zoneHigh)}</Row>
        <Row label="Zone low">{formatPrice(zone.zoneLow)}</Row>
        <Row label="Distance">
          {zone.status === 'BROKEN' ? `Broken ${formatDate(zone.brokenDate)}` : formatZoneDistance(zone)}
        </Row>
        <Row label="Formation date">{formatDate(zone.formationDate)}</Row>
        <Row label="Pattern">{patternLabel(zone.pattern)}</Row>
        <Row label="Base candles">{formatNumber(zone.baseCandles)}</Row>
        <Row label="Fresh / used">{zone.fresh ? 'Fresh' : 'Used'}</Row>
        <Row label="Touches">{formatNumber(zone.touches)}</Row>
        <Row label="Departure strength">{formatNumber(zone.departureATR)}× ATR</Row>
        <Row label="Volume confirmation">
          {yesNo(zone.volumeConfirmed)} ({formatNumber(zone.volumeRatio)}×)
        </Row>
        <Row label="Break of structure">{yesNo(zone.breakOfStructure)}</Row>
      </dl>

      {zone.scoreBreakdown && (
        <details className="score-breakdown">
          <summary>Score breakdown</summary>
          <dl className="detail-list">
            {Object.entries(zone.scoreBreakdown).map(([key, value]) => (
              <Row key={key} label={FACTOR_LABELS[key] ?? key}>
                {formatNumber(value)}
              </Row>
            ))}
          </dl>
        </details>
      )}
    </aside>
  )
}

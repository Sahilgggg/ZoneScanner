// Lightweight Charts "series primitive" that draws demand/supply zones as
// rectangles behind the candles and supports click hit-testing.
//
// A zone rectangle starts at its first base candle and extends to the right
// edge of the chart (active zones) or to the candle that broke it.

const COLORS = {
  demand: { fill: 'rgba(45, 212, 191, 0.14)', fillSelected: 'rgba(45, 212, 191, 0.3)', line: 'rgba(45, 212, 191, 0.9)' },
  supply: { fill: 'rgba(251, 113, 133, 0.14)', fillSelected: 'rgba(251, 113, 133, 0.3)', line: 'rgba(251, 113, 133, 0.9)' },
  broken: { fill: 'rgba(148, 163, 184, 0.08)', fillSelected: 'rgba(148, 163, 184, 0.22)', line: 'rgba(148, 163, 184, 0.65)' },
}

class ZonesRenderer {
  constructor(rects) {
    this._rects = rects
  }

  draw(target) {
    target.useBitmapCoordinateSpace(({ context: ctx, horizontalPixelRatio: hr, verticalPixelRatio: vr }) => {
      ctx.save()
      ctx.font = `600 ${Math.round(10.5 * vr)}px 'JetBrains Mono', ui-monospace, monospace`
      ctx.textBaseline = 'top'
      for (const r of this._rects) {
        const colors = r.zone.status === 'BROKEN' ? COLORS.broken : COLORS[r.zone.side]
        const x = Math.round(r.x * hr)
        const y = Math.round(r.y * vr)
        const w = Math.max(1, Math.round(r.w * hr))
        const h = Math.max(1, Math.round(r.h * vr))

        ctx.fillStyle = r.selected ? colors.fillSelected : colors.fill
        ctx.fillRect(x, y, w, h)

        ctx.strokeStyle = colors.line
        ctx.lineWidth = (r.selected ? 2 : 1) * hr
        ctx.setLineDash(r.zone.status === 'BROKEN' ? [4 * hr, 3 * hr] : [])
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)

        if (r.w > 90 && r.h > 12) {
          ctx.fillStyle = colors.line
          const label = `${r.zone.side === 'demand' ? 'D' : 'S'} · ${r.zone.pattern} · ${r.zone.strength}`
          ctx.fillText(label, x + 4 * hr, y + 2 * vr)
        }
      }
      ctx.restore()
    })
  }
}

class ZonesPaneView {
  constructor(source) {
    this._source = source
    this._rects = []
  }

  update() {
    const { chart, series, zones, selectedId } = this._source
    if (!chart || !series) {
      this._rects = []
      return
    }
    const timeScale = chart.timeScale()
    const rightEdge = timeScale.width()
    const rects = []
    for (const zone of zones) {
      const x1 = timeScale.logicalToCoordinate(zone.baseStart)
      const x2 = zone.brokenIndex >= 0 ? timeScale.logicalToCoordinate(zone.brokenIndex) : rightEdge
      const y1 = series.priceToCoordinate(zone.zoneHigh)
      const y2 = series.priceToCoordinate(zone.zoneLow)
      if (x1 === null || x2 === null || y1 === null || y2 === null) continue
      const left = Math.max(Math.min(x1, x2), -10)
      const right = Math.min(Math.max(x1, x2), rightEdge)
      if (right <= left) continue
      rects.push({
        x: left,
        y: Math.min(y1, y2),
        w: right - left,
        h: Math.max(Math.abs(y2 - y1), 2),
        zone,
        selected: zone.id === selectedId,
      })
    }
    this._rects = rects
  }

  rects() {
    return this._rects
  }

  zOrder() {
    return 'bottom'
  }

  renderer() {
    return new ZonesRenderer(this._rects)
  }
}

export class ZonesPrimitive {
  constructor() {
    this.chart = null
    this.series = null
    this.zones = []
    this.selectedId = null
    this._requestUpdate = null
    this._view = new ZonesPaneView(this)
    this._views = [this._view]
  }

  attached({ chart, series, requestUpdate }) {
    this.chart = chart
    this.series = series
    this._requestUpdate = requestUpdate
  }

  detached() {
    this.chart = null
    this.series = null
    this._requestUpdate = null
  }

  setZones(zones, selectedId) {
    this.zones = zones ?? []
    this.selectedId = selectedId ?? null
    this._requestUpdate?.()
  }

  updateAllViews() {
    this._view.update()
  }

  paneViews() {
    return this._views
  }

  // Returns the zone under a point (smallest one if several overlap).
  hitTest(x, y) {
    let best = null
    for (const r of this._view.rects()) {
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        if (!best || r.w * r.h < best.w * best.h) best = r
      }
    }
    return best?.zone ?? null
  }
}

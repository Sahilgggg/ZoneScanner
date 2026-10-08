// Lightweight Charts "series primitive" that draws demand/supply zones as
// rectangles behind the candles and supports click hit-testing.
//
// A zone rectangle starts at its first base candle and extends to the right
// edge of the chart (active zones) or to the candle that broke it.

// Fallback colors; the chart passes theme colors in via setColors().
const DEFAULT_COLORS = {
  demand: { fill: 'rgba(63, 125, 92, 0.12)', fillSelected: 'rgba(63, 125, 92, 0.26)', line: 'rgba(63, 125, 92, 0.85)' },
  supply: { fill: 'rgba(180, 83, 58, 0.12)', fillSelected: 'rgba(180, 83, 58, 0.26)', line: 'rgba(180, 83, 58, 0.85)' },
  broken: { fill: 'rgba(122, 119, 109, 0.08)', fillSelected: 'rgba(122, 119, 109, 0.2)', line: 'rgba(122, 119, 109, 0.6)' },
}

class ZonesRenderer {
  constructor(rects, colors) {
    this._rects = rects
    this._colors = colors
  }

  draw(target) {
    target.useBitmapCoordinateSpace(({ context: ctx, horizontalPixelRatio: hr, verticalPixelRatio: vr }) => {
      ctx.save()
      ctx.font = `500 ${Math.round(10.5 * vr)}px 'IBM Plex Mono', ui-monospace, monospace`
      ctx.textBaseline = 'top'
      for (const r of this._rects) {
        const colors = r.zone.status === 'BROKEN' ? this._colors.broken : this._colors[r.zone.side]
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
          // keep the label inside the visible pane when the zone starts off-screen
          ctx.fillText(label, Math.max(x, 0) + 4 * hr, y + 2 * vr)
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
    return new ZonesRenderer(this._rects, this._source.colors)
  }
}

export class ZonesPrimitive {
  constructor() {
    this.chart = null
    this.series = null
    this.zones = []
    this.selectedId = null
    this.colors = DEFAULT_COLORS
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

  setColors(colors) {
    this.colors = colors ?? DEFAULT_COLORS
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

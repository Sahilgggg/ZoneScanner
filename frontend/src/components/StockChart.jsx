import { CandlestickSeries, ColorType, createChart, CrosshairMode, HistogramSeries } from 'lightweight-charts'
import { useEffect, useRef, useState } from 'react'
import { ZonesPrimitive } from '../chart/zonesPrimitive.js'
import { useTheme } from '../hooks/useTheme.js'
import { formatNumber, formatVolume } from '../utils/format.js'

const VISIBLE_CANDLES = 160

// Chart colors come from the CSS theme variables (index.css), so the chart
// follows the light/dark theme.
function readChartColors() {
  const css = getComputedStyle(document.documentElement)
  const v = (name) => css.getPropertyValue(name).trim()
  return {
    text: v('--chart-text'),
    grid: v('--chart-grid'),
    border: v('--chart-border'),
    up: v('--chart-up'),
    down: v('--chart-down'),
    volUp: v('--chart-vol-up'),
    volDown: v('--chart-vol-down'),
    crosshair: v('--chart-crosshair'),
    label: v('--chart-label'),
    zones: {
      demand: { fill: v('--zone-demand-fill'), fillSelected: v('--zone-demand-fill-sel'), line: v('--zone-demand-line') },
      supply: { fill: v('--zone-supply-fill'), fillSelected: v('--zone-supply-fill-sel'), line: v('--zone-supply-line') },
      broken: { fill: v('--zone-broken-fill'), fillSelected: v('--zone-broken-fill-sel'), line: v('--zone-broken-line') },
    },
  }
}

function volumeData(candles, colors) {
  return candles.map((c) => ({ time: c.time, value: c.volume, color: c.close >= c.open ? colors.volUp : colors.volDown }))
}

// Interactive candlestick chart with volume, zone rectangles, crosshair,
// zoom/pan and a current-price line. Click a zone to select it.
export default function StockChart({ candles, zones, selectedZoneId, onZoneClick, height = 520 }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const candlesRef = useRef([])
  const onZoneClickRef = useRef(onZoneClick)
  const [hover, setHover] = useState(null)
  const [theme] = useTheme()

  useEffect(() => {
    onZoneClickRef.current = onZoneClick
  }, [onZoneClick])

  // Create the chart once.
  useEffect(() => {
    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
        fontSize: 11,
        attributionLogo: false,
      },
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: { rightOffset: 6 },
    })

    const candleSeries = chart.addSeries(CandlestickSeries, {
      borderVisible: false,
      priceLineVisible: true,
      lastValueVisible: true,
    })
    candleSeries.priceScale().applyOptions({ scaleMargins: { top: 0.06, bottom: 0.24 } })

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
      lastValueVisible: false,
      priceLineVisible: false,
    })
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })

    const zonesPrimitive = new ZonesPrimitive()
    candleSeries.attachPrimitive(zonesPrimitive)

    const handleClick = (param) => {
      if (!param.point) return
      onZoneClickRef.current?.(zonesPrimitive.hitTest(param.point.x, param.point.y))
    }
    const handleMove = (param) => {
      const bar = param.seriesData.get(candleSeries)
      const vol = param.seriesData.get(volumeSeries)
      setHover(bar ? { ...bar, volume: vol?.value } : null)
    }
    chart.subscribeClick(handleClick)
    chart.subscribeCrosshairMove(handleMove)

    chartRef.current = { chart, candleSeries, volumeSeries, zonesPrimitive }
    return () => {
      chart.unsubscribeClick(handleClick)
      chart.unsubscribeCrosshairMove(handleMove)
      chart.remove()
      chartRef.current = null
    }
  }, [])

  // Apply theme colors (runs on mount and whenever the theme changes).
  useEffect(() => {
    const api = chartRef.current
    if (!api) return
    const colors = readChartColors()
    api.colors = colors
    api.chart.applyOptions({
      layout: { textColor: colors.text },
      grid: { vertLines: { color: colors.grid }, horzLines: { color: colors.grid } },
      crosshair: {
        vertLine: { color: colors.crosshair, labelBackgroundColor: colors.label },
        horzLine: { color: colors.crosshair, labelBackgroundColor: colors.label },
      },
      rightPriceScale: { borderColor: colors.border },
      timeScale: { borderColor: colors.border },
    })
    api.candleSeries.applyOptions({
      upColor: colors.up,
      downColor: colors.down,
      wickUpColor: colors.up,
      wickDownColor: colors.down,
    })
    api.zonesPrimitive.setColors(colors.zones)
    if (candlesRef.current.length) api.volumeSeries.setData(volumeData(candlesRef.current, colors))
  }, [theme])

  // Load candles + volume.
  useEffect(() => {
    const api = chartRef.current
    if (!api) return
    const list = candles ?? []
    candlesRef.current = list
    api.candleSeries.setData(list.map(({ time, open, high, low, close }) => ({ time, open, high, low, close })))
    api.volumeSeries.setData(volumeData(list, api.colors ?? readChartColors()))
    if (list.length) {
      api.chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, list.length - VISIBLE_CANDLES), to: list.length + 4 })
    }
  }, [candles])

  // Draw zones.
  useEffect(() => {
    chartRef.current?.zonesPrimitive.setZones(zones, selectedZoneId)
  }, [zones, selectedZoneId])

  const last = candles?.[candles.length - 1]
  const shown = hover ?? (last ? { ...last } : null)

  return (
    <div className="chart-wrap" style={{ '--chart-h': `${height}px` }}>
      {shown && (
        <div className="chart-ohlc">
          <span>{shown.time}</span>
          <span>O <b>{formatNumber(shown.open)}</b></span>
          <span>H <b>{formatNumber(shown.high)}</b></span>
          <span>L <b>{formatNumber(shown.low)}</b></span>
          <span>C <b className={shown.close >= shown.open ? 'text-demand' : 'text-supply'}>{formatNumber(shown.close)}</b></span>
          <span>Vol <b>{formatVolume(shown.volume)}</b></span>
        </div>
      )}
      <div ref={containerRef} className="chart-canvas" />
    </div>
  )
}

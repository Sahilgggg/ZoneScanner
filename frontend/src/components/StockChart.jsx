import { CandlestickSeries, ColorType, createChart, CrosshairMode, HistogramSeries } from 'lightweight-charts'
import { useEffect, useRef, useState } from 'react'
import { ZonesPrimitive } from '../chart/zonesPrimitive.js'
import { formatNumber, formatVolume } from '../utils/format.js'

const UP = '#2dd4bf'
const DOWN = '#fb7185'
const VISIBLE_CANDLES = 160

// Interactive candlestick chart with volume, zone rectangles, crosshair,
// zoom/pan and a current-price line. Click a zone to select it.
export default function StockChart({ candles, zones, selectedZoneId, onZoneClick, height = 520 }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const onZoneClickRef = useRef(onZoneClick)
  const [hover, setHover] = useState(null)

  useEffect(() => {
    onZoneClickRef.current = onZoneClick
  }, [onZoneClick])

  // Create the chart once.
  useEffect(() => {
    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#8492a9',
        fontFamily: 'Inter, system-ui, Segoe UI, Roboto, sans-serif',
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: 'rgba(148, 163, 184, 0.06)' },
        horzLines: { color: 'rgba(148, 163, 184, 0.06)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(124, 131, 255, 0.5)', labelBackgroundColor: '#4f56d6' },
        horzLine: { color: 'rgba(124, 131, 255, 0.5)', labelBackgroundColor: '#4f56d6' },
      },
      rightPriceScale: { borderColor: 'rgba(148, 163, 184, 0.15)' },
      timeScale: { borderColor: 'rgba(148, 163, 184, 0.15)', rightOffset: 6 },
    })

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: UP,
      downColor: DOWN,
      wickUpColor: UP,
      wickDownColor: DOWN,
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

  // Load candles + volume.
  useEffect(() => {
    const api = chartRef.current
    if (!api) return
    const list = candles ?? []
    api.candleSeries.setData(list.map(({ time, open, high, low, close }) => ({ time, open, high, low, close })))
    api.volumeSeries.setData(
      list.map((c) => ({
        time: c.time,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(45, 212, 191, 0.35)' : 'rgba(251, 113, 133, 0.35)',
      })),
    )
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

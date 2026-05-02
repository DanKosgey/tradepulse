/**
 * Charts.jsx
 *
 * Two rendering strategies:
 *  - DERIV-native symbols  → Deriv ticks_history (candles) via WebSocket
 *                            rendered as a canvas candlestick chart
 *  - Exchange symbols      → TradingView embedded widget
 *
 * Symbol selector shows ALL symbols grouped by market / category.
 * Live Deriv tick price is always shown in the header (via WS subscription).
 */

import { useEffect, useRef, useState, useCallback, memo } from 'react'
import { SYMBOLS, TV_SYMBOL_MAP, DERIV_NATIVE_SYMBOLS } from '../deriv'
import { useDeriv } from '../context/DerivContext'
import { Search, ChevronRight, Wifi } from 'lucide-react'

// ─── Interval config ───────────────────────────────────────────────────────────

/**
 * Each entry has:
 *  - label  : display string
 *  - tv     : TradingView interval string
 *  - deriv  : Deriv ticks_history granularity (seconds); null = tick style
 */
const INTERVALS = [
  { label: 'Ticks', tv: null,  deriv: null  },   // tick-by-tick for Deriv native
  { label: '1m',   tv: '1',   deriv: 60    },
  { label: '5m',   tv: '5',   deriv: 300   },
  { label: '15m',  tv: '15',  deriv: 900   },
  { label: '1H',   tv: '60',  deriv: 3600  },
  { label: '4H',   tv: '240', deriv: 14400 },
  { label: '1D',   tv: 'D',   deriv: 86400 },
]

// ─── Canvas Candlestick Chart ─────────────────────────────────────────────────
const CandleChart = memo(function CandleChart({ candles, ticks, mode }) {
  const ref    = useRef(null)
  const rafRef = useRef(null)
  const size   = useRef({ w: 0, h: 0, dpr: 1 })

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const ro = new ResizeObserver(([e]) => {
      const dpr = window.devicePixelRatio || 1
      const { width: w, height: h } = e.contentRect
      size.current = { w, h, dpr }
      canvas.width  = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.scale(dpr, dpr)
    })
    ro.observe(canvas)

    const draw = () => {
      const { w: W, h: H } = size.current
      if (W === 0 || H === 0) { rafRef.current = requestAnimationFrame(draw); return }

      ctx.clearRect(0, 0, W, H)

      // Draw background grid
      ctx.strokeStyle = 'rgba(255,255,255,0.03)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let i = 0; i <= 5; i++) {
        const y = H * 0.05 + (i / 5) * H * 0.88
        ctx.moveTo(40, y); ctx.lineTo(W - 4, y)
      }
      ctx.stroke()

      if (mode === 'ticks') {
        // ── Tick line chart ──────────────────────────────────────────────────
        const data = ticks
        if (data.length < 2) { rafRef.current = requestAnimationFrame(draw); return }

        const prices = data.map(d => d.quote)
        const min = Math.min(...prices), max = Math.max(...prices)
        const range = max - min || 1
        const padX = 48, padY = 20
        const chartW = W - padX - 4, chartH = H - padY * 2
        const toX = i  => padX + (i / (data.length - 1)) * chartW
        const toY = p  => padY + (1 - (p - min) / range) * chartH

        // Area fill
        const grad = ctx.createLinearGradient(0, padY, 0, padY + chartH)
        grad.addColorStop(0, 'rgba(0,200,128,0.18)')
        grad.addColorStop(1, 'rgba(0,200,128,0)')
        ctx.beginPath()
        data.forEach((d, i) => { const x = toX(i), y = toY(d.quote); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) })
        ctx.lineTo(toX(data.length - 1), padY + chartH)
        ctx.lineTo(toX(0), padY + chartH)
        ctx.closePath()
        ctx.fillStyle = grad; ctx.fill()

        // Line
        ctx.beginPath()
        ctx.strokeStyle = '#00C880'; ctx.lineWidth = 1.8; ctx.lineJoin = 'round'
        data.forEach((d, i) => { const x = toX(i), y = toY(d.quote); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) })
        ctx.stroke()

        // Last price dot
        const lx = toX(data.length - 1), ly = toY(prices.at(-1))
        ctx.beginPath(); ctx.arc(lx, ly, 3.5, 0, Math.PI * 2)
        ctx.fillStyle = '#00C880'; ctx.fill()
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.stroke()

        // Y labels
        ctx.font = '10px monospace'; ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.textAlign = 'right'
        ctx.fillText(max.toFixed(3), padX - 6, padY + 4)
        ctx.fillText(min.toFixed(3), padX - 6, padY + chartH + 4)

      } else {
        // ── Candlestick chart ────────────────────────────────────────────────
        const data = candles
        if (data.length < 2) { rafRef.current = requestAnimationFrame(draw); return }

        const highs = data.map(d => d.high), lows = data.map(d => d.low)
        const min = Math.min(...lows), max = Math.max(...highs)
        const range = max - min || 1

        const padX = 52, padY = 20
        const chartW = W - padX - 4, chartH = H - padY * 2
        const toY = p => padY + (1 - (p - min) / range) * chartH

        const N = data.length
        const candleW = Math.max(2, Math.min(16, (chartW / N) * 0.7))
        const spacing = chartW / N

        data.forEach((c, i) => {
          const x = padX + (i + 0.5) * spacing
          const isUp = c.close >= c.open
          const color = isUp ? '#00C880' : '#ff3b5c'

          // Wick
          ctx.strokeStyle = color; ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(x, toY(c.high)); ctx.lineTo(x, toY(c.low))
          ctx.stroke()

          // Body
          const top    = toY(Math.max(c.open, c.close))
          const bottom = toY(Math.min(c.open, c.close))
          const bodyH  = Math.max(1.5, bottom - top)
          ctx.fillStyle = isUp ? 'rgba(0,200,128,0.85)' : 'rgba(255,59,92,0.85)'
          ctx.fillRect(x - candleW / 2, top, candleW, bodyH)
        })

        // Y-axis labels
        const ticks5 = 5
        ctx.font = '10px monospace'; ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.textAlign = 'right'
        for (let i = 0; i <= ticks5; i++) {
          const price = min + (i / ticks5) * range
          const y = toY(price)
          ctx.fillText(price.toFixed(3), padX - 6, y + 3)
          ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 1
          ctx.beginPath(); ctx.moveTo(padX, y); ctx.lineTo(W - 4, y); ctx.stroke()
        }
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect() }
  }, [candles, ticks, mode])

  return <canvas ref={ref} className="w-full h-full block" />
})

// ─── TradingView Widget ────────────────────────────────────────────────────────
function TVChart({ tvSymbol, interval }) {
  const ref = useRef(null)

  useEffect(() => {
    const container = ref.current
    if (!container) return

    const init = () => {
      if (!window.TradingView || !document.getElementById('tv_chart')) return
      container.innerHTML = ''
      new window.TradingView.widget({
        autosize: true,
        symbol: tvSymbol,
        interval: interval || '5',
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        locale: 'en',
        toolbar_bg: 'rgba(4,10,6,1)',
        enable_publishing: false,
        hide_top_toolbar: false,
        save_image: false,
        container_id: 'tv_chart',
        backgroundColor: 'rgba(4,10,6,1)',
        gridColor: 'rgba(255,255,255,0.04)',
        studies: ['MASimple@tv-basicstudies', 'RSI@tv-basicstudies'],
      })
    }

    if (!window.TradingView) {
      const existing = document.getElementById('tv-script')
      if (existing) { setTimeout(init, 200) }
      else {
        const s = document.createElement('script')
        s.id = 'tv-script'
        s.src = 'https://s3.tradingview.com/tv.js'
        s.async = true
        s.onload = init
        document.head.appendChild(s)
      }
    } else {
      setTimeout(init, 100)
    }

    return () => { if (container) container.innerHTML = '' }
  }, [tvSymbol, interval])

  return <div id="tv_chart" ref={ref} className="w-full h-full" />
}

// ─── Symbol list sidebar ───────────────────────────────────────────────────────
const MARKETS = [...new Set(SYMBOLS.map(s => s.market))]
const getCategories = mkt => [...new Set(SYMBOLS.filter(s => s.market === mkt).map(s => s.category))]
const getSymbolsByCat = cat => SYMBOLS.filter(s => s.category === cat)

function SymbolSidebar({ selected, onSelect, latestTick }) {
  const [market, setMarket] = useState('Derived')
  const [query, setQuery]   = useState('')

  const filtered = query
    ? SYMBOLS.filter(s => s.label.toLowerCase().includes(query.toLowerCase()) || s.value.toLowerCase().includes(query.toLowerCase()))
    : null

  const displayList = filtered || SYMBOLS.filter(s => s.market === market)
  const categories  = filtered ? null : getCategories(market)

  return (
    <div className="flex flex-col h-full border-r border-white/5 w-56 shrink-0" style={{ background: '#050c07' }}>
      {/* Search */}
      <div className="p-3 border-b border-white/5">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/8 bg-white/3">
          <Search className="w-3 h-3 text-white/20 shrink-0" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search symbol…"
            className="bg-transparent text-xs text-white outline-none w-full placeholder-white/20"
          />
        </div>
      </div>

      {/* Market tabs */}
      {!query && (
        <div className="flex border-b border-white/5 shrink-0">
          {MARKETS.map(m => (
            <button key={m} onClick={() => setMarket(m)}
              className={`flex-1 py-2 text-[9px] font-mono uppercase tracking-widest transition-colors truncate px-1
                ${market === m ? 'text-accent border-b border-accent' : 'text-white/25 hover:text-white/60'}`}>
              {m === 'Cryptocurrencies' ? 'Crypto' : m}
            </button>
          ))}
        </div>
      )}

      {/* Symbol list */}
      <div className="flex-1 overflow-y-auto">
        {categories ? categories.map(cat => (
          <div key={cat}>
            <div className="px-3 py-1.5 text-[8px] font-mono uppercase tracking-widest text-white/20 bg-white/[0.01] sticky top-0">
              {cat}
            </div>
            {getSymbolsByCat(cat).map(sym => {
              const tick = latestTick[sym.value]
              return (
                <button key={sym.value} onClick={() => onSelect(sym.value)}
                  className={`w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-all text-left group
                    ${selected === sym.value ? 'bg-accent/8 border-l-2 border-accent' : ''}`}>
                  <div className="min-w-0">
                    <div className={`text-[11px] font-medium truncate ${selected === sym.value ? 'text-accent' : 'text-white/70 group-hover:text-white'}`}>
                      {sym.label}
                    </div>
                    <div className="text-[9px] font-mono text-white/20">{sym.value}</div>
                  </div>
                  {tick && (
                    <span className="text-[10px] font-mono text-accent shrink-0 ml-1">{tick.quote.toFixed(2)}</span>
                  )}
                </button>
              )
            })}
          </div>
        )) : displayList.map(sym => {
          const tick = latestTick[sym.value]
          return (
            <button key={sym.value} onClick={() => onSelect(sym.value)}
              className={`w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-all text-left group
                ${selected === sym.value ? 'bg-accent/8 border-l-2 border-accent' : ''}`}>
              <div className="min-w-0">
                <div className={`text-[11px] font-medium truncate ${selected === sym.value ? 'text-accent' : 'text-white/70 group-hover:text-white'}`}>
                  {sym.label}
                </div>
                <div className="text-[9px] font-mono text-white/20">{sym.value}</div>
              </div>
              {tick && (
                <span className="text-[10px] font-mono text-accent shrink-0 ml-1">{tick.quote.toFixed(2)}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Chart Page ───────────────────────────────────────────────────────────
export default function Charts() {
  const { latestTick, tickHistory, ws, forgetStream, isAuthorized } = useDeriv()

  const [symbol,   setSymbol]   = useState('R_100')
  const [interval, setInterval] = useState(INTERVALS[2]) // 5m default

  // Deriv candle data fetched via ticks_history
  const [candles,  setCandles]  = useState([])
  const [loading,  setLoading]  = useState(false)

  // Track our own tick stream for the price badge
  const tickStreamId = useRef(null)

  const isNative = DERIV_NATIVE_SYMBOLS.has(symbol)
  const tvSymbol = TV_SYMBOL_MAP[symbol] || `DERIV:${symbol}`

  // ── Subscribe to live ticks for the price badge ──────────────────────────────
  useEffect(() => {
    if (tickStreamId.current) { forgetStream(tickStreamId.current); tickStreamId.current = null }
    const reqId = ws.send({ ticks: symbol, subscribe: 1 })
    const unsub = ws.subscribe('tick', msg => {
      if (msg.error || !msg.tick || msg.tick.symbol !== symbol) return
      if (msg.subscription?.id && msg.req_id === reqId) tickStreamId.current = msg.subscription.id
    })
    return () => { unsub(); if (tickStreamId.current) { forgetStream(tickStreamId.current); tickStreamId.current = null } }
  }, [symbol, ws, forgetStream])

  // ── Fetch Deriv candle history for native symbols ────────────────────────────
  const fetchDerivCandles = useCallback(() => {
    if (!isNative || !isAuthorized) return
    setLoading(true)
    setCandles([])

    const granularity = interval.deriv

    if (!granularity) {
      // Tick mode — use tickHistory from context
      setLoading(false)
      return
    }

    const reqId = ws.send({
      ticks_history: symbol,
      end: 'latest',
      count: 200,
      style: 'candles',
      granularity,
      subscribe: 1,
    })

    const unsubCandles = ws.subscribe('candles', msg => {
      if (msg.error || !msg.candles) return
      setCandles(msg.candles.map(c => ({
        epoch: c.epoch,
        open:  parseFloat(c.open),
        high:  parseFloat(c.high),
        low:   parseFloat(c.low),
        close: parseFloat(c.close),
      })))
      setLoading(false)
    })

    // Also handle ohlc subscription updates
    const unsubOHLC = ws.subscribe('ohlc', msg => {
      if (msg.error || !msg.ohlc) return
      const c = msg.ohlc
      if (c.symbol !== symbol) return
      setCandles(prev => {
        if (!prev.length) return prev
        const last = prev[prev.length - 1]
        const updated = {
          epoch: c.open_time,
          open:  parseFloat(c.open),
          high:  parseFloat(c.high),
          low:   parseFloat(c.low),
          close: parseFloat(c.close),
        }
        if (updated.epoch === last.epoch) {
          return [...prev.slice(0, -1), updated]
        }
        return [...prev, updated].slice(-200)
      })
    })

    return () => { unsubCandles(); unsubOHLC() }
  }, [symbol, interval, isNative, isAuthorized, ws])

  useEffect(() => {
    const cleanup = fetchDerivCandles()
    return () => { if (cleanup) cleanup() }
  }, [fetchDerivCandles])

  // ── Current tick data ─────────────────────────────────────────────────────────
  const currentTick  = latestTick[symbol] || null
  const tickData     = tickHistory[symbol] || []
  const symMeta      = SYMBOLS.find(s => s.value === symbol)

  // Determine chart mode for canvas renderer
  const chartMode = interval.deriv === null ? 'ticks' : 'candles'

  // Pick which intervals are available (non-TV native symbols can't use TV intervals)
  const availableIntervals = isNative
    ? INTERVALS                              // show all including Ticks
    : INTERVALS.filter(iv => iv.tv !== null) // TV doesn't have a "Ticks" mode

  // Sync interval when switching between native/non-native
  useEffect(() => {
    if (!isNative && interval.tv === null) setInterval(INTERVALS[2])
  }, [isNative]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-full overflow-y-auto lg:overflow-hidden" style={{ minHeight: 'calc(100vh - 80px)' }}>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 px-4 md:px-6 py-3 shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <h1 className="heading-formal text-xl font-bold uppercase tracking-widest">Market Analysis</h1>
          {symMeta && (
            <span className="hidden xs:inline text-[10px] font-mono text-white/30 uppercase tracking-widest">
              {symMeta.market} · {symMeta.category}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 justify-between sm:justify-end">
          {/* Live price badge */}
          {currentTick ? (
            <div className="flex items-center gap-2 px-4 py-1.5 border border-accent/30 bg-accent/5">
              <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
              <span className="text-text-muted text-[10px] font-mono uppercase tracking-widest truncate max-w-[60px] sm:max-w-none">{symMeta?.label}</span>
              <span className="text-accent text-sm sm:text-base font-mono font-bold">{currentTick.quote?.toFixed(4)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-1.5 border border-white/10">
              <Wifi className="w-3 h-3 text-white/20 animate-pulse" />
              <span className="text-text-muted text-xs font-mono">Connecting…</span>
            </div>
          )}

          {/* Chart type badge */}
          <div className={`px-2 py-1 text-[8px] font-mono uppercase tracking-widest border ${
            isNative ? 'border-cyan/30 text-cyan bg-cyan/5' : 'border-white/10 text-white/30'
          }`}>
            {isNative ? 'Native' : 'TV'}
          </div>
        </div>
      </div>

      {/* ── Body: sidebar + chart ── */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0">

        {/* Symbol sidebar */}
        <div className="h-64 lg:h-full lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-white/5">
          <SymbolSidebar selected={symbol} onSelect={setSymbol} latestTick={latestTick} />
        </div>

        {/* Chart area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-[400px]">

          {/* Interval selector */}
          <div className="flex items-center gap-1 px-4 py-2 border-b border-white/5 shrink-0 overflow-x-auto no-scrollbar">
            {availableIntervals.map(iv => (
              <button key={iv.label} onClick={() => setInterval(iv)}
                className={`px-3 py-1 text-[10px] font-mono uppercase tracking-widest transition-colors rounded shrink-0
                  ${interval.label === iv.label
                    ? 'bg-accent/15 text-accent border border-accent/30'
                    : 'text-white/30 hover:text-white hover:bg-white/5'}`}>
                {iv.label}
              </button>
            ))}

            <div className="ml-auto hidden sm:block text-[9px] font-mono text-white/20 uppercase tracking-widest shrink-0">
              {isNative ? `Deriv · ${symbol}` : tvSymbol}
            </div>
          </div>

          {/* Chart canvas / TradingView */}
          <div className="flex-1 min-h-0 relative">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div className="flex items-center gap-2 px-4 py-2 bg-black/60 border border-white/10 rounded">
                  <div className="w-3 h-3 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                  <span className="text-xs font-mono text-white/40">Loading chart data…</span>
                </div>
              </div>
            )}

            {isNative ? (
              /* Deriv WebSocket-powered chart */
              <CandleChart
                candles={candles}
                ticks={tickData}
                mode={chartMode}
              />
            ) : (
              /* TradingView widget for exchange symbols */
              <TVChart tvSymbol={tvSymbol} interval={interval.tv} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


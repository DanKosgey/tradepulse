import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { TrendingUp, TrendingDown, ChevronDown, Star, Search, RefreshCw, Activity, AlertTriangle, X } from 'lucide-react'
import { useDeriv } from '../context/DerivContext'
import { SYMBOLS } from '../deriv'

// Stream IDs for this page's Deriv subscriptions (used for targeted cleanup)
const STREAM_IDS = { tick: null, history: null }

// ─── Canvas chart: draws directly to GPU — zero React re-renders, zero blink ──
const CanvasChart = memo(function CanvasChart({ tickBuf }) {
  const canvasRef = useRef(null)
  const rafRef    = useRef(null)
  const sizeRef   = useRef({ w: 0, h: 0, dpr: window.devicePixelRatio || 1 })
  const hoverX    = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    // Stable resize handler using ResizeObserver
    const ro = new ResizeObserver(entries => {
      for (let entry of entries) {
        const dpr = window.devicePixelRatio || 1
        const w = entry.contentRect.width
        const h = entry.contentRect.height
        sizeRef.current = { w, h, dpr }
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
        ctx.scale(dpr, dpr)
      }
    })
    ro.observe(canvas)

    const draw = () => {
      const { w: W, h: H } = sizeRef.current
      if (W === 0 || H === 0) {
        rafRef.current = requestAnimationFrame(draw)
        return
      }

      const data = tickBuf.current
      ctx.clearRect(0, 0, W, H)

      if (data.length < 2) {
        rafRef.current = requestAnimationFrame(draw)
        return
      }

      const prices = data.map(d => d.price)
      const min    = Math.min(...prices)
      const max    = Math.max(...prices)
      const range  = max - min || 1
      const padX   = 60
      const padY   = 20
      const chartW = W - padX
      const chartH = H - padY * 2

      const toX = i  => padX + (i / (data.length - 1)) * chartW
      const toY = p  => padY + (1 - (p - min) / range) * chartH

      // background grid
      ctx.strokeStyle = 'rgba(255,255,255,0.03)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for(let i=0; i<=4; i++) {
        const y = padY + (i/4)*chartH
        ctx.moveTo(padX, y); ctx.lineTo(W, y)
      }
      ctx.stroke()

      // area fill
      const grad = ctx.createLinearGradient(0, padY, 0, padY + chartH)
      grad.addColorStop(0, 'rgba(0,212,255,0.15)')
      grad.addColorStop(1, 'rgba(0,212,255,0)')
      ctx.beginPath()
      data.forEach((d, i) => {
        const x = toX(i), y = toY(d.price)
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      })
      ctx.lineTo(toX(data.length - 1), padY + chartH)
      ctx.lineTo(toX(0), padY + chartH)
      ctx.closePath()
      ctx.fillStyle = grad
      ctx.fill()

      // main line
      ctx.beginPath()
      ctx.strokeStyle = '#00d4ff'
      ctx.lineWidth   = 2
      ctx.lineJoin    = 'round'
      data.forEach((d, i) => {
        const x = toX(i), y = toY(d.price)
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      })
      ctx.stroke()

      // last price indicator
      const lx = toX(data.length - 1)
      const ly = toY(prices.at(-1))
      ctx.beginPath()
      ctx.arc(lx, ly, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#00d4ff'
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // last price text
      ctx.font = 'bold 11px monospace'
      ctx.fillStyle = '#00d4ff'
      ctx.textAlign = 'left'
      ctx.fillText(prices.at(-1).toFixed(4), lx + 8, ly + 4)

      // Y-axis labels
      ctx.font = '10px monospace'
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.textAlign = 'right'
      ctx.fillText(max.toFixed(4), padX - 8, padY + 4)
      ctx.fillText(min.toFixed(4), padX - 8, padY + chartH + 4)

      // hover logic
      if (hoverX.current !== null) {
        const hi = Math.round((hoverX.current - padX) / chartW * (data.length - 1))
        if (hi >= 0 && hi < data.length) {
          const hx = toX(hi)
          const hy = toY(data[hi].price)
          ctx.setLineDash([4, 4])
          ctx.strokeStyle = 'rgba(255,255,255,0.2)'
          ctx.beginPath(); ctx.moveTo(hx, padY); ctx.lineTo(hx, padY + chartH); ctx.stroke()
          ctx.beginPath(); ctx.moveTo(padX, hy); ctx.lineTo(W, hy); ctx.stroke()
          ctx.setLineDash([])
          
          ctx.fillStyle = '#161b33'
          ctx.beginPath(); ctx.roundRect(hx - 45, hy - 30, 90, 20, 4); ctx.fill()
          ctx.strokeStyle = '#00d4ff60'; ctx.stroke()
          ctx.fillStyle = '#fff'
          ctx.textAlign = 'center'
          ctx.fillText(data[hi].price.toFixed(4), hx, hy - 16)
        }
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [tickBuf])

  const onMouseMove = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (rect) hoverX.current = e.clientX - rect.left
  }
  const onMouseLeave = () => { hoverX.current = null }

  return (
    <canvas
      ref={canvasRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="w-full h-full block touch-none"
    />
  )
})


// ─── Constants ───────────────────────────────────────────────────────────────
const TRADE_PANELS = [
  { id: 'overunder', label: 'Over / Under', contracts: ['DIGITOVER',  'DIGITUNDER'] },
  { id: 'evenodd',   label: 'Even / Odd',   contracts: ['DIGITEVEN',  'DIGITODD']   },
  { id: 'match',     label: 'Match / Diff', contracts: ['DIGITMATCH', 'DIGITDIFF']  },
  { id: 'risefall',  label: 'Rise / Fall',  contracts: ['CALL',       'PUT']        },
]
const DEFAULT_SYM = SYMBOLS.find(s => s.value === '1HZ100V') ?? SYMBOLS[0]
const MARKETS = [...new Set(SYMBOLS.map(s => s.market))]
const getCats  = mkt  => [...new Set(SYMBOLS.filter(s => s.market === mkt).map(s => s.category))]
const getSyms  = cat  => SYMBOLS.filter(s => s.category === cat)

// ─── Sub-components (memoised to prevent unnecessary re-renders) ──────────────
const DigitBubble = memo(({ digit, pct, isLast }) => (
  <div className="flex flex-col items-center gap-1 min-w-0">
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors
      ${isLast ? 'border-[#00ff87] text-[#00ff87] shadow-[0_0_10px_#00ff8760]' : 'border-white/10 text-white/50'}`}
      style={{ background: `rgba(0,255,135,${Math.min(pct/20,1)*0.2})` }}>
      {digit}
    </div>
    <span className="text-[9px] text-white/30">{pct.toFixed(1)}%</span>
  </div>
))


const MarketPanel = memo(({ symbol, onSelect, onClose }) => {
  const [mkt, setMkt] = useState('Derived')
  const [cat, setCat] = useState('Continuous Indices')
  const [q, setQ]     = useState('')
  const syms = getSyms(cat).filter(s => s.label.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="absolute top-16 left-0 z-50 w-[560px] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/10 shadow-2xl overflow-hidden" style={{ background: '#0e1120' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <span className="font-semibold text-white text-sm">Markets</span>
        <button onClick={onClose}><X className="w-4 h-4 text-white/30 hover:text-white" /></button>
      </div>
      <div className="flex flex-col sm:flex-row" style={{ height: 380 }}>
        {/* Market list */}
        <div className="sm:w-36 flex sm:flex-col overflow-x-auto sm:overflow-y-auto border-b sm:border-b-0 sm:border-r border-white/5 py-1 shrink-0">
          {MARKETS.map(m => (
            <button key={m} onClick={() => { setMkt(m); setCat(getCats(m)[0]) }}
              className={`w-full text-left px-4 py-2 text-xs transition-all
                ${mkt===m ? 'text-[#00ff87] border-r-2 border-[#00ff87] bg-[#00ff87]/5' : 'text-white/40 hover:text-white'}`}>
              {m}
            </button>
          ))}
        </div>
        {/* Symbols */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-white/5">
            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-2 py-1">
              <Search className="w-3 h-3 text-white/20" />
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search…"
                className="bg-transparent text-xs text-white outline-none w-full placeholder-white/20" />
            </div>
          </div>
          <div className="flex gap-1.5 px-3 py-2 border-b border-white/5 flex-wrap">
            {getCats(mkt).map(c => (
              <button key={c} onClick={()=>setCat(c)}
                className={`px-2.5 py-0.5 rounded-full text-[10px] transition-all
                  ${cat===c ? 'bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/30' : 'bg-white/5 text-white/30 hover:text-white'}`}>
                {c}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {syms.map(s => (
              <button key={s.value} onClick={()=>{ onSelect(s); onClose() }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-all text-left
                  ${s.value===symbol.value ? 'bg-[#00ff87]/5 border-l-2 border-[#00ff87]' : ''}`}>
                <div className="w-7 h-7 rounded-lg bg-[#00d4ff]/10 flex items-center justify-center text-[10px] font-bold text-[#00d4ff]">
                  {s.label.match(/\d+/)?.[0] ?? s.label[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white font-medium truncate">{s.label}</div>
                  <div className="text-[9px] text-white/20 font-mono">{s.value}</div>
                </div>
                <Star className="w-3 h-3 text-white/10 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
})

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ManualTrader() {
  const { isAuthorized, ws, balance, notify, forgetStream, getStreamId } = useDeriv()

  // Refs to track our own Deriv stream IDs so we only forget our own streams
  const tickStreamId   = useRef(null)
  const histStreamId   = useRef(null)

  // Symbol
  const [symbol, setSymbol]       = useState(DEFAULT_SYM)
  const [showMkt, setShowMkt]     = useState(false)

  // Chart data — tick buffer in a ref (read by CanvasChart via rAF, no setState blinking)
  const tickBuf   = useRef([])
  const [latestPrice, setLatestPrice] = useState(null)
  const [openPrice, setOpenPrice]     = useState(null)
  const [digitDist, setDigitDist]     = useState(() => Array(10).fill(0))
  const [lastDigit, setLastDigit]     = useState(null)
  const [digitTape, setDigitTape]     = useState([]) // Last 20 digits

  // Trade config
  const [panel, setPanel]         = useState('overunder')
  const [duration, setDuration]   = useState(5)
  const [prediction, setPrediction] = useState(5)
  const [stake, setStake]         = useState(10)

  // Proposal / execution
  const [quotes, setQuotes]       = useState({ a: null, b: null })
  const [loadingQ, setLoadingQ]   = useState(false)
  const [openCt, setOpenCt]       = useState(null)  // { id, dir }

  const currency = balance?.currency ?? 'USD'

  // ── Tick flush timer: update chart state every 400 ms ───────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      const buf = tickBuf.current
      if (!buf.length) return
      const last = buf.at(-1)
      if (!last) return
      setLatestPrice(last.price)
      setLastDigit(last.ld)
      // tape - unique items only based on time to avoid dupes
      setDigitTape(buf.slice(-24).map(t => ({ ld: t.ld, time: t.time })))
      // digit distribution
      const counts = Array(10).fill(0)
      buf.forEach(t => counts[t.ld]++)
      const total = buf.length
      setDigitDist(counts.map(c => (c / total) * 100))
    }, 400)
    return () => clearInterval(id)
  }, [])

  // ── Tick history + live subscription ────────────────────────────────────────
  useEffect(() => {
    tickBuf.current = []
    setLatestPrice(null)
    setOpenPrice(null)
    setDigitDist(Array(10).fill(0))
    setLastDigit(null)
    setDigitTape([])

    // History subscription — capture stream ID for targeted cleanup
    const histReqId = ws.send({ ticks_history: symbol.value, count: 60, end: 'latest', style: 'ticks', subscribe: 1 })
    const unsubHist = ws.subscribe('history', msg => {
      if (msg.error || !msg.history) return
      // Capture the stream ID from the first response
      if (msg.subscription?.id && msg.req_id === histReqId) {
        histStreamId.current = msg.subscription.id
      }
      const { prices = [], times = [] } = msg.history
      const formatted = prices.map((p, i) => ({
        time: new Date(times[i] * 1000).toLocaleTimeString(),
        price: parseFloat(p),
        ld: Math.floor(parseFloat(p) % 10),
      }))
      tickBuf.current = formatted.slice(-60)
      if (formatted.length) setOpenPrice(formatted[0].price)
    })

    // Live tick subscription — filter to our symbol; capture stream ID
    const tickReqId = ws.send({ ticks: symbol.value, subscribe: 1 })
    const unsubTick = ws.subscribe('tick', msg => {
      if (msg.error || !msg.tick) return
      if (msg.tick.symbol !== symbol.value) return
      // Capture stream ID from first matching response
      if (msg.subscription?.id && msg.req_id === tickReqId) {
        tickStreamId.current = msg.subscription.id
      }
      const price = parseFloat(msg.tick.quote)
      const entry = {
        time: new Date(msg.tick.epoch * 1000).toLocaleTimeString(),
        price,
        ld: Math.floor(price % 10),
      }
      tickBuf.current = [...tickBuf.current, entry].slice(-60)
    })

    return () => {
      unsubHist()
      unsubTick()
      // Forget ONLY our own streams — not all ticks globally
      if (tickStreamId.current) { forgetStream(tickStreamId.current); tickStreamId.current = null }
      if (histStreamId.current) { forgetStream(histStreamId.current); histStreamId.current = null }
    }
  }, [symbol.value, ws, forgetStream])

  // ── Proposal fetch ────────────────────────────────────────────────────────────
  const currentPanel = TRADE_PANELS.find(p => p.id === panel)

  const fetchQuotes = useCallback(async () => {
    if (!isAuthorized) return
    setLoadingQ(true)
    const base = {
      amount: stake, basis: 'stake',
      currency, duration, duration_unit: 't', symbol: symbol.value,
      ...(panel !== 'risefall' ? { last_digit_prediction: prediction } : {}),
    }
    try {
      const [a, b] = await Promise.allSettled([
        ws.sendProposal({ ...base, contract_type: currentPanel.contracts[0] }),
        ws.sendProposal({ ...base, contract_type: currentPanel.contracts[1] }),
      ])
      setQuotes({
        a: a.status === 'fulfilled' ? a.value : null,
        b: b.status === 'fulfilled' ? b.value : null,
      })
    } catch (_) {} finally { setLoadingQ(false) }
  }, [isAuthorized, stake, currency, duration, prediction, panel, symbol.value, currentPanel, ws])

  useEffect(() => { fetchQuotes() }, [fetchQuotes])

  // ── Buy contract ──────────────────────────────────────────────────────────────
  const placeTrade = async (dir) => {
    if (!isAuthorized) { notify('Connect your Deriv account first.', 'error'); return }
    const prop = dir === 'a' ? quotes.a : quotes.b
    if (!prop) { notify('Quote not ready, please wait.', 'warning'); return }
    try {
      const reqId = ws.send({ buy: prop.id, price: stake })
      const unsub = ws.subscribe('buy', msg => {
        if (msg.error) { notify(`Trade failed: ${msg.error.message}`, 'error'); unsub(); return }
        const cid = msg.buy.contract_id
        setOpenCt({ id: cid, dir })
        notify(`✅ Contract #${cid} opened`, 'success')
        unsub()
        // Monitor contract
        ws.send({ proposal_open_contract: 1, contract_id: cid, subscribe: 1 })
        const unsubPoc = ws.subscribe('proposal_open_contract', poc => {
          const c = poc.proposal_open_contract
          if (!c || c.contract_id !== cid) return
          if (c.is_settleable || c.status === 'sold') {
            const pl = parseFloat(c.profit ?? 0)
            notify(`${pl >= 0 ? '🏆 Won' : '❌ Lost'} $${Math.abs(pl).toFixed(2)}`, pl >= 0 ? 'success' : 'error')
            setOpenCt(null)
            ws.send({ forget: cid })
            unsubPoc()
          }
        })
      })
    } catch (e) { notify(e.message, 'error') }
  }

  // ── Derived display values ────────────────────────────────────────────────────
  const priceDiff = latestPrice != null && openPrice != null ? latestPrice - openPrice : null
  const pricePct  = priceDiff != null && openPrice ? (priceDiff / openPrice) * 100 : null
  const labels    = {
    a: currentPanel?.id === 'risefall' ? 'Rise' : currentPanel?.id === 'overunder' ? 'Over' : currentPanel?.contracts[0].replace('DIGIT',''),
    b: currentPanel?.id === 'risefall' ? 'Fall' : currentPanel?.id === 'overunder' ? 'Under': currentPanel?.contracts[1].replace('DIGIT',''),
  }

  return (
    <div className="flex flex-col lg:flex-row overflow-hidden" style={{ height: 'calc(100vh - 64px)', background: '#07080f' }}>

      {/* ── LEFT: Chart ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-[300px] lg:min-h-0">
        {/* Symbol selector */}
        <div className="relative px-4 pt-4 pb-2 shrink-0">
          <button onClick={() => setShowMkt(v => !v)}
            className="flex items-center gap-3 border border-white/10 rounded-2xl px-4 py-2.5 transition-all hover:bg-white/5"
            style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00d4ff]/20 to-[#00ff87]/10 flex items-center justify-center font-bold text-[#00ff87] text-sm">
              {symbol.label.match(/\d+/)?.[0] ?? symbol.label[0]}
            </div>
            <div className="text-left">
              <div className="text-white font-semibold text-sm">{symbol.label}</div>
              <div className={`text-xs font-mono ${(pricePct ?? 0) >= 0 ? 'text-[#00ff87]' : 'text-rose-400'}`}>
                {latestPrice != null ? latestPrice.toFixed(4) : '—'}
                {priceDiff != null && (
                  <span className="ml-2 text-[10px]">
                    {priceDiff >= 0 ? '+' : ''}{priceDiff.toFixed(4)} ({pricePct?.toFixed(2)}%)
                  </span>
                )}
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-white/20 ml-2" />
          </button>
          {showMkt && <MarketPanel symbol={symbol} onSelect={setSymbol} onClose={() => setShowMkt(false)} />}
        </div>

        {/* Last digits tape */}
        <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2 overflow-hidden">
          <div className="text-[9px] font-mono text-white/20 uppercase tracking-tighter shrink-0">Recent</div>
          <div className="flex gap-1 overflow-hidden">
            {digitTape.map((dt, i) => (
              <div key={`${dt.time}-${i}`} className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0
                ${dt.ld % 2 === 0 ? 'bg-cyan/10 text-cyan' : 'bg-rose-500/10 text-rose-400'}`}>
                {dt.ld}
              </div>
            ))}
          </div>
        </div>

        {/* Canvas chart — draws via requestAnimationFrame directly on GPU, no React re-renders */}
        <div className="flex-1 min-h-0 px-2">
          <CanvasChart tickBuf={tickBuf} />
        </div>

        {/* Digit distribution */}
        <div className="px-4 pb-4 shrink-0">
          <div className="border border-white/5 rounded-2xl px-4 py-3 flex items-center justify-between gap-1"
            style={{ background: 'rgba(255,255,255,0.02)' }}>
            {Array.from({ length: 10 }, (_, i) => (
              <DigitBubble key={i} digit={i} pct={digitDist[i] ?? 0} isLast={lastDigit === i} />
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Trade panel ───────────────────────────────────────────────── */}
      <div className="w-full lg:w-72 shrink-0 flex flex-col border-t lg:border-t-0 lg:border-l border-white/5 overflow-y-auto"
        style={{ background: '#0a0c18' }}>
        <div className="p-4 space-y-5">

          {/* Trade type */}
          <div>
            <div className="text-white/25 text-[10px] font-mono uppercase tracking-widest mb-2">Trade type</div>
            <div className="space-y-1">
              {TRADE_PANELS.map(tp => (
                <button key={tp.id} onClick={() => setPanel(tp.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border transition-all text-sm
                    ${panel===tp.id ? 'bg-[#00d4ff]/10 border-[#00d4ff]/30 text-[#00d4ff]' : 'bg-white/2 border-white/5 text-white/40 hover:text-white hover:bg-white/5'}`}>
                  {tp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <div className="text-white/25 text-[10px] font-mono uppercase tracking-widest mb-2">Duration — Ticks</div>
            <input type="range" min={1} max={10} step={1} value={duration}
              onChange={e => setDuration(+e.target.value)} className="w-full accent-[#00d4ff]" />
            <div className="text-center text-[#00d4ff] font-bold mt-1">{duration} Ticks</div>
          </div>

          {/* Digit prediction */}
          {panel !== 'risefall' && (
            <div>
              <div className="text-white/25 text-[10px] font-mono uppercase tracking-widest mb-2">Last Digit Prediction</div>
              <div className="grid grid-cols-5 gap-1.5">
                {Array.from({ length: 10 }, (_, i) => (
                  <button key={i} onClick={() => setPrediction(i)}
                    className={`h-9 rounded-xl font-bold text-sm border transition-all
                      ${prediction===i ? 'bg-[#00d4ff]/20 border-[#00d4ff] text-[#00d4ff]' : 'bg-white/5 border-white/5 text-white/40 hover:text-white hover:border-white/20'}`}>
                    {i}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stake */}
          <div>
            <div className="text-white/25 text-[10px] font-mono uppercase tracking-widest mb-2">Stake</div>
            <div className="flex items-center gap-2 border border-white/10 rounded-xl px-3 py-2" style={{ background:'rgba(255,255,255,0.03)' }}>
              <button onClick={() => setStake(s => Math.max(0.35, +(s-0.5).toFixed(2)))}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 flex items-center justify-center font-bold text-lg leading-none">−</button>
              <input type="number" min={0.35} step={0.5} value={stake}
                onChange={e => setStake(+e.target.value)}
                className="flex-1 bg-transparent text-center text-white font-mono font-bold text-lg outline-none" />
              <button onClick={() => setStake(s => +(s+0.5).toFixed(2))}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 flex items-center justify-center font-bold text-lg leading-none">+</button>
              <span className="text-white/25 text-xs">{currency}</span>
            </div>
          </div>

          {/* Trade buttons */}
          <div className="space-y-2">
            {(['a','b']).map(dir => {
              const q   = quotes[dir]
              const lbl = labels[dir]
              const isA = dir === 'a'
              return (
                <div key={dir}>
                  {q && (
                    <div className="text-white/30 text-xs mb-1">
                      Payout <span className="text-white font-mono">{parseFloat(q.payout).toFixed(2)} {currency}</span>
                    </div>
                  )}
                  <button
                    onClick={() => placeTrade(dir)}
                    disabled={!!openCt || loadingQ}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-semibold text-sm text-white border transition-all
                      disabled:opacity-40 disabled:cursor-not-allowed
                      ${isA
                        ? 'bg-gradient-to-r from-emerald-600/80 to-emerald-500/60 border-emerald-500/30 hover:from-emerald-500 hover:to-emerald-400/80'
                        : 'bg-gradient-to-r from-rose-600/80 to-rose-500/60 border-rose-500/30 hover:from-rose-500 hover:to-rose-400/80'}`}>
                    <div className="flex items-center gap-2">
                      {isA ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {lbl}
                    </div>
                    <span className={`font-mono text-sm ${isA ? 'text-emerald-200' : 'text-rose-200'}`}>
                      {q ? `${((+q.payout / stake)*100).toFixed(2)}%` : '---'}
                    </span>
                  </button>
                </div>
              )
            })}
          </div>

          {/* Open contract badge */}
          {openCt && (
            <div className="border border-[#00d4ff]/20 rounded-xl p-3 flex items-center gap-2" style={{ background:'rgba(0,212,255,0.05)' }}>
              <Activity className="w-4 h-4 text-[#00d4ff] animate-pulse" />
              <div>
                <div className="text-[#00d4ff] text-xs font-semibold">Contract #{openCt.id}</div>
                <div className="text-white/30 text-[10px]">Direction: {openCt.dir === 'a' ? labels.a : labels.b}</div>
              </div>
            </div>
          )}

          {/* Auth warning */}
          {!isAuthorized && (
            <div className="border border-yellow-500/20 rounded-xl p-3 flex items-center gap-2" style={{ background:'rgba(234,179,8,0.05)' }}>
              <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
              <span className="text-yellow-300/70 text-xs">Connect your Deriv account in Settings to trade</span>
            </div>
          )}

          <button onClick={fetchQuotes} className="w-full flex items-center justify-center gap-2 py-2 text-white/20 hover:text-white/50 text-xs transition-all">
            <RefreshCw className="w-3 h-3" /> Refresh quotes
          </button>
        </div>
      </div>
    </div>
  )
}

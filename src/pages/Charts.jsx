import { useEffect, useRef, useState } from 'react'
import { useDeriv } from '../context/DerivContext'

const SYMBOL_MAP = {
  'R_100':   'VOLATILITY 100',
  'R_50':    'VOLATILITY 50',
  'R_25':    'VOLATILITY 25',
  '1HZ100V': 'VOLATILITY 100 (1s)',
}

const TV_SYMBOL_MAP = {
  'R_100': 'DERIV:VOLATILITY100',
  'R_50':  'DERIV:VOLATILITY50INDEX',
  'R_25':  'DERIV:VOLATILITY25',
}

const INTERVALS = [
  { label: '1m', value: '1' },
  { label: '5m', value: '5' },
  { label: '15m', value: '15' },
  { label: '1H', value: '60' },
  { label: '4H', value: '240' },
  { label: '1D', value: 'D' },
]

export default function Charts() {
  const { ticks, subscribeToSymbol } = useDeriv()
  const [symbol, setSymbol] = useState('R_100')
  const [interval, setInterval] = useState('5')
  const tvRef = useRef(null)
  const widgetRef = useRef(null)

  useEffect(() => {
    subscribeToSymbol(symbol)
  }, [symbol, subscribeToSymbol])

  useEffect(() => {
    if (!tvRef.current) return
    tvRef.current.innerHTML = ''

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/tv.js'
    script.async = true
    script.onload = () => {
      if (window.TradingView && tvRef.current) {
        widgetRef.current = new window.TradingView.widget({
          container_id: 'tv_chart_container',
          symbol: TV_SYMBOL_MAP[symbol] || 'DERIV:VOLATILITY100',
          interval,
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1',
          locale: 'en',
          toolbar_bg: '#050505',
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          backgroundColor: '#0a0a0a',
          gridColor: 'rgba(255,255,255,0.05)',
          width: '100%',
          height: '100%',
          studies: ['MASimple@tv-basicstudies', 'RSI@tv-basicstudies'],
          overrides: {
            'paneProperties.background': '#050505',
            'paneProperties.backgroundType': 'solid',
            'scalesProperties.textColor': '#9ca3af',
            'scalesProperties.lineColor': 'rgba(255,255,255,0.1)',
            'mainSeriesProperties.candleStyle.upColor': '#d4af37',
            'mainSeriesProperties.candleStyle.downColor': '#ef4444',
            'mainSeriesProperties.candleStyle.wickUpColor': '#d4af37',
            'mainSeriesProperties.candleStyle.wickDownColor': '#ef4444',
            'mainSeriesProperties.candleStyle.borderUpColor': '#d4af37',
            'mainSeriesProperties.candleStyle.borderDownColor': '#ef4444',
          },
        })
      }
    }

    if (window.TradingView) script.onload()
    else document.head.appendChild(script)

    return () => { if (widgetRef.current) try { widgetRef.current.remove?.() } catch {} }
  }, [symbol, interval])

  const currentTick = ticks[symbol] ? ticks[symbol].slice(-1)[0] : null

  return (
    <div className="space-y-6 h-full flex flex-col pb-4">
      
      <div className="flex items-center justify-between border-b border-white/5 pb-4 shrink-0">
        <h1 className="heading-formal text-2xl font-bold uppercase tracking-widest">Market Analysis</h1>
        {currentTick && (
          <div className="flex items-center gap-3 px-4 py-1 border border-accent/30 bg-accent/5">
            <span className="text-text-muted text-xs font-mono uppercase tracking-widest">{SYMBOL_MAP[symbol]}</span>
            <span className="text-accent text-lg font-mono font-bold">{currentTick.quote?.toFixed(3)}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between shrink-0 flex-wrap gap-4 border-b border-white/5 pb-4">
        <div className="flex gap-2">
          {Object.entries(SYMBOL_MAP).map(([val, label]) => (
            <button key={val} onClick={() => setSymbol(val)}
              className={`px-4 py-2 border text-xs font-mono uppercase tracking-widest transition-all duration-300 ${
                symbol === val ? 'border-accent bg-accent/10 text-accent' : 'border-white/10 text-text-muted hover:text-white hover:border-white/30'
              }`}>
              {val.replace('1HZ', '').replace('V', '').replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex gap-1 border border-white/10 p-1">
          {INTERVALS.map(iv => (
            <button key={iv.value} onClick={() => setInterval(iv.value)}
              className={`px-4 py-1 text-xs font-mono uppercase tracking-widest transition-colors ${
                interval === iv.value ? 'bg-white/10 text-white' : 'text-text-muted hover:text-white'
              }`}>
              {iv.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-[500px] border border-white/10 p-1 bg-black/50">
        <div id="tv_chart_container" ref={tvRef} className="w-full h-full" />
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { SYMBOLS, TV_SYMBOL_MAP } from '../deriv'
import { useDeriv } from '../context/DerivContext'

const INTERVALS = [
  { label: '1m', value: '1' },
  { label: '5m', value: '5' },
  { label: '15m', value: '15' },
  { label: '1H', value: '60' },
  { label: '4H', value: '240' },
  { label: '1D', value: 'D' },
]

export default function Charts() {
  const { latestTick, subscribeToSymbol } = useDeriv()
  const [symbol, setSymbol] = useState('R_100')
  const [interval, setInterval] = useState('5')
  const tvRef = useRef(null)
  const widgetRef = useRef(null)

  useEffect(() => {
    subscribeToSymbol(symbol)
  }, [symbol, subscribeToSymbol])

  useEffect(() => {
    const container = tvRef.current
    if (!container) return

    let tvWidget = null

    const initWidget = () => {
      if (window.TradingView && container && document.getElementById('tv_chart_container')) {
        tvWidget = new window.TradingView.widget({
          "autosize": true,
          "symbol": TV_SYMBOL_MAP[symbol] || "DERIV:R_100",
          "interval": interval,
          "timezone": "Etc/UTC",
          "theme": "dark",
          "style": "1",
          "locale": "en",
          "toolbar_bg": "rgba(5, 5, 5, 1)",
          "enable_publishing": false,
          "hide_top_toolbar": false,
          "hide_legend": false,
          "save_image": false,
          "container_id": "tv_chart_container",
          "backgroundColor": "rgba(5, 5, 5, 1)",
          "gridColor": "rgba(255, 255, 255, 0.06)",
          "studies": ["MASimple@tv-basicstudies", "RSI@tv-basicstudies"],
        })
      }
    }

    if (!window.TradingView) {
      const script = document.createElement('script')
      script.id = 'tradingview-widget-script'
      script.src = 'https://s3.tradingview.com/tv.js'
      script.async = true
      script.onload = initWidget
      document.head.appendChild(script)
    } else {
      // Small timeout to ensure the DOM element with the ID is rendered
      setTimeout(initWidget, 100)
    }

    return () => {
      // Standard widget doesn't have a reliable .remove() but clearing innerHTML usually stops it
      if (container) container.innerHTML = ''
    }
  }, [symbol, interval])

  const currentTick = latestTick[symbol] || null

  return (
    <div className="space-y-6 h-full flex flex-col pb-4">
      
      <div className="flex items-center justify-between border-b border-white/5 pb-4 shrink-0">
        <h1 className="heading-formal text-2xl font-bold uppercase tracking-widest">Market Analysis</h1>
        {currentTick && (
          <div className="flex items-center gap-3 px-4 py-1 border border-accent/30 bg-accent/5">
            <span className="text-text-muted text-xs font-mono uppercase tracking-widest">
              {SYMBOLS.find(s => s.value === symbol)?.label}
            </span>
            <span className="text-accent text-lg font-mono font-bold">{currentTick.quote?.toFixed(3)}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between shrink-0 flex-wrap gap-4 border-b border-white/5 pb-4">
        <div className="flex gap-2 flex-wrap max-w-full">
          {SYMBOLS.filter(s => TV_SYMBOL_MAP[s.value]).map((s) => (
            <button key={s.value} onClick={() => setSymbol(s.value)}
              className={`px-4 py-2 border text-[10px] font-mono uppercase tracking-widest transition-all duration-300 ${
                symbol === s.value ? 'border-accent bg-accent/10 text-accent' : 'border-white/10 text-text-muted hover:text-white hover:border-white/30'
              }`}>
              {s.label.split(' Index')[0].split(' Pair')[0]}
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

import { Bell, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { useDeriv } from '../context/DerivContext'
import { useState, useEffect } from 'react'

const TICK_SYMBOLS = ['R_100', 'R_50', 'R_25', '1HZ100V']
const SYMBOL_LABELS = {
  R_100: 'VOL 100',
  R_50: 'VOL 50',
  R_25: 'VOL 25',
  '1HZ100V': 'VOL 100(1s)',
}

function TickItem({ sym, tick }) {
  const [flash, setFlash] = useState(false)
  const [prev, setPrev] = useState(null)
  const [dir, setDir] = useState(null)

  useEffect(() => {
    if (!tick) return
    if (prev !== null && tick.quote !== prev) {
      setDir(tick.quote > prev ? 'up' : 'down')
      setFlash(true)
      const t = setTimeout(() => setFlash(false), 500)
      return () => clearTimeout(t)
    }
    setPrev(tick.quote)
  }, [tick])

  if (!tick) return (
    <div className="flex items-center gap-3 px-4 py-2 border-r border-white/5 last:border-0">
      <span className="text-text-muted text-[10px] font-mono uppercase tracking-widest">{SYMBOL_LABELS[sym]}</span>
      <span className="text-text-muted text-xs font-mono">—</span>
    </div>
  )

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-r border-white/5 last:border-0 relative">
      <span className="text-text-muted text-[10px] font-mono uppercase tracking-widest">{SYMBOL_LABELS[sym]}</span>
      <span className={`text-sm font-mono transition-colors duration-300 ${
        flash ? (dir === 'up' ? 'text-accent' : 'text-danger') : 'text-white'
      }`}>
        {tick.quote.toFixed(2)}
      </span>
      {dir && flash && (
        <span className={`absolute right-1 text-[8px] ${dir === 'up' ? 'text-accent' : 'text-danger'}`}>
          {dir === 'up' ? '▲' : '▼'}
        </span>
      )}
    </div>
  )
}

export default function Topbar() {
  const { ticks, ws, isAuthorized, isConnected } = useDeriv()
  const [refreshing, setRefreshing] = useState(false)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1000)
    if (isAuthorized) { ws.getBalance(); ws.getProfitTable() }
  }

  return (
    <header className="h-16 flex items-center px-6 gap-4 shrink-0"
      style={{
        background: 'linear-gradient(90deg, rgba(2,14,8,0.85) 0%, rgba(4,20,12,0.80) 100%)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(0,200,128,0.15)',
        boxShadow: '0 4px 30px rgba(0,200,128,0.06), inset 0 -1px 0 rgba(0,200,128,0.08)',
      }}>

      {/* Live tickers */}
      <div className="flex items-center flex-1 overflow-hidden">
        {TICK_SYMBOLS.map(sym => (
          <TickItem key={sym} sym={sym} tick={ticks[sym] ? ticks[sym][ticks[sym].length - 1] : null} />
        ))}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4 shrink-0">
        
        {/* Time */}
        <div className="text-right hidden sm:block">
          <div className="text-white text-sm font-mono tracking-wider">{time.toLocaleTimeString()}</div>
          <div className="text-text-muted text-[9px] font-mono uppercase tracking-widest">{time.toLocaleDateString()}</div>
        </div>

        <div className="w-px h-8 bg-white/10" />

        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} className="btn-icon rounded-full">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button className="btn-icon rounded-full relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-accent rounded-full" />
          </button>
        </div>
      </div>
    </header>
  )
}

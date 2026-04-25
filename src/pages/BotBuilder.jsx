import { useState, useRef, useEffect } from 'react'
import { Play, Square, Pause, PlayCircle } from 'lucide-react'
import { useDeriv } from '../context/DerivContext'
import { useBotConfig } from '../hooks/useBotConfig'

const CONTRACT_TYPES = [
  { value: 'CALL',       label: 'Rise',  desc: 'Profit on upward movement' },
  { value: 'PUT',        label: 'Fall',  desc: 'Profit on downward movement' },
  { value: 'DIGITOVER',  label: 'Over',  desc: 'Profit if last digit > target' },
  { value: 'DIGITUNDER', label: 'Under', desc: 'Profit if last digit < target' },
]

const SYMBOLS = [
  { value: 'R_100',   label: 'Volatility 100 Index' },
  { value: 'R_50',    label: 'Volatility 50 Index' },
  { value: 'R_25',    label: 'Volatility 25 Index' },
  { value: '1HZ100V', label: 'Volatility 100 (1s) Index' },
]

const STRATEGIES = [
  { value: 'single',          label: 'Fixed Stake',    desc: 'Constant position sizing' },
  { value: 'martingale',      label: 'Martingale',      desc: 'Aggressive loss recovery' },
]

export default function BotBuilder() {
  const { startBot, stopBot, pauseBot, resumeBot, activeBots, botRunning, botPaused, isAuthorized, ws, ticks, subscribeToSymbol, notify } = useDeriv()
  const stopFnRef = useRef(null)

  const [config, setConfig, resetConfig] = useBotConfig()
  const [logs, setLogs] = useState([
    { time: new Date().toLocaleTimeString(), msg: 'System initialized. Awaiting configuration.', type: 'info' }
  ])
  const logsEndRef = useRef(null)

  const addLog = (msg, type = 'info') => {
    setLogs(prev => [{ time: new Date().toLocaleTimeString(), msg, type }, ...prev].slice(0, 100))
  }

  useEffect(() => {
    if (config.symbol) subscribeToSymbol(config.symbol)
  }, [config.symbol, subscribeToSymbol])

  const handleStart = () => {
    if (!isAuthorized) { notify('Authorization required.', 'error'); return }

    addLog(`Initiating sequence: ${config.symbol} | ${config.contractType} | $${config.stake}`, 'success')
    const stopFn = startBot(config, (logData) => {
      if (typeof logData === 'object') { setLogs(p => [logData, ...p].slice(0, 100)) }
      else { addLog(logData, 'info') }
    })
    stopFnRef.current = stopFn

    ws.subscribe('buy', (data) => {
      if (data.error) { addLog(`Execution failed: ${data.error.message}`, 'error') }
      else { addLog(`Position secured: #${data.buy.contract_id} at $${data.buy.buy_price}`, 'success') }
    })
  }

  const handleStop = () => {
    if (activeBots.length > 0) stopBot(activeBots[activeBots.length - 1].id)
    if (stopFnRef.current) { stopFnRef.current(); stopFnRef.current = null }
    addLog('Execution manually terminated.', 'warning')
  }

  const set = (key, val) => setConfig(prev => ({ ...prev, [key]: val }))
  const currentTick = ticks[config.symbol] ? ticks[config.symbol].slice(-1)[0] : null

  return (
    <div className="space-y-6">
      
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <h1 className="heading-formal text-2xl font-bold uppercase tracking-widest">Algorithm Configuration</h1>
        {currentTick && (
          <div className="flex items-center gap-3 px-4 py-1 border border-accent/30 bg-accent/5">
            <span className="text-text-muted text-xs font-mono uppercase tracking-widest">{config.symbol}</span>
            <span className="text-accent text-sm font-mono font-bold">{currentTick.quote?.toFixed(3)}</span>
          </div>
        )}
      </div>

      <div className="grid xl:grid-cols-3 gap-8">
        
        {/* ── LEFT PANEL ── */}
        <div className="xl:col-span-2 space-y-6">
          
          <div className="card p-8">
            <h3 className="text-xs font-mono tracking-widest uppercase text-text-muted mb-6">Contract Specifications</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {CONTRACT_TYPES.map(({ value, label, desc }) => (
                <button key={value} onClick={() => set('contractType', value)}
                  className={`p-4 border text-left transition-colors ${
                    config.contractType === value
                      ? 'border-accent bg-accent/5'
                      : 'border-white/10 hover:border-white/30'
                  }`}>
                  <div className={`font-sans font-bold text-sm mb-1 ${config.contractType === value ? 'text-accent' : 'text-white'}`}>{label}</div>
                  <div className="text-text-muted text-[10px]">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="card p-8">
            <h3 className="text-xs font-mono tracking-widest uppercase text-text-muted mb-6">Execution Parameters</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="text-text-muted text-[10px] font-mono tracking-widest uppercase block mb-2">Market Asset</label>
                <select className="input-field" value={config.symbol} onChange={e => set('symbol', e.target.value)}>
                  {SYMBOLS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-text-muted text-[10px] font-mono tracking-widest uppercase block mb-2">Base Stake ($)</label>
                <input type="number" min="0.35" step="0.01" className="input-field" value={config.stake} onChange={e => set('stake', parseFloat(e.target.value))} />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-text-muted text-[10px] font-mono tracking-widest uppercase block mb-2">Duration</label>
                  <input type="number" min="1" className="input-field" value={config.duration} onChange={e => set('duration', parseInt(e.target.value))} />
                </div>
                <div className="flex-1">
                  <label className="text-text-muted text-[10px] font-mono tracking-widest uppercase block mb-2">Unit</label>
                  <select className="input-field" value={config.durationUnit} onChange={e => set('durationUnit', e.target.value)}>
                    <option value="t">Ticks</option><option value="s">Seconds</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-8">
            <h3 className="text-xs font-mono tracking-widest uppercase text-text-muted mb-6">Risk Protocol</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {STRATEGIES.map(s => (
                <button key={s.value} onClick={() => set('strategy', s.value)}
                  className={`p-4 border text-left transition-colors ${
                    config.strategy === s.value ? 'border-accent bg-accent/5' : 'border-white/10 hover:border-white/30'
                  }`}>
                  <div className={`font-sans font-bold text-sm mb-1 ${config.strategy === s.value ? 'text-accent' : 'text-white'}`}>{label}</div>
                  <div className="text-text-muted text-[10px]">{s.desc}</div>
                </button>
              ))}
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {config.strategy !== 'single' && (
                <div>
                  <label className="text-text-muted text-[10px] font-mono tracking-widest uppercase block mb-2">Recovery Multiplier</label>
                  <input type="number" step="0.1" className="input-field" value={config.martingaleMultiplier} onChange={e => set('martingaleMultiplier', parseFloat(e.target.value))} />
                </div>
              )}
              <div>
                <label className="text-text-muted text-[10px] font-mono tracking-widest uppercase block mb-2">Take Profit Target</label>
                <input type="number" className="input-field" value={config.takeProfit} onChange={e => set('takeProfit', parseFloat(e.target.value))} />
              </div>
              <div>
                <label className="text-text-muted text-[10px] font-mono tracking-widest uppercase block mb-2">Max Drawdown Limit</label>
                <input type="number" className="input-field" value={config.stopLoss} onChange={e => set('stopLoss', parseFloat(e.target.value))} />
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-xs font-mono tracking-widest uppercase text-text-muted mb-6">Control Panel</h3>
            
            {!botRunning ? (
              <button onClick={handleStart} className="btn-primary w-full text-sm py-4">
                Deploy Algorithm
              </button>
            ) : (
              <div className="space-y-4">
                <div className="p-3 border border-accent/30 bg-accent/5 text-center">
                  <span className={`text-xs font-mono font-bold uppercase tracking-widest ${botPaused ? 'text-warning' : 'text-accent animate-pulse'}`}>
                    {botPaused ? 'Execution Paused' : 'Algorithm Active'}
                  </span>
                </div>
                <div className="flex gap-2">
                  {botPaused ? (
                    <button onClick={resumeBot} className="btn-primary flex-1 text-xs">Resume</button>
                  ) : (
                    <button onClick={pauseBot} className="btn-warning flex-1 text-xs text-white">Pause</button>
                  )}
                  <button onClick={handleStop} className="btn-danger flex-1 text-xs">Terminate</button>
                </div>
              </div>
            )}
          </div>

          <div className="card flex flex-col h-[400px]">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <span className="text-xs font-mono tracking-widest uppercase text-text-muted">Terminal Logs</span>
            </div>
            <div className="p-4 overflow-y-auto flex-1 font-mono text-[10px] flex flex-col-reverse bg-black/50">
              <div ref={logsEndRef} />
              {logs.map((log, i) => (
                <div key={i} className="mb-2 last:mb-0">
                  <span className="text-text-muted mr-3">[{log.time}]</span>
                  <span className={`${
                    log.type === 'success' ? 'text-accent' :
                    log.type === 'error'   ? 'text-danger' :
                    log.type === 'warning' ? 'text-warning' : 'text-white'
                  }`}>{log.msg}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

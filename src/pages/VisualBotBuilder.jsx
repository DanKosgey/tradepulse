import { useState, useRef, useCallback } from 'react'
import {
  Play, Square, Upload, Download, Plus, Trash2,
  ChevronDown, ChevronRight, AlertTriangle, CheckCircle,
  Zap, Activity, TrendingUp, TrendingDown, RefreshCw,
  Settings, BarChart3, Target, Shield, Clock, Info
} from 'lucide-react'
import { useDeriv } from '../context/DerivContext'
import { BotEngine } from '../botEngine'
import { SYMBOLS, CONTRACT_TYPES, DURATION_UNITS, STRATEGIES, calcMartingaleProjection } from '../deriv'

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const SELL_CONDITIONS = [
  'Sell is available',
  'Profit is greater than',
  'Profit is less than',
  'Loss is greater than',
  'Number of ticks is',
]

const RESTART_CONDITIONS = [
  'Trade again',
  'Stop after loss streak',
  'Stop after win streak',
  'Stop after profit target',
  'Stop after stop loss',
]

const CANDLE_INTERVALS = ['1 minute', '2 minutes', '5 minutes', '10 minutes', '15 minutes', '30 minutes', '1 hour', '4 hours']


// ─── BLOCK WRAPPER ────────────────────────────────────────────────────────────
function Block({ number, title, icon: Icon, color = '#00d4ff', children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left transition-all"
        style={{ background: `linear-gradient(135deg, ${color}18 0%, ${color}08 100%)`, borderBottom: open ? `1px solid ${color}20` : 'none' }}
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold"
          style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
          {number}
        </div>
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="font-sans font-bold text-white text-sm tracking-wide flex-1">{title}</span>
        <ChevronDown className={`w-4 h-4 transition-transform text-white/40 ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <div className="bg-[#0a0c14] px-5 py-5 space-y-4">
          {children}
        </div>
      )}
    </div>
  )
}

// ─── SELECT FIELD ─────────────────────────────────────────────────────────────
function Field({ label, value, onChange, options, suffix }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {label && <span className="text-white/50 text-xs font-mono">{label}</span>}
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="appearance-none bg-[#151825] border border-white/10 rounded-lg px-3 py-1.5
                     text-white text-xs font-mono pr-7 cursor-pointer
                     hover:border-white/20 focus:outline-none focus:border-cyan/50 transition-colors"
        >
          {options.map(o => (
            <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
              {typeof o === 'string' ? o : o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-2 w-3 h-3 text-white/30 pointer-events-none" />
      </div>
      {suffix && <span className="text-white/30 text-xs font-mono">{suffix}</span>}
    </div>
  )
}

// ─── NUMBER FIELD ─────────────────────────────────────────────────────────────
function NumField({ label, value, onChange, min, max, step = 0.01, prefix, suffix }) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-white/50 text-xs font-mono">{label}</span>}
      {prefix && <span className="text-white/30 text-xs font-mono">{prefix}</span>}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-20 bg-[#151825] border border-white/10 rounded-lg px-2 py-1.5
                   text-white text-xs font-mono text-right
                   hover:border-white/20 focus:outline-none focus:border-cyan/50 transition-colors"
      />
      {suffix && <span className="text-white/30 text-xs font-mono">{suffix}</span>}
    </div>
  )
}

// ─── TOGGLE ───────────────────────────────────────────────────────────────────
function Toggle({ label, value, onChange, description }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <div className="text-white/60 text-xs font-body">{label}</div>
        {description && <div className="text-white/25 text-[10px] font-mono mt-0.5">{description}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-9 h-5 rounded-full transition-all relative ${value ? 'bg-cyan' : 'bg-white/10'}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all
          ${value ? 'left-4.5' : 'left-0.5'}`} style={{ left: value ? '18px' : '2px' }} />
      </button>
    </div>
  )
}

// ─── CONDITION ROW ─────────────────────────────────────────────────────────────
function ConditionRow({ condition, onUpdate, onRemove, index }) {
  const needsValue = ['Profit is greater than', 'Profit is less than', 'Loss is greater than', 'Number of ticks is'].includes(condition.type)
  return (
    <div className="flex items-center gap-2 p-2.5 bg-white/3 rounded-xl border border-white/5">
      {index > 0 && (
        <span className="text-cyan text-[10px] font-mono bg-cyan/10 px-2 py-0.5 rounded">AND</span>
      )}
      <Field
        value={condition.type}
        onChange={v => onUpdate({ ...condition, type: v })}
        options={SELL_CONDITIONS}
      />
      {needsValue && (
        <NumField
          value={condition.value || 0}
          onChange={v => onUpdate({ ...condition, value: v })}
          min={0}
          prefix="$"
        />
      )}
      <button onClick={onRemove} className="ml-auto text-white/20 hover:text-danger transition-colors">
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  )
}

// ─── MARTINGALE TABLE ─────────────────────────────────────────────────────────
function MartingaleTable({ stake, multiplier, steps = 6 }) {
  const rows = calcMartingaleProjection(stake, multiplier, steps)
  return (
    <div className="rounded-xl overflow-hidden border border-white/5">
      <div className="grid grid-cols-3 bg-white/5 px-3 py-2">
        {['Step', 'Stake', 'Total Risk'].map(h => (
          <span key={h} className="text-white/30 text-[10px] font-mono">{h}</span>
        ))}
      </div>
      {rows.map(r => (
        <div key={r.step} className="grid grid-cols-3 px-3 py-1.5 border-t border-white/3">
          <span className="text-white/40 text-xs font-mono">{r.step}</span>
          <span className="text-white text-xs font-mono">${r.stake}</span>
          <span className={`text-xs font-mono ${r.totalRisk > stake * 10 ? 'text-danger' : 'text-white/60'}`}>${r.totalRisk}</span>
        </div>
      ))}
    </div>
  )
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function VisualBotBuilder() {
  const { ws, isAuthorized, notify, subscribeToSymbol, tickHistory, latestTick } = useDeriv()

  // ── Bot state ──
  const engineRef = useRef(null)
  const [botStatus, setBotStatus] = useState('idle') // idle | running | stopped
  const [logs, setLogs] = useState([
    { time: new Date().toLocaleTimeString(), msg: 'Visual bot builder ready. Configure blocks and start.', type: 'info' }
  ])
  const [liveStats, setLiveStats] = useState({ totalTrades: 0, wins: 0, losses: 0, totalProfit: 0, currentStake: 0 })

  // ── Block 1: Trade Parameters ──
  const [market, setMarket] = useState('Derived')
  const [category, setCategory] = useState('Continuous Indices')
  const [symbol, setSymbol] = useState('1HZ10V')
  const [tradeType, setTradeType] = useState('Up/Down')
  const [tradeSubtype, setTradeSubtype] = useState('Rise/Fall')
  const [contractOption, setContractOption] = useState('Both')
  const [candle, setCandle] = useState('1 minute')
  const [restartOnError, setRestartOnError] = useState(false)
  const [skipOnError, setSkipOnError] = useState(true)
  const [runOnStart, setRunOnStart] = useState(false)
  const [duration, setDuration] = useState(1)
  const [durationUnit, setDurationUnit] = useState('t')
  const [stake, setStake] = useState(0.5)
  const [prediction, setPrediction] = useState(5)
  const [barrier, setBarrier] = useState('+0.1')
  const [currency] = useState('USD')

  // ── Block 2: Purchase Conditions ──
  const [purchaseType, setPurchaseType] = useState('Rise')
  const [strategy, setStrategy] = useState('single')
  const [martingaleMultiplier, setMartingaleMultiplier] = useState(2)
  const [maxMartingaleSteps, setMaxMartingaleSteps] = useState(6)

  // ── Block 3: Sell Conditions ──
  const [sellConditions, setSellConditions] = useState([
    { id: 1, type: 'Sell is available', value: null }
  ])

  // ── Block 4: Restart Conditions ──
  const [restartType, setRestartType] = useState('Trade again')
  const [takeProfit, setTakeProfit] = useState(50)
  const [stopLoss, setStopLoss] = useState(20)
  const [maxTrades, setMaxTrades] = useState(100)
  const [intervalSeconds, setIntervalSeconds] = useState(5)
  const [showMartingale, setShowMartingale] = useState(false)

  // ── Tab state ──
  const [activeTab, setActiveTab] = useState('builder')

  // ── Helpers for Nested Selection ──
  const markets = [...new Set(SYMBOLS.map(s => s.market))]
  const categories = [...new Set(SYMBOLS.filter(s => s.market === market).map(s => s.category))]
  const symbols = SYMBOLS.filter(s => s.category === category)

  const tradeTypes = [...new Set(Object.values(CONTRACT_TYPES).map(t => t.type))]
  const contractTypes = Object.entries(CONTRACT_TYPES)
    .filter(([_, t]) => t.type === tradeType)
    .map(([key, t]) => ({ value: key, label: t.label }))

  // ─── Log helper ──────────────────────────────────────────────────────────────
  const addLog = useCallback((msg, type = 'info') => {
    setLogs(prev => [{
      time: new Date().toLocaleTimeString(), msg, type
    }, ...prev].slice(0, 80))
  }, [])

  // ─── Build config from blocks ────────────────────────────────────────────────
  const buildConfig = () => {
    return {
      symbol,
      contractType: purchaseType,
      stake: parseFloat(stake),
      duration: parseInt(duration),
      durationUnit,
      prediction: parseInt(prediction),
      barrier: barrier,
      strategy,
      martingaleMultiplier: parseFloat(martingaleMultiplier),
      maxMartingaleSteps: parseInt(maxMartingaleSteps),
      takeProfit: parseFloat(takeProfit),
      stopLoss: parseFloat(stopLoss),
      maxTrades: parseInt(maxTrades),
      intervalSeconds: parseInt(intervalSeconds),
      restartOnError,
      skipOnError,
    }
  }


  // ─── Start bot ───────────────────────────────────────────────────────────────
  const handleStart = () => {
    if (!isAuthorized) {
      notify('Connect your Deriv account in Settings first.', 'error')
      return
    }

    const config = buildConfig()
    subscribeToSymbol(config.symbol)

    const engine = new BotEngine({
      config,
      ws,
      onLog: ({ time, msg, type }) => addLog(msg, type),
      onTrade: (trade) => {
        setLiveStats(engine.getStats())
      },
      onStop: ({ reason }) => {
        setBotStatus('stopped')
        setLiveStats(engine.getStats())
      },
    })

    engineRef.current = engine
    setBotStatus('running')
    engine.start()
    setLiveStats(engine.getStats())
  }

  // ─── Stop bot ────────────────────────────────────────────────────────────────
  const handleStop = () => {
    engineRef.current?.stop('Manual stop')
    setBotStatus('stopped')
    if (engineRef.current) {
      setLiveStats(engineRef.current.getStats())
    }
  }

  // ─── Reset ──────────────────────────────────────────────────────────────────
  const handleReset = () => {
    handleStop()
    setBotStatus('idle')
    setLiveStats({ totalTrades: 0, wins: 0, losses: 0, totalProfit: 0, currentStake: stake })
    setLogs([{ time: new Date().toLocaleTimeString(), msg: 'Bot reset. Ready to configure.', type: 'info' }])
  }

  // ─── Export config ───────────────────────────────────────────────────────────
  const handleExport = () => {
    const config = {
      version: '1.0',
      created: new Date().toISOString(),
      blocks: {
        tradeParameters: { market, category, symbol, tradeType, tradeSubtype, contractOption, candle, restartOnError, skipOnError, runOnStart, duration, durationUnit, stake, currency },
        purchaseConditions: { purchaseType, strategy, martingaleMultiplier, maxMartingaleSteps },
        sellConditions,
        restartConditions: { restartType, takeProfit, stopLoss, maxTrades, intervalSeconds },
      }
    }
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `phoenix_bot_${Date.now()}.json`
    a.click()
    notify('Bot configuration exported!', 'success')
  }

  // ─── Import config ───────────────────────────────────────────────────────────
  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target.result)
        const b = json.blocks || {}
        if (b.tradeParameters) {
          const tp = b.tradeParameters
          setMarket(tp.market || 'Derived')
          setCategory(tp.category || 'Continuous Indices')
          setSymbol(tp.symbol || '1HZ10V')
          setTradeType(tp.tradeType || 'Up/Down')
          setTradeSubtype(tp.tradeSubtype || 'Rise/Fall')
          setContractOption(tp.contractOption || 'Both')
          setCandle(tp.candle || '1 minute')
          setRestartOnError(tp.restartOnError || false)
          setSkipOnError(tp.skipOnError !== undefined ? tp.skipOnError : true)
          setRunOnStart(tp.runOnStart || false)
          setDuration(tp.duration || 1)
          setDurationUnit(tp.durationUnit || 't')
          setStake(tp.stake || 0.5)
        }
        if (b.purchaseConditions) {
          const pc = b.purchaseConditions
          setPurchaseType(pc.purchaseType || 'Rise')
          setStrategy(pc.strategy || 'single')
          setMartingaleMultiplier(pc.martingaleMultiplier || 2)
          setMaxMartingaleSteps(pc.maxMartingaleSteps || 6)
        }
        if (b.sellConditions) setSellConditions(b.sellConditions)
        if (b.restartConditions) {
          const rc = b.restartConditions
          setRestartType(rc.restartType || 'Trade again')
          setTakeProfit(rc.takeProfit || 50)
          setStopLoss(rc.stopLoss || 20)
          setMaxTrades(rc.maxTrades || 100)
          setIntervalSeconds(rc.intervalSeconds || 5)
        }
        notify('Bot configuration imported!', 'success')
        addLog('Config imported successfully.', 'success')
      } catch {
        notify('Invalid config file.', 'error')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // ─── Sell conditions management ───────────────────────────────────────────────
  const addSellCondition = () => {
    setSellConditions(prev => [...prev, { id: Date.now(), type: 'Sell is available', value: null }])
  }
  const updateSellCondition = (id, updated) => {
    setSellConditions(prev => prev.map(c => c.id === id ? updated : c))
  }
  const removeSellCondition = (id) => {
    setSellConditions(prev => prev.filter(c => c.id !== id))
  }

  const history = tickHistory[symbol] || []
  const currentTick = latestTick[symbol] || null
  const isRunning = botStatus === 'running'

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full gap-0" style={{ minHeight: 'calc(100vh - 80px)' }}>

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-sans font-bold text-2xl text-white">Bot Builder</h1>
          <p className="text-white/40 text-sm font-body mt-0.5">Visual block-based strategy configuration</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Import */}
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10
                            bg-white/3 hover:bg-white/6 text-white/60 hover:text-white text-xs font-mono
                            cursor-pointer transition-all">
            <Upload className="w-3.5 h-3.5" />
            Import
            <input type="file" accept=".json" className="hidden" onChange={handleImport} />
          </label>

          {/* Export */}
          <button onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10
                       bg-white/3 hover:bg-white/6 text-white/60 hover:text-white text-xs font-mono transition-all">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>

          {/* Reset */}
          <button onClick={handleReset}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10
                       bg-white/3 hover:bg-white/6 text-white/60 hover:text-white text-xs font-mono transition-all">
            <RefreshCw className="w-3.5 h-3.5" />
            Reset
          </button>

          {/* START / STOP */}
          {!isRunning ? (
            <button onClick={handleStart}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono font-bold text-sm
                         bg-[#00ff87] text-[#08090e] hover:bg-[#00e87a] transition-all shadow-glow-green">
              <Play className="w-4 h-4" /> Run Bot
            </button>
          ) : (
            <button onClick={handleStop}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono font-bold text-sm
                         bg-danger text-white hover:bg-danger/90 transition-all">
              <Square className="w-4 h-4" /> Stop
            </button>
          )}
        </div>
      </div>

      {/* ── Live status bar ── */}
      {botStatus !== 'idle' && (
        <div className="mb-4 p-3 rounded-xl border flex items-center gap-5 flex-wrap"
          style={{ background: isRunning ? 'rgba(0,255,135,0.05)' : 'rgba(255,59,92,0.05)', borderColor: isRunning ? 'rgba(0,255,135,0.2)' : 'rgba(255,59,92,0.2)' }}>
          <div className="flex items-center gap-2">
            {isRunning ? (
              <><span className="relative flex h-2 w-2"><span className="animate-ping absolute h-full w-full rounded-full bg-accent opacity-75"></span><span className="relative rounded-full h-2 w-2 bg-accent"></span></span>
                <span className="text-accent text-xs font-mono font-bold">RUNNING</span></>
            ) : (
              <><span className="w-2 h-2 rounded-full bg-danger"></span>
                <span className="text-danger text-xs font-mono font-bold">STOPPED</span></>
            )}
          </div>
          {[
            ['TRADES', liveStats.totalTrades],
            ['WINS', liveStats.wins],
            ['LOSSES', liveStats.losses],
            ['WIN RATE', liveStats.totalTrades ? `${((liveStats.wins / liveStats.totalTrades) * 100).toFixed(0)}%` : '—'],
            ['P&L', liveStats.totalProfit !== undefined ? `${liveStats.totalProfit >= 0 ? '+' : ''}$${(liveStats.totalProfit || 0).toFixed(2)}` : '—'],
            ['NEXT STAKE', liveStats.currentStake ? `$${(liveStats.currentStake || stake).toFixed(2)}` : `$${stake}`],
          ].map(([l, v]) => (
            <div key={l} className="flex items-center gap-2">
              <span className="text-white/30 text-[10px] font-mono">{l}</span>
              <span className={`text-sm font-mono font-bold ${l === 'P&L' ? (liveStats.totalProfit >= 0 ? 'text-accent' : 'text-danger') : 'text-white'}`}>{v}</span>
            </div>
          ))}
          {currentTick && (
            <div className="ml-auto flex items-center gap-2">
              <Activity className="w-3 h-3 text-accent animate-pulse" />
              <span className="text-white/40 text-xs font-mono">{symbol}</span>
              <span className="text-accent text-sm font-mono font-bold">{currentTick.quote?.toFixed(3)}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-5 bg-white/3 rounded-xl p-1 w-fit">
        {[
          { id: 'builder', label: 'Block Builder', icon: Settings },
          { id: 'logs', label: 'Live Logs', icon: Activity },
          { id: 'preview', label: 'Bot Preview', icon: BarChart3 },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition-all
              ${activeTab === id ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
            {id === 'logs' && logs.length > 1 && (
              <span className="w-4 h-4 rounded-full bg-accent/20 text-accent text-[9px] flex items-center justify-center font-bold">
                {Math.min(logs.length - 1, 99)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── BUILDER TAB ── */}
      {activeTab === 'builder' && (
        <div className="grid lg:grid-cols-2 gap-5">

          {/* LEFT COLUMN */}
          <div className="space-y-4">

            {/* ── BLOCK 1: Trade Parameters ── */}
            <Block number="1" title="Trade Parameters" icon={Settings} color="#00d4ff">
              <div className="space-y-4">
                {/* 3-Level Market Selection */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white/40 text-xs font-mono">Market:</span>
                  <Field 
                    value={market} 
                    onChange={v => { setMarket(v); setCategory(SYMBOLS.find(s => s.market === v).category) }} 
                    options={markets} 
                  />
                  <ChevronRight className="w-3 h-3 text-white/20" />
                  <Field 
                    value={category} 
                    onChange={v => { setCategory(v); setSymbol(SYMBOLS.find(s => s.category === v).value) }} 
                    options={categories} 
                  />
                  <ChevronRight className="w-3 h-3 text-white/20" />
                  <Field 
                    value={symbol} 
                    onChange={setSymbol} 
                    options={symbols.map(s => ({ value: s.value, label: s.label }))} 
                  />
                </div>

                {/* 2-Level Trade Selection */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white/40 text-xs font-mono">Trade Type:</span>
                  <Field 
                    value={tradeType} 
                    onChange={v => { 
                      setTradeType(v); 
                      setPurchaseType(Object.keys(CONTRACT_TYPES).find(k => CONTRACT_TYPES[k].type === v)) 
                    }} 
                    options={tradeTypes} 
                  />
                  <ChevronRight className="w-3 h-3 text-white/20" />
                  <Field 
                    value={purchaseType} 
                    onChange={setPurchaseType} 
                    options={contractTypes} 
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-white/40 text-xs font-mono">Default Candle Interval:</span>
                  <Field value={candle} onChange={setCandle} options={CANDLE_INTERVALS} />
                </div>
              </div>

              {/* Toggles */}
              <div className="border-t border-white/5 pt-3 space-y-2">
                <Toggle
                  label="Restart buy/sell on error (disable for better performance)"
                  description="Re-executes last trade if an API error occurs"
                  value={restartOnError}
                  onChange={setRestartOnError}
                />
                <Toggle
                  label="Restart last trade on error (bot ignores the unsuccessful trade)"
                  description="Skips failed trades and continues normally"
                  value={skipOnError}
                  onChange={setSkipOnError}
                />
              </div>

              {/* Run once at start */}
              <div className="border-t border-white/5 pt-3">
                <div className="text-white/50 text-xs font-mono mb-2">Run once at start:</div>
                <Toggle label="Execute one trade immediately when bot starts" value={runOnStart} onChange={setRunOnStart} />
              </div>

              {/* Trade options */}
              <div className="border-t border-white/5 pt-3">
                <div className="text-white/50 text-xs font-mono mb-3">Trade options:</div>
                <div className="flex items-center gap-4 flex-wrap">
                  <Field
                    label="Duration:"
                    value={durationUnit}
                    onChange={setDurationUnit}
                    options={DURATION_UNITS}
                  />
                  <NumField value={duration} onChange={setDuration} min={1} max={365} step={1} />
                  
                  {/* Dynamic Prediction Field for Digits */}
                  {purchaseType.startsWith('DIGIT') && (
                    <NumField label="Prediction:" value={prediction} onChange={setPrediction} min={0} max={9} step={1} />
                  )}

                  {/* Dynamic Barrier Field */}
                  {['ONETOUCH', 'NOTOUCH', 'CALL', 'PUT'].includes(purchaseType) && tradeSubtype === 'Higher/Lower' && (
                    <NumField label="Barrier:" value={barrier} onChange={setBarrier} step={0.01} prefix="+" />
                  )}

                  <NumField
                    label="Stake:"
                    value={stake}
                    onChange={setStake}
                    min={0.35}
                    max={69000}
                    step={0.01}
                    prefix={currency}
                    suffix={`(min: 0.35 - max: 69000)`}
                  />
                </div>
              </div>
            </Block>


            {/* ── BLOCK 2: Purchase Conditions ── */}
            <Block number="2" title="Purchase Conditions" icon={TrendingUp} color="#00ff87">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-white/40 text-xs font-mono">Purchase</span>
                  <div className="px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-lg text-accent text-xs font-mono">
                    {CONTRACT_TYPES[purchaseType]?.label}
                  </div>
                </div>

                {/* Strategy */}
                <div>
                  <div className="text-white/40 text-xs font-mono mb-2">Strategy (stake management):</div>
                  <div className="grid grid-cols-2 gap-2">
                    {STRATEGIES.map(s => (
                      <button key={s.value} onClick={() => setStrategy(s.value)}
                        className={`p-3 rounded-xl text-left transition-all border
                          ${strategy === s.value
                            ? 'border-accent/40 bg-accent/8'
                            : 'border-white/5 bg-white/2 hover:border-white/10'}`}>
                        <div className={`font-mono text-xs font-bold mb-0.5 ${strategy === s.value ? 'text-accent' : 'text-white'}`}>
                          {s.label}
                        </div>
                        <div className="text-white/30 text-[10px] font-body leading-tight">{s.description}</div>
                        <span className={`text-[9px] font-mono mt-1 inline-block px-1.5 py-0.5 rounded
                          ${s.risk === 'High' ? 'bg-danger/15 text-danger' : s.risk === 'Medium' ? 'bg-warning/15 text-warning' : 'bg-accent/15 text-accent'}`}>
                          {s.risk} risk
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Martingale settings */}
                {strategy !== 'single' && (
                  <div className="space-y-3 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-4 flex-wrap">
                      <NumField label="Multiplier:" value={martingaleMultiplier} onChange={setMartingaleMultiplier} min={1.1} max={10} step={0.1} />
                      <NumField label="Max steps:" value={maxMartingaleSteps} onChange={setMaxMartingaleSteps} min={1} max={20} step={1} />
                    </div>
                    <button onClick={() => setShowMartingale(!showMartingale)}
                      className="text-cyan text-xs font-mono flex items-center gap-1 hover:underline">
                      <BarChart3 className="w-3 h-3" />
                      {showMartingale ? 'Hide' : 'Show'} stake projection
                    </button>
                    {showMartingale && <MartingaleTable stake={stake} multiplier={martingaleMultiplier} steps={maxMartingaleSteps} />}
                  </div>
                )}
              </div>
            </Block>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-4">

            {/* ── BLOCK 3: Sell Conditions ── */}
            <Block number="3" title="Sell Conditions" icon={Target} color="#ffb800">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-white/50 text-xs font-mono">
                  <span className="text-white/30">if</span>
                  <span className="text-white/60">conditions below are met</span>
                  <span className="text-white/30">then sell contract</span>
                </div>

                {sellConditions.map((c, i) => (
                  <ConditionRow
                    key={c.id}
                    condition={c}
                    index={i}
                    onUpdate={(updated) => updateSellCondition(c.id, updated)}
                    onRemove={() => removeSellCondition(c.id)}
                  />
                ))}

                <button onClick={addSellCondition}
                  className="flex items-center gap-2 text-xs font-mono text-cyan hover:text-white transition-colors">
                  <div className="w-5 h-5 rounded-lg bg-cyan/15 border border-cyan/20 flex items-center justify-center">
                    <Plus className="w-3 h-3" />
                  </div>
                  Add condition
                </button>
              </div>
            </Block>

            {/* ── BLOCK 4: Restart Conditions ── */}
            <Block number="4" title="Restart Trading Conditions" icon={RefreshCw} color="#00ff87">
              <div className="space-y-4">
                <Field value={restartType} onChange={setRestartType} options={RESTART_CONDITIONS} />

                <div className="border-t border-white/5 pt-3 space-y-3">
                  <div className="text-white/40 text-xs font-mono mb-1">Risk management:</div>

                  <div className="flex items-center gap-4 flex-wrap">
                    <NumField label="Take profit:" value={takeProfit} onChange={setTakeProfit} min={0} prefix="$" />
                    <NumField label="Stop loss:" value={stopLoss} onChange={setStopLoss} min={0} prefix="$" />
                  </div>

                  <div className="flex items-center gap-4 flex-wrap">
                    <NumField label="Max trades:" value={maxTrades} onChange={setMaxTrades} min={1} step={1} />
                    <NumField label="Interval (s):" value={intervalSeconds} onChange={setIntervalSeconds} min={1} step={1} />
                  </div>
                </div>
              </div>
            </Block>

            {/* ── Warning ── */}
            <div className="p-4 rounded-xl border border-danger/20 bg-danger/5 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
              <div className="text-danger/70 text-xs font-body leading-relaxed">
                <span className="text-danger font-bold block mb-0.5">Risk Warning</span>
                Automated trading carries significant financial risk. Always test on a demo account before using real funds. Never trade with money you cannot afford to lose.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LOGS TAB ── */}
      {activeTab === 'logs' && (
        <div className="card-glow flex flex-col" style={{ minHeight: 500 }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-accent" />
              <span className="font-sans font-semibold text-white text-sm">Live Bot Logs</span>
              {isRunning && (
                <span className="relative flex h-2 w-2 ml-1">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-accent opacity-75"></span>
                  <span className="relative rounded-full h-2 w-2 bg-accent"></span>
                </span>
              )}
            </div>
            <button onClick={() => setLogs([])} className="text-white/30 text-xs font-mono hover:text-white transition-colors">CLEAR</button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 font-mono text-xs space-y-1.5" style={{ maxHeight: 520 }}>
            {logs.map((log, i) => (
              <div key={i} className="flex gap-3 py-0.5">
                <span className="text-white/25 shrink-0 w-16">{log.time}</span>
                <span className={`
                  ${log.type === 'success' ? 'text-accent' : ''}
                  ${log.type === 'error' ? 'text-danger' : ''}
                  ${log.type === 'warning' ? 'text-warning' : ''}
                  ${log.type === 'info' ? 'text-white/50' : ''}
                `}>{log.msg}</span>
              </div>
            ))}
            {logs.length === 0 && <div className="text-white/20 text-center pt-10">No logs yet. Start your bot.</div>}
          </div>
        </div>
      )}

      {/* ── PREVIEW TAB ── */}
      {activeTab === 'preview' && (
        <div className="grid md:grid-cols-2 gap-5">
          {/* Config summary */}
          <div className="card-glow p-6">
            <h3 className="font-sans font-semibold text-white mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-accent" /> Bot Configuration Summary
            </h3>
            <div className="space-y-3">
              {[
                ['Symbol', symbol],
                ['Market', `${market} › ${category}`],
                ['Trade Type', `${tradeType} › ${tradeSubtype}`],
                ['Purchase Type', purchaseType],
                ['Duration', `${duration} ${durationUnit}`],
                ['Stake', `${currency} ${stake}`],
                ['Strategy', STRATEGIES.find(s => s.value === strategy)?.label || strategy],
                ...(strategy !== 'single' ? [['Multiplier', `×${martingaleMultiplier}`], ['Max Steps', maxMartingaleSteps]] : []),
                ['Take Profit', `$${takeProfit}`],
                ['Stop Loss', `$${stopLoss}`],
                ['Max Trades', maxTrades],
                ['Interval', `${intervalSeconds}s between trades`],
                ['Restart on Error', restartOnError ? 'Yes' : 'No'],
                ['Skip Failed Trades', skipOnError ? 'Yes' : 'No'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-1.5 border-b border-white/4">
                  <span className="text-white/40 text-xs font-mono">{k}</span>
                  <span className="text-white text-xs font-mono">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Flow diagram */}
          <div className="card-glow p-6">
            <h3 className="font-sans font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan" /> Execution Flow
            </h3>
            <div className="space-y-2">
              {[
                { num: '1', label: 'Connect to Deriv API', status: isAuthorized ? 'done' : 'pending', detail: isAuthorized ? 'Authorized ✓' : 'Not yet authorized' },
                { num: '2', label: 'Subscribe to tick feed', status: isRunning ? 'active' : 'pending', detail: symbol },
                { num: '3', label: 'Wait for trade signal', status: isRunning ? 'active' : 'pending', detail: `Purchase: ${purchaseType}` },
                { num: '4', label: 'Submit buy contract', status: liveStats.totalTrades > 0 ? 'done' : 'pending', detail: `${duration}${durationUnit} @ $${stake}` },
                { num: '5', label: 'Monitor contract', status: isRunning ? 'active' : 'pending', detail: sellConditions.map(c => c.type).join(', ') },
                { num: '6', label: 'Settle + adjust stake', status: liveStats.totalTrades > 0 ? 'active' : 'pending', detail: strategy },
                { num: '7', label: 'Restart or stop', status: isRunning ? 'active' : 'pending', detail: restartType },
              ].map(step => (
                <div key={step.num} className="flex items-start gap-3 p-3 rounded-xl bg-white/2 border border-white/5 relative overflow-hidden">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0 z-10
                    ${step.status === 'done' ? 'bg-accent text-bg' : step.status === 'active' ? 'bg-cyan text-bg animate-pulse' : 'bg-white/10 text-white/40'}`}>
                    {step.status === 'done' ? '✓' : step.num}
                  </div>
                  <div className="flex-1 z-10">
                    <div className="text-white text-xs font-sans font-medium">{step.label}</div>
                    <div className="text-white/30 text-[10px] font-mono mt-0.5">{step.detail}</div>
                  </div>
                  {step.status === 'active' && <div className="absolute right-0 top-0 bottom-0 w-1 bg-cyan shadow-glow-cyan" />}
                </div>
              ))}
            </div>
          </div>


          {/* Martingale projection if applicable */}
          {strategy !== 'single' && (
            <div className="card-glow p-6 md:col-span-2">
              <h3 className="font-sans font-semibold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-warning" /> Stake Progression Projection
              </h3>
              <MartingaleTable stake={stake} multiplier={martingaleMultiplier} steps={maxMartingaleSteps} />
              <p className="text-white/30 text-xs font-body mt-3">
                If you hit {maxMartingaleSteps} consecutive losses, your total exposure would be $
                {calcMartingaleProjection(stake, martingaleMultiplier, maxMartingaleSteps).at(-1)?.totalRisk?.toFixed(2)}.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import {
  TrendingDown, Activity, ArrowUpRight
} from 'lucide-react'
import { useDeriv } from '../context/DerivContext'
import { SYMBOLS } from '../deriv'
import { format } from 'date-fns'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract the underlying symbol from a Deriv shortcode.
 * Shortcode format: "DIGITOVER_5T_R_100_0_5.00_0", "CALL_5T_frxEURUSD_...", etc.
 * We search for any known symbol value as a substring (longest match first).
 */
function extractSymbolFromShortcode(shortcode) {
  if (!shortcode) return null
  // Sort descending by length so e.g. "CRASH1000" beats "CRASH"
  const sorted = [...SYMBOLS].sort((a, b) => b.value.length - a.value.length)
  for (const sym of sorted) {
    if (shortcode.includes(sym.value)) return sym.value
  }
  return null
}

function calculateEquityCurve(profitTable) {
  if (!profitTable || profitTable.length === 0) return []
  const sorted = [...profitTable].sort((a, b) => (a.purchase_time || 0) - (b.purchase_time || 0))
  let cumulative = 0
  return sorted.map(t => {
    const pnl = parseFloat(t.sell_price) - parseFloat(t.buy_price)
    cumulative += pnl
    return {
      date: format(new Date(t.purchase_time * 1000), 'MMM d HH:mm'),
      pnl: parseFloat(cumulative.toFixed(2)),
      tradePnl: parseFloat(pnl.toFixed(2))
    }
  })
}

function StatCard({ label, value, sub, color = 'accent', trend }) {
  return (
    <div className="card p-6 border-l-2" style={{ borderLeftColor: `var(--color-${color}, #00C880)` }}>
      <div className="text-text-muted text-[10px] font-mono tracking-widest uppercase mb-3">{label}</div>
      <div className="flex items-end gap-3 mb-1">
        <span className="text-white heading-formal font-bold text-3xl leading-none">{value}</span>
        {trend !== undefined && (
          <span className={`text-xs font-mono font-bold pb-0.5 flex items-center gap-0.5 ${trend >= 0 ? 'text-accent' : 'text-danger'}`}>
            {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      {sub && <span className="text-text-dim text-xs font-sans">{sub}</span>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Analytics() {
  const {
    balance, accountInfo, profitTable, activeBots, botRunning,
    latestTick, subscribeToSymbol, ws, isAuthorized
  } = useDeriv()

  const [openTrades, setOpenTrades] = useState({})

  // ── Open contract real-time updates ──────────────────────────────────────────
  useEffect(() => {
    const unsubPoc = ws.subscribe('proposal_open_contract', (data) => {
      if (data.proposal_open_contract) {
        const c = data.proposal_open_contract
        if (c.is_sold) {
          setOpenTrades(prev => { const n = { ...prev }; delete n[c.contract_id]; return n })
        } else {
          setOpenTrades(prev => ({ ...prev, [c.contract_id]: c }))
        }
      }
    })
    // Request all currently-open contracts when landing on this page
    if (isAuthorized) {
      ws.send({ proposal_open_contract: 1, subscribe: 1 })
    }
    return () => unsubPoc()
  }, [ws, isAuthorized])

  // ── Subscribe to real-time ticks for traded symbols ───────────────────────
  useEffect(() => {
    // Extract unique underlying symbols from the profit table
    const tradedSymbols = [
      ...new Set(profitTable.map(t => extractSymbolFromShortcode(t.shortcode)).filter(Boolean))
    ]
    const toSub = tradedSymbols.length > 0 ? tradedSymbols.slice(0, 6) : ['R_100', 'R_50', 'R_10']
    toSub.forEach(s => subscribeToSymbol(s))
  }, [profitTable, subscribeToSymbol])

  // ── Fetch fresh profit table each time the user navigates here ───────────
  useEffect(() => {
    if (isAuthorized) ws.getProfitTable(50)
  }, [isAuthorized]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived metrics ───────────────────────────────────────────────────────
  const equityData = calculateEquityCurve(profitTable)

  const totalProfit = profitTable.reduce((s, t) => s + (parseFloat(t.sell_price) - parseFloat(t.buy_price)), 0)
  const wins   = profitTable.filter(t => parseFloat(t.sell_price) > parseFloat(t.buy_price)).length
  const losses = profitTable.length - wins
  const winRate = profitTable.length ? ((wins / profitTable.length) * 100).toFixed(1) : 0

  const grossProfit = profitTable.reduce((s, t) => {
    const p = parseFloat(t.sell_price) - parseFloat(t.buy_price)
    return p > 0 ? s + p : s
  }, 0)
  const grossLoss = Math.abs(profitTable.reduce((s, t) => {
    const p = parseFloat(t.sell_price) - parseFloat(t.buy_price)
    return p < 0 ? s + p : s
  }, 0))
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? 'MAX' : '0.00'
  const avgTrade = profitTable.length ? (totalProfit / profitTable.length).toFixed(2) : '0.00'

  const recentTrades = [...profitTable].sort((a, b) => b.purchase_time - a.purchase_time).slice(0, 10)

  // Build market-pulse rows from traded symbols with live prices
  const tradedSymbols = [
    ...new Set(profitTable.map(t => extractSymbolFromShortcode(t.shortcode)).filter(Boolean))
  ].slice(0, 5)
  const pulseSymbols = (tradedSymbols.length > 0 ? tradedSymbols : ['R_100', 'R_50', 'R_10'])
  const markets = pulseSymbols.map(sym => {
    const meta = SYMBOLS.find(s => s.value === sym)
    return { symbol: sym, name: meta?.label ?? sym, tick: latestTick[sym] || null }
  })

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h1 className="heading-formal text-2xl font-bold uppercase tracking-widest text-white">Maichez Analytics</h1>
          <p className="text-text-muted text-[10px] font-mono mt-1 uppercase tracking-tighter">Institutional Performance Protocol v4.2</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-mono font-bold animate-pulse">
            LIVE SYNC ACTIVE
          </div>
        </div>
      </div>

      {/* ── STATS ROW ── */}
      <div className="responsive-grid mb-8">
        <StatCard
          label="Total Net Profit"
          value={balance ? `${balance.currency} ${totalProfit.toFixed(2)}` : '—.——'}
          sub={`from ${profitTable.length} completed trades`}
          color={totalProfit >= 0 ? 'accent' : 'danger'}
        />
        <StatCard
          label="Win Rate"
          value={`${winRate.toFixed(1)}%`}
          sub={`${wins} wins vs ${losses} losses`}
          color={winRate >= 50 ? 'accent' : 'warning'}
          trend={profitTable.length > 0 ? (totalProfit > 0 ? 12 : -5) : undefined}
        />
        <StatCard
          label="Performance Factor"
          value={profitFactor}
          sub="Gross Profit / Gross Loss"
          color={parseFloat(profitFactor) > 1.5 ? 'accent' : 'cyan'}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">


        {/* ── P&L CHART ── */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="heading-formal text-lg font-bold uppercase tracking-widest">Equity Growth Curve</h2>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-text-muted">History Size</span>
              <span className="px-2 py-1 bg-white/5 text-white/40 border border-white/10">
                {profitTable.length} Trades
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            {equityData.length > 0 ? (
              <AreaChart data={equityData}>
                <defs>
                  <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"   stopColor="#00ff87" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#00ff87" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="date" hide={true} />
                <YAxis
                  orientation="right"
                  tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontFamily: 'Space Grotesk' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => `$${v}`}
                  width={40}
                />
                <Tooltip
                  cursor={{ stroke: 'rgba(0,255,135,0.2)', strokeWidth: 1 }}
                  contentStyle={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                  labelStyle={{ color: '#9ca3af', fontFamily: 'Space Grotesk', fontSize: 10, marginBottom: 4 }}
                  itemStyle={{ color: '#00ff87', fontFamily: 'Space Grotesk', fontSize: 12, fontWeight: 'bold' }}
                  formatter={(val) => [`$${val}`, 'Equity P&L']}
                />
                <Area
                  type="stepAfter"
                  dataKey="pnl"
                  stroke="#00ff87"
                  strokeWidth={2}
                  fill="url(#pnlGrad)"
                  dot={false}
                  animationDuration={1000}
                />
              </AreaChart>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-white/10 gap-3 border border-dashed border-white/5 rounded-xl">
                <Activity className="w-8 h-8" />
                <span className="text-xs font-mono">Insufficient trade history to plot curve</span>
              </div>
            )}
          </ResponsiveContainer>
        </div>

        {/* ── MARKET PULSE ── */}
        <div className="card p-6 flex flex-col">
          <h2 className="heading-formal text-lg font-bold uppercase tracking-widest mb-6">Market Pulse</h2>
          <div className="flex-1 space-y-4">
            {markets.map(({ symbol, name, tick }) => (
              <div key={symbol} className="flex items-center justify-between group">
                <div>
                  <div className="text-white text-xs font-sans font-bold group-hover:text-accent transition-colors">{name}</div>
                  <div className="text-[9px] font-mono text-white/20">{symbol}</div>
                </div>
                <div className="text-right">
                  <div className={`font-mono font-bold text-xs ${tick ? 'text-accent' : 'text-white/20'}`}>
                    {tick ? tick.quote.toFixed(3) : 'connecting…'}
                  </div>
                  <div className="text-[9px] font-mono text-white/10 italic">
                    {tick ? format(new Date(tick.epoch * 1000), 'HH:mm:ss') : 'Live Feed'}
                  </div>
                </div>
              </div>
            ))}
            {markets.length === 0 && (
              <div className="text-white/10 text-xs font-mono py-10 text-center italic">Awaiting execution data...</div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-white/5">
            <div className="flex items-center justify-between text-[10px] font-mono text-white/30 mb-2">
              <span>W/L DISTRIBUTION</span>
              <span>{winRate}% ACCURACY</span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex">
              <div className="h-full bg-accent" style={{ width: `${winRate}%`, transition: 'width 0.5s ease' }} />
              <div className="h-full bg-danger/50" style={{ width: `${100 - winRate}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── OPEN CONTRACTS ── */}
      {Object.values(openTrades).length > 0 && (
        <div className="card p-6">
          <h2 className="heading-formal text-lg font-bold uppercase tracking-widest mb-4">
            Open Contracts
            <span className="ml-3 text-xs font-mono text-accent">{Object.values(openTrades).length} LIVE</span>
          </h2>
          <div className="space-y-2">
            {Object.values(openTrades).map(c => (
              <div key={c.contract_id} className="flex items-center justify-between p-3 border border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                  <span className="text-xs font-mono text-white/60">#{c.contract_id}</span>
                  <span className="text-xs font-sans text-white">{c.underlying}</span>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span className="text-white/40">Stake: ${parseFloat(c.buy_price || 0).toFixed(2)}</span>
                  <span className={parseFloat(c.profit || 0) >= 0 ? 'text-accent' : 'text-danger'}>
                    P&L: {parseFloat(c.profit || 0) >= 0 ? '+' : ''}${parseFloat(c.profit || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── RECENT TRADES ── */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="heading-formal text-lg font-bold uppercase tracking-widest">Execution Audit Trail</h2>
          <div className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Last {recentTrades.length} Transactions</div>
        </div>
        {recentTrades.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {['Reference', 'Asset', 'Contract', 'Stake', 'Payout', 'Net Return', 'Time'].map(h => (
                    <th key={h} className="text-left text-text-muted text-[10px] font-mono pb-3 uppercase tracking-wider font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentTrades.map(t => {
                  const pnl = parseFloat(t.sell_price) - parseFloat(t.buy_price)
                  const sym = extractSymbolFromShortcode(t.shortcode)
                  const contractType = t.shortcode?.split('_')[0] || '—'
                  return (
                    <tr key={t.transaction_id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                      <td className="py-4 pr-5 text-text-muted text-xs font-mono">{String(t.transaction_id).slice(-8)}</td>
                      <td className="py-4 pr-5 text-white text-xs font-sans font-medium">{sym || '—'}</td>
                      <td className="py-4 pr-5 text-white/40 text-xs font-mono">{contractType}</td>
                      <td className="py-4 pr-5 text-white text-xs font-mono">${parseFloat(t.buy_price).toFixed(2)}</td>
                      <td className="py-4 pr-5 text-white text-xs font-mono">${parseFloat(t.sell_price).toFixed(2)}</td>
                      <td className="py-4 pr-5">
                        <span className={`font-mono text-xs font-bold px-2 py-1 ${pnl >= 0 ? 'bg-accent/10 text-accent' : 'bg-danger/10 text-danger'}`}>
                          {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-4 text-text-muted text-xs font-mono">
                        {t.sell_time ? format(new Date(t.sell_time * 1000), 'HH:mm:ss') : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-text-muted font-sans text-sm">No recent execution data available.</p>
          </div>
        )}
      </div>
    </div>
  )
}

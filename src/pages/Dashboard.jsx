import { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import {
  TrendingUp, TrendingDown, Activity, Bot, DollarSign, Target, Clock, ArrowUpRight
} from 'lucide-react'
import { useDeriv } from '../context/DerivContext'
import { format } from 'date-fns'

function generateMockPnl() {
  const data = []
  let val = 1000
  for (let i = 30; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    val += (Math.random() - 0.42) * 80
    data.push({ date: format(date, 'MMM d'), pnl: parseFloat(val.toFixed(2)) })
  }
  return data
}
const mockPnlData = generateMockPnl()

function StatCard({ label, value, sub, color = 'accent', trend }) {
  return (
    <div className="card p-6 border-l-2" style={{ borderLeftColor: `var(--tw-colors-${color})` }}>
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

export default function Dashboard() {
  const { balance, accountInfo, profitTable, activeBots, botRunning, ticks, subscribeToSymbol, ws } = useDeriv()
  const [openTrades, setOpenTrades] = useState({})

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
    return () => unsubPoc()
  }, [ws])

  useEffect(() => {
    subscribeToSymbol('R_100')
    subscribeToSymbol('R_50')
    subscribeToSymbol('R_25')
  }, [subscribeToSymbol])

  const totalProfit = profitTable.reduce((s, t) => s + (parseFloat(t.sell_price) - parseFloat(t.buy_price)), 0)
  const wins = profitTable.filter(t => parseFloat(t.sell_price) > parseFloat(t.buy_price)).length
  const winRate = profitTable.length ? ((wins / profitTable.length) * 100).toFixed(1) : 0
  const recentTrades = profitTable.slice(0, 5)

  const markets = [
    { symbol: 'R_100', name: 'Volatility 100' },
    { symbol: 'R_50',  name: 'Volatility 50' },
    { symbol: 'R_25',  name: 'Volatility 25' },
  ].map(m => ({ ...m, tick: ticks[m.symbol]?.slice(-1)[0] || null }))

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <h1 className="heading-formal text-2xl font-bold uppercase tracking-widest">Dashboard</h1>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard label="Account Equity" value={balance ? `$${parseFloat(balance.balance).toFixed(2)}` : '—'} sub={balance?.currency || 'USD'} color="accent" />
        <StatCard label="Net Realized P&L" value={`${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(2)}`} color={totalProfit >= 0 ? 'accent' : 'danger'} trend={totalProfit >= 0 ? 4.2 : -1.8} />
        <StatCard label="Win Rate" value={`${winRate}%`} sub={`${wins}W / ${profitTable.length - wins}L`} color="cyan" />
        <StatCard label="Active Algorithms" value={activeBots.filter(b => b.status === 'running').length} sub={botRunning ? 'Executing' : 'Idle'} color="purple" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">

        {/* ── P&L CHART ── */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="heading-formal text-lg font-bold uppercase tracking-widest">Performance Curve</h2>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-text-muted">30D Return</span>
              <span className={`px-2 py-1 ${totalProfit >= 0 ? 'bg-accent/10 text-accent' : 'bg-danger/10 text-danger'}`}>
                {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)} USD
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={mockPnlData}>
              <defs>
                <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#d4af37" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#d4af37" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'Space Grotesk' }} tickLine={false} axisLine={false} dy={10} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'Space Grotesk' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} dx={-10} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                contentStyle={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 0 }}
                labelStyle={{ color: '#9ca3af', fontFamily: 'Space Grotesk', fontSize: 10 }}
                itemStyle={{ color: '#d4af37', fontFamily: 'Space Grotesk', fontSize: 14, fontWeight: 'bold' }} />
              <Area type="monotone" dataKey="pnl" stroke="#d4af37" strokeWidth={2} fill="url(#pnlGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ── LIVE MARKETS ── */}
        <div className="card p-6">
          <h2 className="heading-formal text-lg font-bold uppercase tracking-widest mb-6">Market Data</h2>
          <div className="space-y-1">
            {markets.map(({ symbol, name, tick }) => (
              <div key={symbol} className="flex items-center justify-between p-4 border border-white/5 bg-surface-2 hover:bg-surface-3 transition-colors">
                <div>
                  <div className="text-white text-sm font-sans font-bold">{name}</div>
                  <div className="text-text-muted text-[10px] font-mono mt-0.5">{symbol}</div>
                </div>
                <div className="text-right">
                  <div className="text-accent font-mono font-bold text-sm">
                    {tick ? tick.quote.toFixed(3) : '—'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RECENT TRADES ── */}
      <div className="card p-6">
        <h2 className="heading-formal text-lg font-bold uppercase tracking-widest mb-6">Recent Executions</h2>
        {recentTrades.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {['Reference', 'Asset', 'Stake', 'Payout', 'Net Return', 'Execution Time'].map(h => (
                    <th key={h} className="text-left text-text-muted text-[10px] font-mono pb-3 uppercase tracking-wider font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentTrades.map(t => {
                  const pnl = parseFloat(t.sell_price) - parseFloat(t.buy_price)
                  return (
                    <tr key={t.transaction_id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                      <td className="py-4 pr-5 text-text-muted text-xs font-mono">{String(t.transaction_id).slice(-8)}</td>
                      <td className="py-4 pr-5 text-white text-xs font-sans font-medium">{t.shortcode?.split('_')[0] || '—'}</td>
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

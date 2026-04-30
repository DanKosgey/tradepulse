import { useEffect, useState } from 'react'
import { useDeriv } from '../context/DerivContext'
import {
    BarChart2, TrendingUp, TrendingDown, Download,
    Filter, RefreshCw, Search
} from 'lucide-react'
import { format } from 'date-fns'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell
} from 'recharts'

export default function History() {
    const { profitTable, ws, isAuthorized } = useDeriv()
    const [filter, setFilter] = useState('all')
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(false)

    const refresh = () => {
        setLoading(true)
        if (isAuthorized) {
            ws.getProfitTable(50)
        }
        setTimeout(() => setLoading(false), 1000)
    }

    useEffect(() => {
        if (isAuthorized) ws.getProfitTable(50)
    }, [isAuthorized, ws])

    const trades = profitTable.map(t => ({
        ...t,
        pnl: parseFloat(t.sell_price) - parseFloat(t.buy_price),
        win: parseFloat(t.sell_price) > parseFloat(t.buy_price),
    }))

    const filtered = trades.filter(t => {
        if (filter === 'wins') return t.win
        if (filter === 'losses') return !t.win
        if (search) return t.shortcode?.toLowerCase().includes(search.toLowerCase())
        return true
    })

    const totalPnl = trades.reduce((s, t) => s + t.pnl, 0)
    const wins = trades.filter(t => t.win).length
    const losses = trades.length - wins
    const winRate = trades.length ? ((wins / trades.length) * 100).toFixed(1) : 0

    // Daily P&L for chart
    const dailyPnl = trades.reduce((acc, t) => {
        const day = t.sell_time
            ? format(new Date(t.sell_time * 1000), 'MMM d')
            : 'Unknown'
        acc[day] = (acc[day] || 0) + t.pnl
        return acc
    }, {})

    const chartData = Object.entries(dailyPnl)
        .slice(-14)
        .map(([date, pnl]) => ({ date, pnl: parseFloat(pnl.toFixed(2)) }))

    const downloadCsv = () => {
        const headers = 'ID,Symbol,Stake,Payout,P&L,Time\n'
        const rows = filtered.map(t =>
            `${t.transaction_id},"${t.shortcode || ''}",${t.buy_price},${t.sell_price},${t.pnl.toFixed(2)},${t.sell_time ? new Date(t.sell_time * 1000).toISOString() : ''}`
        ).join('\n')
        const blob = new Blob([headers + rows], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `phoenix_history_${Date.now()}.csv`
        a.click()
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-sans font-bold text-2xl text-white">Trade History</h1>
                    <p className="text-text-muted text-sm font-body mt-1">Your complete trading record</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={refresh} className="p-2 rounded-lg border border-muted/30 hover:bg-surface-3 text-text-muted hover:text-white transition-colors">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={downloadCsv} className="btn-outline flex items-center gap-2 text-sm py-2">
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'TOTAL TRADES', value: trades.length, color: 'text-white' },
                    { label: 'WIN RATE', value: `${winRate}%`, color: 'text-accent' },
                    { label: 'TOTAL WINS', value: wins, color: 'text-accent' },
                    { label: 'TOTAL P&L', value: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`, color: totalPnl >= 0 ? 'text-accent' : 'text-danger' },
                ].map(c => (
                    <div key={c.label} className="card-glow p-5">
                        <div className="text-text-muted text-xs font-mono mb-2">{c.label}</div>
                        <div className={`font-mono font-bold text-2xl ${c.color}`}>{c.value}</div>
                    </div>
                ))}
            </div>

            {/* Daily P&L Chart */}
            {chartData.length > 0 && (
                <div className="card-glow p-6">
                    <h2 className="font-sans font-semibold text-white mb-5 flex items-center gap-2">
                        <BarChart2 className="w-4 h-4 text-accent" /> Daily P&L
                    </h2>
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(58,63,82,0.3)" />
                            <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                            <Tooltip
                                contentStyle={{ background: '#0d0f18', border: '1px solid #3a3f52', borderRadius: 12 }}
                                labelStyle={{ color: '#6b7280', fontFamily: 'Space Mono', fontSize: 10 }}
                                itemStyle={{ color: '#00ff87', fontFamily: 'Space Mono', fontSize: 12 }}
                            />
                            <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, i) => (
                                    <Cell key={i} fill={entry.pnl >= 0 ? '#00ff87' : '#ff3b5c'} fillOpacity={0.8} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Filters + Table */}
            <div className="card-glow">
                {/* Filter bar */}
                <div className="p-5 border-b border-muted/20 flex items-center gap-4 flex-wrap">
                    <div className="relative flex-1 min-w-48">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-text-muted" />
                        <input
                            className="input-field pl-10 py-2.5 text-sm"
                            placeholder="Search trades..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-text-muted" />
                        {['all', 'wins', 'losses'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-mono capitalize transition-colors
                  ${filter === f
                                        ? 'bg-accent text-bg font-bold'
                                        : 'border border-muted/30 text-text-muted hover:text-white'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    {filtered.length > 0 ? (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-muted/20">
                                    {['#', 'CONTRACT', 'TYPE', 'STAKE', 'PAYOUT', 'P&L', 'RESULT', 'TIME'].map(h => (
                                        <th key={h} className="text-left text-text-muted text-xs font-mono py-4 px-5">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-muted/10">
                                {filtered.map((t, i) => (
                                    <tr key={t.transaction_id} className="hover:bg-surface-3/50 transition-colors group">
                                        <td className="py-4 px-5 text-text-muted text-xs font-mono">{i + 1}</td>
                                        <td className="py-4 px-5 text-white text-xs font-mono">{t.transaction_id}</td>
                                        <td className="py-4 px-5">
                                            <span className="text-text-muted text-xs font-body">
                                                {t.shortcode?.split('_')[0] || '—'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-5 text-white text-sm font-mono">${parseFloat(t.buy_price).toFixed(2)}</td>
                                        <td className="py-4 px-5 text-white text-sm font-mono">${parseFloat(t.sell_price).toFixed(2)}</td>
                                        <td className="py-4 px-5">
                                            <span className={`font-mono text-sm font-bold ${t.pnl >= 0 ? 'text-accent' : 'text-danger'}`}>
                                                {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="py-4 px-5">
                                            {t.win ? (
                                                <span className="badge-green flex items-center gap-1 w-fit">
                                                    <TrendingUp className="w-3 h-3" /> WIN
                                                </span>
                                            ) : (
                                                <span className="badge-red flex items-center gap-1 w-fit">
                                                    <TrendingDown className="w-3 h-3" /> LOSS
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 px-5 text-text-muted text-xs font-mono">
                                            {t.sell_time ? format(new Date(t.sell_time * 1000), 'MMM d, HH:mm:ss') : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="py-16 text-center">
                            <BarChart2 className="w-10 h-10 text-muted mx-auto mb-3" />
                            <p className="text-text-muted font-body">
                                {isAuthorized ? 'No trades found. Start a bot to begin.' : 'Connect your account to view history.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

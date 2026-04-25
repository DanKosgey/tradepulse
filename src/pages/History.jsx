import { useEffect, useState } from 'react'
import { useDeriv } from '../context/DerivContext'
import { format } from 'date-fns'
import { Download } from 'lucide-react'

export default function History() {
  const { profitTable, ws, isAuthorized } = useDeriv()
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(false)

  useEffect(() => { if (isAuthorized) ws.getProfitTable(50) }, [isAuthorized, ws])

  const refresh = () => {
    setLoading(true)
    if (isAuthorized) ws.getProfitTable(50)
    setTimeout(() => setLoading(false), 1000)
  }

  const trades = profitTable.map(t => ({
    ...t,
    pnl: parseFloat(t.sell_price) - parseFloat(t.buy_price),
    win: parseFloat(t.sell_price) > parseFloat(t.buy_price),
  }))

  const filtered = trades.filter(t => {
    if (filter === 'wins') return t.win
    if (filter === 'losses') return !t.win
    return true
  })

  const downloadCsv = () => {
    const headers = 'ID,Symbol,Stake,Payout,P&L,Time\n'
    const rows = filtered.map(t =>
      `${t.transaction_id},"${t.shortcode || ''}",${t.buy_price},${t.sell_price},${t.pnl.toFixed(2)},${t.sell_time ? new Date(t.sell_time * 1000).toISOString() : ''}`
    ).join('\n')
    const url = URL.createObjectURL(new Blob([headers + rows], { type: 'text/csv' }))
    const a = document.createElement('a'); a.href = url; a.download = `tradepulse_history_${Date.now()}.csv`; a.click()
  }

  return (
    <div className="space-y-6 pb-4">
      
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <h1 className="heading-formal text-2xl font-bold uppercase tracking-widest">Execution Ledger</h1>
        <div className="flex items-center gap-4">
          <button onClick={refresh} className="text-xs font-mono uppercase tracking-widest text-text-muted hover:text-white transition-colors">
            {loading ? 'SYNCING...' : 'SYNC LEDGER'}
          </button>
          <button onClick={downloadCsv} className="btn-outline px-4 py-2 text-[10px]">
            <Download className="w-3.5 h-3.5 mr-2" /> Export Data
          </button>
        </div>
      </div>

      <div className="card p-8">
        
        <div className="flex justify-end mb-6">
          <div className="flex border border-white/10">
            {['all', 'wins', 'losses'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-6 py-2 text-xs font-mono uppercase tracking-widest transition-colors border-r border-white/10 last:border-0 ${
                  filter === f ? 'bg-white/10 text-white' : 'text-text-muted hover:bg-white/5'
                }`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/20">
                  {['Reference', 'Asset', 'Stake', 'Payout', 'Net Return', 'Execution Time'].map(h => (
                    <th key={h} className="text-left text-text-muted text-[10px] font-mono pb-4 uppercase tracking-wider font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.transaction_id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                    <td className="py-4 pr-5 text-text-muted text-xs font-mono">{String(t.transaction_id).slice(-8)}</td>
                    <td className="py-4 pr-5 text-white text-xs font-sans font-medium">{t.shortcode?.split('_')[0] || '—'}</td>
                    <td className="py-4 pr-5 text-white text-xs font-mono">${parseFloat(t.buy_price).toFixed(2)}</td>
                    <td className="py-4 pr-5 text-white text-xs font-mono">${parseFloat(t.sell_price).toFixed(2)}</td>
                    <td className="py-4 pr-5">
                      <span className={`font-mono text-xs font-bold px-2 py-1 ${t.pnl >= 0 ? 'bg-accent/10 text-accent' : 'bg-danger/10 text-danger'}`}>
                        {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-4 text-text-muted text-xs font-mono">
                      {t.sell_time ? format(new Date(t.sell_time * 1000), 'MMM d, HH:mm:ss') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="text-text-muted font-sans text-sm">No transaction records found.</p>
          </div>
        )}
      </div>
    </div>
  )
}

import { Menu, Briefcase, RefreshCw, Bell } from 'lucide-react'
import { useDeriv } from '../context/DerivContext'
import { useState } from 'react'

export default function MobileHeader({ onMenuClick }) {
  const { balance, isConnected, ws, isAuthorized } = useDeriv()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1000)
    if (isAuthorized) {
      ws.getBalance()
    }
  }

  return (
    <header className="lg:hidden sticky top-0 z-30 w-full flex flex-col"
      style={{
        background: 'linear-gradient(180deg, rgba(4,20,12,0.98) 0%, rgba(2,14,8,0.95) 100%)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,200,128,0.2)',
      }}>
      
      {/* Upper row: Logo & Menu & Actions */}
      <div className="flex items-center justify-between px-4 h-16">
        <div className="flex items-center gap-3">
          <button 
            onClick={onMenuClick}
            className="p-2 -ml-2 text-accent hover:bg-accent/10 rounded-lg transition-colors"
          >
            <Menu size={24} />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 flex items-center justify-center border border-accent/40 bg-accent/5">
              <Briefcase className="w-3.5 h-3.5 text-accent" />
            </div>
            <span className="heading-formal font-bold text-base text-white tracking-wider uppercase">Maichez Trades</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} className="p-2 text-text-muted hover:text-accent transition-colors">
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <div className="relative p-2 text-text-muted hover:text-accent transition-colors">
            <Bell size={18} />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-accent rounded-full shadow-[0_0_8px_rgba(0,255,135,0.6)]" />
          </div>
        </div>
      </div>

      {/* Lower row: Account Status (optional) */}
      <div className="px-4 pb-3 flex items-center justify-between border-t border-white/5 pt-2">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-accent animate-pulse shadow-[0_0_8px_rgba(0,255,135,0.4)]' : 'bg-danger'}`} />
          <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest">
            {isConnected ? 'Live Connection' : 'Disconnected'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest">Balance:</span>
          <span className="text-sm font-mono font-bold text-white">
            {balance ? `${balance.currency} ${parseFloat(balance.balance).toFixed(2)}` : '—.——'}
          </span>
        </div>
      </div>
    </header>
  )
}

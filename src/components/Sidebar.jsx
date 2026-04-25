import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Bot, History, LineChart,
  Settings, LogOut, Zap, Wifi, WifiOff,
  ChevronRight, TrendingUp, Briefcase
} from 'lucide-react'
import { useDeriv } from '../context/DerivContext'

const navItems = [
  { to: '/app',          label: 'Dashboard',  icon: LayoutDashboard, end: true },
  { to: '/app/bot',      label: 'Bot Builder', icon: Bot },
  { to: '/app/charts',   label: 'Charts',      icon: LineChart },
  { to: '/app/history',  label: 'History',     icon: History },
  { to: '/app/settings', label: 'Settings',    icon: Settings },
]

export default function Sidebar() {
  const { logout, isConnected, accountInfo, balance } = useDeriv()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/') }

  return (
    <aside className="w-64 flex flex-col shrink-0 relative bg-black/60 backdrop-blur-xl"
      style={{
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}>

      {/* ── LOGO ── */}
      <div className="px-6 py-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center border border-accent">
            <Briefcase className="w-4 h-4 text-accent" />
          </div>
          <div>
            <span className="heading-formal font-bold text-xl text-white tracking-widest uppercase">MAICHEZ</span>
            <span className="heading-formal font-bold text-xl text-accent tracking-widest uppercase"> TRADES</span>
          </div>
        </div>
      </div>

      {/* ── ACCOUNT CARD ── */}
      <div className="px-5 py-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-text-muted text-[10px] font-mono tracking-widest uppercase">Portfolio</span>
          <div className="flex items-center gap-1.5">
            {isConnected ? (
              <>
                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                <span className="text-accent text-[10px] font-mono uppercase tracking-wider">Online</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 bg-danger rounded-full" />
                <span className="text-danger text-[10px] font-mono uppercase tracking-wider">Offline</span>
              </>
            )}
          </div>
        </div>

        {accountInfo ? (
          <>
            <div className="text-white heading-formal font-bold text-2xl mb-1 tracking-tight">
              {balance ? `${balance.currency} ${parseFloat(balance.balance).toFixed(2)}` : '—.——'}
            </div>
            <div className="text-text-muted text-xs font-sans truncate mb-3">{accountInfo.email}</div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono px-2 py-0.5 border uppercase tracking-wider ${
                accountInfo.is_virtual
                  ? 'border-cyan/30 text-cyan bg-cyan/5'
                  : 'border-accent/30 text-accent bg-accent/5'
              }`}>
                {accountInfo.is_virtual ? 'Demo' : 'Real'}
              </span>
              <span className="text-text-muted text-[10px] font-mono">{accountInfo.loginid}</span>
            </div>
          </>
        ) : (
          <div className="text-text-muted text-xs font-sans">Awaiting connection...</div>
        )}
      </div>

      {/* ── NAV ── */}
      <nav className="flex-1 py-6 space-y-1">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            {({ isActive }) => (
              <>
                <Icon className={`w-4 h-4 ${isActive ? 'text-accent' : 'text-text-muted'}`} />
                <span className={`flex-1 uppercase tracking-wider text-xs ${isActive ? 'font-bold' : ''}`}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── LOGOUT ── */}
      <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 text-danger hover:text-white hover:bg-danger py-3 text-xs font-sans uppercase tracking-widest transition-all duration-300 border border-transparent hover:border-danger">
          <LogOut className="w-3.5 h-3.5" />
          <span>Disconnect</span>
        </button>
      </div>
    </aside>
  )
}

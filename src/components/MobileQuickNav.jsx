import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, Bot, MousePointerClick, 
  Activity, LineChart, History, Settings 
} from 'lucide-react'

const navItems = [
  { to: '/app',                 label: 'Dash',       icon: LayoutDashboard, end: true },
  { to: '/app/bot',             label: 'Build',      icon: Bot },
  { to: '/app/manual-trader',   label: 'Trade',      icon: MousePointerClick },
  { to: '/app/analytics',       label: 'Stats',      icon: Activity },
  { to: '/app/charts',          label: 'Charts',     icon: LineChart },
  { to: '/app/history',         label: 'History',    icon: History },
  { to: '/app/settings',        label: 'Config',     icon: Settings },
]

export default function MobileQuickNav() {
  return (
    <div className="lg:hidden w-full overflow-x-auto scrollbar-hide border-b border-white/5"
      style={{
        background: 'rgba(2,14,8,0.4)',
        backdropFilter: 'blur(10px)',
      }}>
      <nav className="flex items-center px-4 min-w-max h-12 gap-1">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `
              flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300
              ${isActive 
                ? 'bg-accent/15 text-accent border border-accent/20' 
                : 'text-text-muted hover:text-white'}
            `}
          >
            <Icon size={14} />
            <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

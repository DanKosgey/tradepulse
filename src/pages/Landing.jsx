import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDeriv } from '../context/DerivContext'
import {
  TrendingUp, Shield, BarChart2, Briefcase,
  ArrowRight, CheckCircle, Lock, Play, Cpu,
  Activity, ArrowUpRight
} from 'lucide-react'

const features = [
  {
    icon: Cpu,
    title: 'Algorithmic Execution',
    desc: 'Deploy sophisticated trading algorithms across multiple markets simultaneously with zero latency.',
  },
  {
    icon: BarChart2,
    title: 'Advanced Analytics',
    desc: 'Institutional-grade charting and performance tracking for rigorous strategy evaluation.',
  },
  {
    icon: Shield,
    title: 'Risk Protocol',
    desc: 'Strict capital preservation modules including dynamic trailing stops and exposure limits.',
  },
]

export default function Landing() {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { login } = useDeriv()
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleConnect = async (e) => {
    e.preventDefault()
    if (!token.trim()) return
    setLoading(true)
    login(token.trim())
    setTimeout(() => { setLoading(false); navigate('/app') }, 1500)
  }

  const handleDerivOAuth = () => {
    const appId = import.meta.env.VITE_DERIV_APP_ID || '1089'
    const redirectUri = encodeURIComponent(window.location.origin + '/app')
    window.location.href = `https://oauth.deriv.com/oauth2/authorize?app_id=${appId}&l=en&brand=deriv&redirect_uri=${redirectUri}`
  }

  return (
    <div className="min-h-screen text-white font-sans" style={{ position: 'relative', background: 'transparent' }}>

      {/* ── ENHANCED BACKGROUND ── */}
      {/* Background image with maximum contrast + brightness boost */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: 'url(/bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        filter: 'contrast(1.5) brightness(1.3) saturate(1.6) sharpness(1.2)',
        zIndex: -2,
      }} />
      {/* Dynamic Vignette — Sharper edges to make the center content electrifying */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(circle at center, transparent 20%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.85) 100%)',
        zIndex: -1,
        pointerEvents: 'none',
      }} />
      {/* Near-transparent gloss tint */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,10,5,0.05)',
        zIndex: -1,
        pointerEvents: 'none',
      }} />

      {/* ── NAVBAR ── */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        scrolled
          ? 'backdrop-blur-xl border-b border-accent/20'
          : 'bg-transparent'
      }`}
        style={scrolled ? { background: 'rgba(2,12,7,0.88)', boxShadow: '0 4px 30px rgba(0,200,128,0.08)' } : {}}>
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center" style={{ border: '1px solid #00C880' }}>
              <Briefcase className="w-4 h-4" style={{ color: '#00C880' }} />
            </div>
            <span className="heading-formal font-bold text-xl tracking-widest uppercase">
              MAICHEZ <span style={{ color: '#00C880' }}>TRADES</span>
            </span>
          </div>

          <div className="flex items-center gap-8">
            <a href="#platform" className="text-sm font-medium tracking-widest uppercase text-text-muted hover:text-white transition-colors hidden sm:block">Platform</a>
            <a href="#security" className="text-sm font-medium tracking-widest uppercase text-text-muted hover:text-white transition-colors hidden sm:block">Security</a>
            <button onClick={() => document.getElementById('connect').scrollIntoView()} className="btn-primary px-6 py-2">
              Client Portal
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative pt-40 pb-32 px-6 flex flex-col items-center justify-center min-h-[90vh]">
        <div className="text-center max-w-4xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-accent/30 bg-accent/5 mb-8 animate-fade-in">
            <span className="w-1.5 h-1.5 bg-accent" />
            <span className="text-accent text-xs font-mono uppercase tracking-widest">Institutional Grade Infrastructure</span>
          </div>

          <h1 className="heading-formal font-bold text-5xl md:text-7xl leading-[1.1] mb-8 animate-slide-up">
            Precision Automation.<br />
            <span className="text-accent" style={{
              textShadow: '0 0 30px rgba(0,200,128,0.6), 0 0 60px rgba(0,200,128,0.3), 0 0 100px rgba(0,200,128,0.15)'
            }}>Absolute Control.</span>
          </h1>

          <p className="text-text-muted text-lg font-body leading-relaxed mb-12 max-w-2xl mx-auto">
            MAICHEZ TRADES provides professional traders with a unified environment to deploy,
            monitor, and optimize automated strategies across Deriv markets.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button onClick={() => document.getElementById('connect').scrollIntoView()} className="btn-primary w-full sm:w-auto px-10 py-4">
              Access Terminal <ArrowUpRight className="w-4 h-4" />
            </button>
            <a href="https://api.deriv.com" target="_blank" rel="noreferrer" className="btn-outline w-full sm:w-auto px-10 py-4">
              Documentation
            </a>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="platform" className="max-w-7xl mx-auto px-6 py-24 border-t border-white/5">
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div key={i} className="p-8 border border-accent/10 transition-all duration-500 group"
              style={{
                background: 'linear-gradient(135deg, rgba(0,30,16,0.75) 0%, rgba(2,14,8,0.85) 100%)',
                backdropFilter: 'blur(20px)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(0,200,128,0.5)'
                e.currentTarget.style.boxShadow = '0 0 30px rgba(0,200,128,0.12), 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(0,200,128,0.1)'
                e.currentTarget.style.transform = 'translateY(-4px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(0,200,128,0.1)'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.transform = 'none'
              }}
            >
              <f.icon className="w-8 h-8 text-accent mb-6" style={{ filter: 'drop-shadow(0 0 8px rgba(0,200,128,0.5))' }} />
              <h3 className="heading-formal text-xl font-bold mb-3">{f.title}</h3>
              <p className="text-text-muted text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CONNECT ── */}
      <section id="connect" className="max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-md mx-auto">
          <div className="card border border-white/10 p-10">
            <div className="text-center mb-8">
              <h2 className="heading-formal text-2xl font-bold mb-2 uppercase tracking-widest">Client Authentication</h2>
              <p className="text-text-muted text-sm">Secure connection via Deriv API</p>
            </div>

            <button onClick={handleDerivOAuth} className="btn-outline w-full py-4 mb-6 border-white/20 hover:border-white">
              Authenticate via Deriv
            </button>

            <div className="flex items-center gap-4 mb-6 opacity-50">
              <div className="flex-1 h-px bg-white/20" />
              <span className="text-xs font-mono uppercase tracking-widest">Manual Token</span>
              <div className="flex-1 h-px bg-white/20" />
            </div>

            <form onSubmit={handleConnect} className="space-y-6">
              <div>
                <input
                  type="password"
                  className="input-field text-center font-mono tracking-widest"
                  placeholder="Enter API Token..."
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  autoComplete="off"
                />
              </div>

              <button type="submit" disabled={loading || !token.trim()} className="btn-primary w-full py-4">
                {loading ? 'Initializing...' : 'Connect to Terminal'}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-2 text-text-muted text-xs">
              <Lock className="w-3.5 h-3.5" /> Client-side storage only. End-to-end encrypted.
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 py-12 text-center bg-black/50">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Briefcase className="w-4 h-4 text-accent" />
          <span className="heading-formal font-bold text-white uppercase tracking-widest">MAICHEZ TRADES</span>
        </div>
        <p className="text-text-muted text-xs tracking-wider uppercase">
          Strictly for professional use. Capital is at risk.
        </p>
      </footer>
    </div>
  )
}

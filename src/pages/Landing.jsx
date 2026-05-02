import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDeriv } from '../context/DerivContext'
import {
  TrendingUp, Shield, BarChart2, Briefcase,
  Lock, Cpu, Activity, ArrowUpRight,
  ExternalLink, CheckCircle, AlertCircle, Loader2
} from 'lucide-react'
import { generateCodeVerifier, generateCodeChallenge } from '../utils/authUtils'
import { parseDerivOAuthParams } from '../utils/authUtils'



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

// ─── OAuth callback detection ─────────────────────────────────────────────────
function hasOAuthTokens() {
  const search = window.location.search || window.location.hash.replace(/^#/, '?')
  return search.includes('token1=') || search.includes('code=')
}




export default function Landing() {
  const [token, setToken]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // OAuth callback state: 'idle' | 'processing' | 'success' | 'error'
  const [oauthState, setOauthState] = useState(() => hasOAuthTokens() ? 'processing' : 'idle')
  const [oauthError, setOauthError] = useState('')

  const { login, isAuthorized, isConnected, notify } = useDeriv()
  const navigate = useNavigate()

  // ── Scroll effect ───────────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ── OAuth callback handler ──────────────────────────────────────────────────
  // When Deriv redirects back, the URL contains token1=... params.
  // DerivContext parses them, calls ws.authorize(), and on success sets
  // isAuthorized=true. We watch isAuthorized here to navigate to /app.
  useEffect(() => {
    if (oauthState !== 'processing') return

    // If WS isn't connected yet, wait — auth will fire once it connects
    if (!isConnected) return

    // Timeout: if auth doesn't complete within 15 s, show an error
    const timeout = setTimeout(() => {
      setOauthState('error')
      setOauthError(
        'Authentication timed out. This usually means your App ID does not have ' +
        window.location.origin + ' registered as a redirect URI in the Deriv dashboard.'
      )
    }, 15_000)

    return () => clearTimeout(timeout)
  }, [oauthState, isConnected])

  // Navigate to /app as soon as authorization succeeds
  useEffect(() => {
    if (oauthState === 'processing' && isAuthorized) {
      setOauthState('success')
      // Brief visual confirmation before navigating
      const t = setTimeout(() => navigate('/app', { replace: true }), 800)
      return () => clearTimeout(t)
    }
  }, [isAuthorized, oauthState, navigate])

  // ── PAT (Personal Access Token) login ───────────────────────────────────────
  const handleConnect = async (e) => {
    e.preventDefault()
    if (!token.trim()) return
    setLoading(true)
    login(token.trim())
    // Watch for isAuthorized to flip; fallback: navigate after 3 s
    const t = setTimeout(() => { setLoading(false); navigate('/app') }, 3000)
    return () => clearTimeout(t)
  }

  // Navigate once authorized via PAT
  useEffect(() => {
    if (loading && isAuthorized) {
      setLoading(false)
      navigate('/app', { replace: true })
    }
  }, [isAuthorized, loading, navigate])

  // ── Deriv OAuth redirect ─────────────────────────────────────────────────────
  // Per Deriv docs:
  //   GET https://oauth.deriv.com/oauth2/authorize
  //     ?app_id={APP_ID}
  //     &l=EN
  //     &redirect_uri={REDIRECT_URI}
  //
  // After login Deriv redirects to:
  //   {REDIRECT_URI}/?acct1={loginid}&token1={token}&cur1={currency}[&acct2=...]
  //
  // ⚠️  For this to work, {REDIRECT_URI} MUST be registered in your app's
  //     "Redirect URIs" list at https://api.deriv.com/dashboard.
  //     App ID 1089 is Deriv's demo; it does NOT whitelist localhost.
  //     Register your own app to use OAuth with localhost or your domain.
  const handleDerivOAuth = async () => {
    const appId = import.meta.env.VITE_DERIV_APP_ID || '1089'
    const redirectUri = window.location.origin + '/'
    
    // Modern PKCE Flow (Preferred Method)
    const verifier = generateCodeVerifier()
    sessionStorage.setItem('pkce_code_verifier', verifier)
    
    const challenge = await generateCodeChallenge(verifier)
    const state = Math.random().toString(36).substring(7)
    sessionStorage.setItem('oauth_state', state)

    const oauthUrl = `https://auth.deriv.com/oauth2/auth?` +
      `response_type=code&` +
      `client_id=${appId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=trade&` +
      `state=${state}&` +
      `code_challenge=${challenge}&` +
      `code_challenge_method=S256`

    window.location.href = oauthUrl
  }

  const appId = import.meta.env.VITE_DERIV_APP_ID || '1089'
  const isDemo = appId === '1089'
  const isAppIdInvalid = !/^\d+$/.test(String(appId))


  // ── OAuth processing overlay ─────────────────────────────────────────────────
  if (oauthState === 'processing' || oauthState === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'radial-gradient(ellipse at center, rgba(0,30,16,0.9) 0%, #020c05 100%)' }}>
        <div className="text-center max-w-md mx-auto px-8">
          {oauthState === 'success' ? (
            <>
              <CheckCircle className="w-16 h-16 text-accent mx-auto mb-6" style={{ filter: 'drop-shadow(0 0 20px rgba(0,200,128,0.6))' }} />
              <h2 className="heading-formal text-2xl font-bold text-white mb-3 uppercase tracking-widest">Authenticated</h2>
              <p className="text-text-muted text-sm font-mono">Launching terminal…</p>
            </>
          ) : (
            <>
              <Loader2 className="w-16 h-16 text-accent mx-auto mb-6 animate-spin" style={{ filter: 'drop-shadow(0 0 16px rgba(0,200,128,0.4))' }} />
              <h2 className="heading-formal text-2xl font-bold text-white mb-3 uppercase tracking-widest">Completing Sign-In</h2>
              <p className="text-text-muted text-sm font-mono">Authorising your Deriv session…</p>
              <div className="mt-6 flex items-center justify-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-accent' : 'bg-white/20 animate-pulse'}`} />
                <span className="text-xs font-mono text-white/30">
                  {isConnected ? 'WebSocket connected — awaiting auth' : 'Connecting to Deriv API…'}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── OAuth error overlay ───────────────────────────────────────────────────────
  if (oauthState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'radial-gradient(ellipse at center, rgba(30,0,8,0.9) 0%, #0c0205 100%)' }}>
        <div className="max-w-lg mx-auto px-8 text-center">
          <AlertCircle className="w-16 h-16 text-danger mx-auto mb-6" style={{ filter: 'drop-shadow(0 0 16px rgba(255,59,92,0.4))' }} />
          <h2 className="heading-formal text-2xl font-bold text-white mb-4 uppercase tracking-widest">OAuth Failed</h2>
          <p className="text-text-muted text-sm leading-relaxed mb-8">{oauthError}</p>

          <div className="p-5 border border-white/10 bg-white/3 text-left mb-8">
            <p className="text-xs font-mono text-accent uppercase tracking-widest mb-3">How to fix</p>
            <ol className="text-xs text-white/50 space-y-2 list-decimal list-inside">
              <li>Go to <a href="https://api.deriv.com/dashboard" target="_blank" rel="noreferrer" className="text-accent underline">api.deriv.com/dashboard</a> and register your app</li>
              <li>Add <code className="text-white/70">{window.location.origin}/</code> as an allowed redirect URI</li>
              <li>Copy your new App ID into <code className="text-white/70">.env</code> → <code className="text-white/70">VITE_DERIV_APP_ID=your_id</code></li>
              <li>Or use a Personal Access Token below instead</li>
            </ol>
          </div>

          <div className="flex gap-3 justify-center">
            <button onClick={() => setOauthState('idle')} className="btn-primary">
              Use API Token Instead
            </button>
            <button onClick={() => { setOauthState('idle'); setOauthError('') }} className="btn-outline">
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Main landing page ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen text-white font-sans" style={{ position: 'relative', background: 'transparent' }}>

      {/* Background */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'url(/bg.png)',
        backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
        filter: 'contrast(1.5) brightness(1.3) saturate(1.6)',
        zIndex: -2,
      }} />
      <div style={{
        position: 'fixed', inset: 0,
        background: 'radial-gradient(circle at center, transparent 20%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.85) 100%)',
        zIndex: -1, pointerEvents: 'none',
      }} />

      {/* Navbar */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? 'backdrop-blur-xl border-b border-accent/20' : 'bg-transparent'}`}
        style={scrolled ? { background: 'rgba(2,12,7,0.88)', boxShadow: '0 4px 30px rgba(0,200,128,0.08)' } : {}}>
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center" style={{ border: '1px solid #00C880' }}>
              <Briefcase className="w-4 h-4" style={{ color: '#00C880' }} />
            </div>
            <span className="heading-formal font-bold text-xl tracking-widest uppercase">Maichez Trades</span>
          </div>
          <div className="flex items-center gap-8">
            <a href="#platform" className="text-sm font-medium tracking-widest uppercase text-text-muted hover:text-white transition-colors hidden sm:block">Platform</a>
            <a href="#security" className="text-sm font-medium tracking-widest uppercase text-text-muted hover:text-white transition-colors hidden sm:block">Security</a>
            <button onClick={() => document.getElementById('connect').scrollIntoView({ behavior: 'smooth' })} className="btn-primary px-6 py-2">
              Client Portal
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-40 pb-32 px-6 flex flex-col items-center justify-center min-h-[90vh]">
        <div className="text-center max-w-4xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-accent/30 bg-accent/5 mb-8">
            <span className="w-1.5 h-1.5 bg-accent" />
            <span className="text-accent text-xs font-mono uppercase tracking-widest">Institutional Grade Infrastructure</span>
          </div>
          <h1 className="heading-formal font-bold text-5xl md:text-7xl leading-[1.1] mb-8">
            Precision Automation.<br />
            <span className="text-accent" style={{ textShadow: '0 0 30px rgba(0,200,128,0.6), 0 0 60px rgba(0,200,128,0.3)' }}>
              Absolute Control.
            </span>
          </h1>
          <p className="text-text-muted text-lg font-body leading-relaxed mb-12 max-w-2xl mx-auto">
            Maichez Trades provides professional traders with a unified environment to deploy,
            monitor, and optimize automated strategies across Deriv markets.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button onClick={() => document.getElementById('connect').scrollIntoView({ behavior: 'smooth' })} className="btn-primary w-full sm:w-auto px-10 py-4">
              Access Terminal <ArrowUpRight className="w-4 h-4" />
            </button>
            <a href="https://api.deriv.com" target="_blank" rel="noreferrer" className="btn-outline w-full sm:w-auto px-10 py-4">
              Documentation
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="platform" className="max-w-7xl mx-auto px-6 py-24 border-t border-white/5">
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div key={i} className="p-8 border border-accent/10 transition-all duration-500"
              style={{ background: 'linear-gradient(135deg, rgba(0,30,16,0.75) 0%, rgba(2,14,8,0.85) 100%)', backdropFilter: 'blur(20px)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,200,128,0.5)'; e.currentTarget.style.transform = 'translateY(-4px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,200,128,0.1)'; e.currentTarget.style.transform = 'none' }}>
              <f.icon className="w-8 h-8 text-accent mb-6" style={{ filter: 'drop-shadow(0 0 8px rgba(0,200,128,0.5))' }} />
              <h3 className="heading-formal text-xl font-bold mb-3">{f.title}</h3>
              <p className="text-text-muted text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── AUTH SECTION ── */}
      <section id="connect" className="max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-md mx-auto">
          <div className="card border border-white/10 p-10">
            <div className="text-center mb-8">
              <h2 className="heading-formal text-2xl font-bold mb-2 uppercase tracking-widest">Client Authentication</h2>
              <p className="text-text-muted text-sm">Secure connection via Deriv API</p>
            </div>

            {/* ── OAuth Button ── */}
            <button
              onClick={handleDerivOAuth}
              className="btn-primary w-full py-4 mb-3 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
              </svg>
              Sign in with Deriv OAuth
            </button>

            {/* Demo App ID warning */}
            {isDemo && (
              <div className="mb-4 px-3 py-2 border border-yellow-500/20 bg-yellow-500/5 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
                <div className="text-[10px] font-mono text-yellow-300/60 leading-relaxed">
                  <strong>Demo App ID (1089)</strong> — OAuth requires your own App ID with{' '}
                  <code className="text-yellow-300/80">{window.location.origin}/</code> registered as a redirect URI.{' '}
                  <a href="https://api.deriv.com/dashboard" target="_blank" rel="noreferrer"
                    className="text-yellow-300 underline inline-flex items-center gap-0.5">
                    Register app <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 mb-6 mt-2">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-white/30">or use API token</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* ── PAT Token Form ── */}
            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-text-muted block mb-2">
                  Personal Access Token
                </label>
                <input
                  type="password"
                  className="input-field text-center font-mono tracking-widest"
                  placeholder="a1-xxxxxxxxxxxxxxxxxxxxxxxx"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              <button type="submit" disabled={loading || !token.trim()} className="btn-outline w-full py-3">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Connecting…
                  </span>
                ) : 'Connect with Token'}
              </button>
            </form>

            {/* Get Token link */}
            <div className="mt-4 text-center">
              <a href="https://app.deriv.com/account/api-token" target="_blank" rel="noreferrer"
                className="text-[10px] font-mono text-text-muted hover:text-accent transition-colors uppercase tracking-widest inline-flex items-center gap-1">
                Generate API Token <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div id="security" className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-2 text-text-muted text-xs">
              <Lock className="w-3.5 h-3.5" /> Client-side storage only. End-to-end encrypted.
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 text-center bg-black/50">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Briefcase className="w-4 h-4 text-accent" />
          <span className="heading-formal font-bold text-white uppercase tracking-widest">Maichez Trades</span>
        </div>
        <p className="text-text-muted text-xs tracking-wider uppercase">Strictly for professional use. Capital is at risk.</p>
      </footer>
    </div>
  )
}

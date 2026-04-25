import { useState } from 'react'
import { useDeriv } from '../context/DerivContext'
import { useNavigate } from 'react-router-dom'
import { Key, Shield, Trash2, ExternalLink } from 'lucide-react'

export default function Settings() {
  const { apiToken, accountInfo, login, logout, isConnected, isAuthorized, balance, switchAccount } = useDeriv()
  const navigate = useNavigate()

  const [newToken, setNewToken] = useState('')
  const [saving, setSaving] = useState(false)

  const maskedToken = apiToken
    ? apiToken.slice(0, 6) + '•'.repeat(Math.max(0, apiToken.length - 10)) + apiToken.slice(-4)
    : 'Not Configured'

  const handleSaveToken = (e) => {
    e.preventDefault()
    if (!newToken.trim()) return
    setSaving(true)
    login(newToken.trim())
    setTimeout(() => { setSaving(false); setNewToken('') }, 1200)
  }

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <h1 className="heading-formal text-2xl font-bold uppercase tracking-widest">Platform Settings</h1>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        
        <div className="card p-8">
          <h2 className="text-xs font-mono tracking-widest uppercase text-text-muted mb-6">Connection Integrity</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-white/10">
              <span className="text-xs font-mono uppercase tracking-widest text-text-muted">WebSocket Server</span>
              <span className={`text-xs font-mono font-bold uppercase tracking-widest ${isConnected ? 'text-accent' : 'text-danger'}`}>
                {isConnected ? 'Connected' : 'Offline'}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 border border-white/10">
              <span className="text-xs font-mono uppercase tracking-widest text-text-muted">API Authorization</span>
              <span className={`text-xs font-mono font-bold uppercase tracking-widest ${isAuthorized ? 'text-cyan' : 'text-danger'}`}>
                {isAuthorized ? 'Authorized' : 'Pending'}
              </span>
            </div>
          </div>
        </div>

        <div className="card p-8">
          <h2 className="text-xs font-mono tracking-widest uppercase text-text-muted mb-6">Account Verification</h2>
          {accountInfo?.account_list?.length > 0 && (
            <div className="mb-6">
              <div className="flex gap-2">
                {accountInfo.account_list.map(acct => {
                  const isActive = acct.loginid === accountInfo.loginid
                  return (
                    <button key={acct.loginid} onClick={() => switchAccount(acct.loginid)} disabled={isActive}
                      className={`px-4 py-2 border text-xs font-mono uppercase tracking-widest transition-colors flex-1 ${
                        isActive ? 'border-accent bg-accent/5 text-accent' : 'border-white/10 text-text-muted hover:border-white/30'
                      }`}>
                      {acct.is_virtual ? 'Demo' : 'Real'}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {[
              ['Email', accountInfo?.email || '—'],
              ['Currency', balance?.currency || accountInfo?.currency || '—'],
              ['Equity', balance ? `${parseFloat(balance.balance).toFixed(2)}` : '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-3 border-b border-white/5 last:border-0">
                <span className="text-xs font-mono uppercase tracking-widest text-text-muted">{label}</span>
                <span className="text-xs font-sans font-bold">{value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      <div className="card p-8">
        <h2 className="text-xs font-mono tracking-widest uppercase text-text-muted mb-6 flex items-center gap-2">
          <Key className="w-4 h-4" /> API Configuration
        </h2>

        <div className="p-4 border border-white/10 mb-8 inline-block">
          <span className="text-xs font-mono uppercase tracking-widest text-text-muted mr-4">Active Key:</span>
          <span className="text-sm font-mono tracking-widest">{maskedToken}</span>
        </div>

        <form onSubmit={handleSaveToken} className="max-w-xl">
          <div className="mb-6">
            <label className="text-xs font-mono uppercase tracking-widest text-text-muted block mb-3">Install New Token</label>
            <input type="password" placeholder="Paste authentication token..." className="input-field"
              value={newToken} onChange={e => setNewToken(e.target.value)} autoComplete="off" />
          </div>
          
          <div className="flex items-center gap-4">
            <button type="submit" disabled={saving || !newToken.trim()} className="btn-primary">
              {saving ? 'Validating...' : 'Apply Configuration'}
            </button>
            <a href="https://app.deriv.com/account/api-token" target="_blank" rel="noreferrer" className="btn-outline">
              Generate Key <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </div>
        </form>
      </div>

      <div className="card p-8 border border-danger/30">
        <h2 className="text-xs font-mono tracking-widest uppercase text-danger mb-4 flex items-center gap-2">
          <Trash2 className="w-4 h-4" /> System Disconnect
        </h2>
        <p className="text-sm text-text-muted mb-6 max-w-xl">
          Terminating the session will purge local key storage and sever all active WebSocket connections.
        </p>
        <button onClick={() => { logout(); navigate('/') }} className="btn-danger">
          Terminate Session
        </button>
      </div>
    </div>
  )
}

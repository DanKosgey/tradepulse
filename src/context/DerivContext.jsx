/**
 * DerivContext.jsx
 * Central state provider for Deriv WebSocket integration.
 *
 * Responsibilities:
 *  - OAuth token ingestion on mount
 *  - WebSocket authorisation lifecycle
 *  - Account / balance / profit-table / symbol data
 *  - Tick streaming (array per symbol, capped at 500; latest tick also exposed)
 *  - Bot engine lifecycle (start / stop / pause / resume)
 *  - App-wide notification bus
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react'
import { useDerivWS } from '../hooks/useDerivWS'
import { BotEngine } from '../botEngine'
import { parseDerivOAuthParams, saveDerivAccounts } from '../utils/authUtils'

// ─── Constants ────────────────────────────────────────────────────────────────

const TICK_HISTORY_LIMIT = 500
const NOTIFICATION_DURATION_MS = 4_000
const TOKEN_STORAGE_KEY = 'deriv_token'
const TOKENS_MAP_STORAGE_KEY = 'deriv_tokens' // { [loginid]: token }

// Symbols always streamed in the Topbar — subscribed immediately after auth
const TOPBAR_SYMBOLS = ['R_100', 'R_50', 'R_25', '1HZ100V']

// ─── Context ──────────────────────────────────────────────────────────────────

const DerivContext = createContext(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DerivProvider({ children }) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const [apiToken, setApiToken] = useState(
    () => localStorage.getItem(TOKEN_STORAGE_KEY) ?? ''
  )
  const [accountInfo, setAccountInfo] = useState(null)
  const lastAttemptedToken = useRef(null)

  // ── Market data ───────────────────────────────────────────────────────────
  const [balance, setBalance] = useState(null)
  const [profitTable, setProfitTable] = useState([])
  const [activeSymbols, setActiveSymbols] = useState([])

  /**
   * tickHistory  – { [symbol]: Tick[] }  (last TICK_HISTORY_LIMIT entries)
   * latestTick   – { [symbol]: Tick }    (the single most-recent tick per symbol)
   *
   * Components that only need the current price use `latestTick[symbol]`.
   * Components that need a chart array use `tickHistory[symbol]`.
   */
  const [tickHistory, setTickHistory] = useState({})
  const [latestTick, setLatestTick] = useState({})

  // ── Trade log ─────────────────────────────────────────────────────────────
  const [trades, setTrades] = useState([])

  // ── Bot state ─────────────────────────────────────────────────────────────
  const [activeBots, setActiveBots] = useState([])
  const [botRunning, setBotRunning] = useState(false)
  const [botPaused, setBotPaused] = useState(false)
  const botInstance = useRef(null)

  // ── Notifications ─────────────────────────────────────────────────────────
  const [notification, setNotification] = useState(null)
  const notifTimerRef = useRef(null)

  const appId = useMemo(() => import.meta.env.VITE_DERIV_APP_ID || '1089', [])
  const ws = useDerivWS(appId)

  // ─── Notification helper ────────────────────────────────────────────────────

  const notify = useCallback((msg, type = 'info') => {
    clearTimeout(notifTimerRef.current)
    setNotification({ msg, type, id: Date.now() })
    notifTimerRef.current = setTimeout(
      () => setNotification(null),
      NOTIFICATION_DURATION_MS
    )
  }, [])

  // Cleanup timer on unmount
  useEffect(() => () => clearTimeout(notifTimerRef.current), [])

  // ─── OAuth token ingestion ──────────────────────────────────────────────────
  // Runs once on mount. Checks URL for token1= params injected by Deriv's
  // OAuth redirect, persists them, then strips the URL.

  useEffect(() => {
    const rawParams = window.location.search || window.location.hash.replace(/^#/, '?') || ''
    const { accounts, code, state } = parseDerivOAuthParams(rawParams)

    // Handle Legacy Tokens (Fallback)
    if (accounts.length > 0) {
      const tokenMap = accounts.reduce((acc, { loginid, token }) => {
        acc[loginid] = token
        return acc
      }, {})
      localStorage.setItem(TOKENS_MAP_STORAGE_KEY, JSON.stringify(tokenMap))
      saveDerivAccounts(accounts)
      const primary = accounts[0]
      localStorage.setItem(TOKEN_STORAGE_KEY, primary.token)
      setApiToken(primary.token)
      notify(`Logged in as ${primary.loginid}`, 'success')
      window.history.replaceState({}, document.title, window.location.pathname)
      return
    }

    // Handle Modern OAuth2 Code (Preferred Method)
    if (code) {
      const verifier = sessionStorage.getItem('pkce_code_verifier')
      const storedState = sessionStorage.getItem('oauth_state')

      if (state !== storedState) {
        notify('Authentication state mismatch. Possible CSRF attack.', 'error')
        return
      }

      const completeModernAuth = async () => {
        try {
          // 1. Exchange Code for Access Token
          const tokenRes = await fetch('https://auth.deriv.com/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              client_id: appId,
              code,
              code_verifier: verifier,
              redirect_uri: window.location.origin + '/'
            })
          })

          const tokenData = await tokenRes.json()
          if (!tokenData.access_token) throw new Error(tokenData.error_description || 'Token exchange failed')

          const accessToken = tokenData.access_token
          setApiToken(accessToken)

          // 2. Fetch Accounts to get Account ID
          const accountsRes = await fetch('https://api.derivws.com/trading/v1/options/accounts', {
            headers: { 
              'Authorization': `Bearer ${accessToken}`,
              'Deriv-App-ID': appId 
            }
          })
          const accountsData = await accountsRes.json()
          const primaryAccount = accountsData.data?.[0]
          
          if (!primaryAccount) throw new Error('No trading accounts found')

          // 3. Get OTP for the primary account
          const otpRes = await fetch(`https://api.derivws.com/trading/v1/options/accounts/${primaryAccount.account_id}/otp`, {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${accessToken}`,
              'Deriv-App-ID': appId 
            }
          })
          const otpData = await otpRes.json()
          
          if (otpData.data?.url) {
            // This URL is pre-authenticated!
            localStorage.setItem(TOKEN_STORAGE_KEY, accessToken)
            setAccountInfo(primaryAccount)
            // We tell the WebSocket hook to connect to this specific URL
            ws.connect(null, otpData.data.url)
            notify('Successfully authenticated via Modern OTP flow', 'success')
          }
        } catch (err) {
          console.error('[DerivContext] Modern Auth Error:', err)
          notify(err.message || 'Error during modern authentication', 'error')
        } finally {
          window.history.replaceState({}, document.title, window.location.pathname)
        }
      }

      completeModernAuth()
    }
  }, [notify, appId])

  // ─── Auto-authorise when socket connects or token changes ───────────────────

  useEffect(() => {
    if (!ws.isConnected) {
      lastAttemptedToken.current = null
      return
    }

    if (apiToken && !ws.isAuthorized && lastAttemptedToken.current !== apiToken) {
      console.log('[DerivContext] Authorizing with token:', apiToken.substring(0, 5) + '...')
      lastAttemptedToken.current = apiToken
      ws.authorize(apiToken)
    }
  }, [ws.isConnected, ws.isAuthorized, apiToken]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Post-Authorization Initialization ─────────────────────────────────────
  // Runs whenever the connection becomes authorized (Legacy or Modern)
  useEffect(() => {
    if (!ws.isAuthorized) return

    console.log('[DerivContext] Initializing account data...')
    
    // 1. Core Account Data
    ws.getBalance()
    ws.getProfitTable(50)
    ws.getActiveSymbols()

    // 2. Real-time Ticks for the Topbar
    TOPBAR_SYMBOLS.forEach(sym => ws.getTicks(sym))

    // 3. Subscription to transactions for auto-refreshing the UI
    ws.send({ transaction: 1, subscribe: 1 })

  }, [ws.isAuthorized]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── WebSocket message subscriptions ───────────────────────────────────────
  useEffect(() => {
    // ── authorize (Legacy Handler) ──
    const unsubAuth = ws.subscribe('authorize', (data) => {
      if (data.error) {
        notify(data.error.message, 'error')
        return
      }
      setAccountInfo(data.authorize)
      notify(`Authorized as ${data.authorize.loginid}`, 'success')
    })

    // ── balance ──
    const unsubBalance = ws.subscribe('balance', (data) => {
      if (!data.error) setBalance(data.balance)
    })

    // ── tick stream ──
    const unsubTicks = ws.subscribe('tick', (data) => {
      if (data.error || !data.tick) return
      const { symbol } = data.tick

      setTickHistory((prev) => {
        const existing = prev[symbol] ?? []
        const updated = [...existing, data.tick].slice(-TICK_HISTORY_LIMIT)
        return { ...prev, [symbol]: updated }
      })

      setLatestTick((prev) => ({ ...prev, [symbol]: data.tick }))
    })

    // ── buy / contract open ──
    const unsubBuy = ws.subscribe('buy', (data) => {
      if (data.error) {
        notify(`Trade failed: ${data.error.message}`, 'error')
        return
      }
      const { contract_id, shortcode, buy_price } = data.buy
      const newTrade = {
        id: contract_id,
        symbol: shortcode,
        time: new Date().toISOString(),
        stake: buy_price,
        status: 'open',
        profit: 0,
      }
      setTrades((prev) => [newTrade, ...prev])
      notify(`Trade opened — Contract #${contract_id}`, 'success')
    })

    // ── profit table ──
    const unsubProfit = ws.subscribe('profit_table', (data) => {
      if (!data.error && data.profit_table?.transactions) {
        setProfitTable(data.profit_table.transactions)
      }
    })

    // ── transaction stream — refresh profit table when any trade settles ──
    const unsubTransaction = ws.subscribe('transaction', (data) => {
      if (!data.error && data.transaction) {
        // Re-fetch the full profit table to get the settled trade's details
        ws.getProfitTable(50)
      }
    })

    // ── active symbols ──
    const unsubSymbols = ws.subscribe('active_symbols', (data) => {
      if (!data.error && data.active_symbols) {
        setActiveSymbols(data.active_symbols)
      }
    })

    return () => {
      unsubAuth()
      unsubBalance()
      unsubTicks()
      unsubTransaction()
      unsubBuy()
      unsubProfit()
      unsubSymbols()
    }
  }, [ws, notify])

  // ─── Auth actions ───────────────────────────────────────────────────────────

  /** Log in with an explicit API token (manual / non-OAuth path). */
  const login = useCallback(
    (token) => {
      localStorage.setItem(TOKEN_STORAGE_KEY, token)
      setApiToken(token)
      // The authorize useEffect will fire automatically when apiToken changes.
    },
    []
  )

  /** Clear all local session state and stored tokens. */
  const logout = useCallback(() => {
    setApiToken('')
    setAccountInfo(null)
    setBalance(null)
    setProfitTable([])
    setTrades([])
    setTickHistory({})
    setLatestTick({})
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  }, [])

  /**
   * Switch to a different sub-account.
   * Requires the account's token to have been stored during OAuth login.
   */
  const switchAccount = useCallback(
    (loginid) => {
      // Try in-memory account_list first (some flows embed tokens there)
      const inMemory = accountInfo?.account_list?.find(
        (a) => a.loginid === loginid
      )
      if (inMemory?.token) {
        login(inMemory.token)
        return
      }

      // Fall back to persisted token map
      try {
        const tokenMap = JSON.parse(
          localStorage.getItem(TOKENS_MAP_STORAGE_KEY) ?? '{}'
        )
        if (tokenMap[loginid]) {
          login(tokenMap[loginid])
          return
        }
      } catch {
        // JSON.parse failed — storage is corrupt; ignore and fall through
      }

      notify('Token for this account not found. Please log in again.', 'warning')
    },
    [accountInfo, login, notify]
  )

  // ─── Tick subscription ──────────────────────────────────────────────────────

  const subscribeToSymbol = useCallback(
    (symbol) => {
      ws.getTicks(symbol)
    },
    [ws]
  )

  // ─── Bot lifecycle ──────────────────────────────────────────────────────────

  const startBot = useCallback(
    (config, onLog) => {
      if (botInstance.current) {
        notify('A bot is already running. Stop it first.', 'warning')
        return
      }

      const botId = Date.now()

      setActiveBots((prev) => [
        ...prev,
        { ...config, id: botId, status: 'running', trades: 0, profit: 0 },
      ])
      setBotRunning(true)
      setBotPaused(false)

      botInstance.current = new BotEngine({
        config: {
          ...config,
          // Normalise contractType → direction for the engine
          direction: config.contractType === 'CALL' ? 'rise' : 'fall',
        },
        ws,
        onLog: onLog ?? ((log) => console.log('[BotEngine]', log)),
        onTrade: (trade) => {
          setTrades((prev) => [trade, ...prev])
        },
        onStop: () => {
          botInstance.current = null
          setBotRunning(false)
          setBotPaused(false)
          setActiveBots((prev) =>
            prev.map((b) =>
              b.id === botId ? { ...b, status: 'stopped' } : b
            )
          )
          notify('Bot stopped.', 'info')
        },
      })

      botInstance.current.start()
    },
    [ws, notify]
  )

  const stopBot = useCallback(() => {
    if (botInstance.current) {
      botInstance.current.stop()
      // onStop callback handles the rest
    } else {
      // Defensive: reset state even if engine reference was lost
      setBotRunning(false)
      setBotPaused(false)
      setActiveBots((prev) =>
        prev.map((b) =>
          b.status === 'running' || b.status === 'paused'
            ? { ...b, status: 'stopped' }
            : b
        )
      )
      notify('Bot stopped.', 'info')
    }
  }, [notify])

  const pauseBot = useCallback(() => {
    if (!botInstance.current) return
    botInstance.current.pause()
    setBotPaused(true)
    setActiveBots((prev) =>
      prev.map((b) => (b.status === 'running' ? { ...b, status: 'paused' } : b))
    )
  }, [])

  const resumeBot = useCallback(() => {
    if (!botInstance.current) return
    botInstance.current.resume()
    setBotPaused(false)
    setActiveBots((prev) =>
      prev.map((b) => (b.status === 'paused' ? { ...b, status: 'running' } : b))
    )
  }, [])

  // ─── Memoised context value ─────────────────────────────────────────────────
  // Prevents every consumer from re-rendering when unrelated state changes.

  const value = useMemo(
    () => ({
      // Connection
      isConnected: ws.isConnected,
      isAuthorized: ws.isAuthorized,

      // Auth
      apiToken,
      accountInfo,
      login,
      logout,
      switchAccount,

      // Market data
      balance,
      profitTable,
      activeSymbols,

      // Ticks — two shapes for different consumer needs
      tickHistory,   // { [symbol]: Tick[] }  — for charts
      latestTick,    // { [symbol]: Tick }    — for price displays

      // Trades
      trades,

      // Bot control
      activeBots,
      botRunning,
      botPaused,
      startBot,
      stopBot,
      pauseBot,
      resumeBot,

      // Utilities
      ws,
      notification,
      notify,
      subscribeToSymbol,
      // Targeted stream cleanup (avoids breaking other pages' subscriptions)
      forgetStream: ws.forgetStream,
      getStreamId: ws.getStreamId,
    }),
    [
      ws,
      apiToken,
      accountInfo,
      login,
      logout,
      switchAccount,
      balance,
      profitTable,
      activeSymbols,
      tickHistory,
      latestTick,
      trades,
      activeBots,
      botRunning,
      botPaused,
      startBot,
      stopBot,
      pauseBot,
      resumeBot,
      notification,
      notify,
      subscribeToSymbol,
    ]
  )

  return (
    <DerivContext.Provider value={value}>
      {children}
    </DerivContext.Provider>
  )
}

// ─── Consumer hook ─────────────────────────────────────────────────────────────

export function useDeriv() {
  const ctx = useContext(DerivContext)
  if (!ctx) throw new Error('useDeriv must be used inside <DerivProvider>')
  return ctx
}

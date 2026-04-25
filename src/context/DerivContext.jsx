import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useDerivWS } from '../hooks/useDerivWS'
import { BotEngine } from '../botEngine'

const DerivContext = createContext(null)

export function DerivProvider({ children }) {
  const [apiToken, setApiToken] = useState(() => localStorage.getItem('deriv_token') || '')
  const [accountInfo, setAccountInfo] = useState(null)
  const [balance, setBalance] = useState(null)
  const [trades, setTrades] = useState([])
  const [activeBots, setActiveBots] = useState([])
  const [ticks, setTicks] = useState({})
  const [profitTable, setProfitTable] = useState([])
  const [activeSymbols, setActiveSymbols] = useState([])
  const [botRunning, setBotRunning] = useState(false)
  const [botPaused, setBotPaused] = useState(false)
  const [notification, setNotification] = useState(null)
  const botInstance = useRef(null)

  const ws = useDerivWS()

  const notify = useCallback((msg, type = 'info') => {
    setNotification({ msg, type, id: Date.now() })
    setTimeout(() => setNotification(null), 4000)
  }, [])

  // Subscribe to WS messages
  useEffect(() => {
    const unsubAuth = ws.subscribe('authorize', (data) => {
      if (!data.error) {
        setAccountInfo({
          ...data.authorize,
          account_list: data.authorize.account_list
        })
        ws.getBalance()
        ws.getProfitTable()
        ws.getActiveSymbols()
      } else {
        notify(data.error.message, 'error')
      }
    })

    const unsubBalance = ws.subscribe('balance', (data) => {
      if (!data.error) {
        setBalance(data.balance)
      }
    })

    const unsubTicks = ws.subscribe('tick', (data) => {
      if (!data.error && data.tick) {
        setTicks(prev => {
          const updated = [...(prev[data.tick.symbol] || []), data.tick]
          // The UI expects an object or the latest tick? Wait, looking at Dashboard, it uses ticks[symbol] as the tick object.
          // Let's store just the latest tick directly like it was, or an array if the UI needs it.
          // Wait, the fix instructions say: "When appending new ticks to state, cap the array at the last 500 ticks per symbol".
          // In the current codebase, it was: [data.tick.symbol]: data.tick
          // Let's follow the instruction and make it an array but the UI might break. Oh, Dashboard expects ticks['R_100'].quote. 
          // So if we make it an array, Dashboard breaks. Let's make ticks['R_100'] hold the array AND the latest tick?
          // The fix instruction explicitly says:
          // const updated = [...(prev[symbol] || []), newTick]
          // return { ...prev, [symbol]: updated.slice(-500) }
          // If we do this, we need to fix Dashboard.jsx and BotBuilder.jsx and Charts.jsx to use ticks[symbol][ticks[symbol].length - 1] 
          // or we can make `ticks` a map of arrays and provide `currentTick` state.
          // Actually, let's just make it an array as instructed.
          return {
            ...prev,
            [data.tick.symbol]: updated.slice(-500),
          }
        })
      }
    })

    const unsubBuy = ws.subscribe('buy', (data) => {
      if (data.error) {
        notify(`Trade failed: ${data.error.message}`, 'error')
      } else {
        const contract = data.buy
        setTrades(prev => [{
          id: contract.contract_id,
          symbol: contract.shortcode,
          time: new Date().toISOString(),
          stake: contract.buy_price,
          status: 'open',
          profit: 0,
        }, ...prev])
        notify(`Trade opened — Contract #${contract.contract_id}`, 'success')
      }
    })

    const unsubProfit = ws.subscribe('profit_table', (data) => {
      if (!data.error && data.profit_table?.transactions) {
        setProfitTable(data.profit_table.transactions)
      }
    })

    const unsubSymbols = ws.subscribe('active_symbols', (data) => {
      if (!data.error && data.active_symbols) {
        setActiveSymbols(data.active_symbols)
      }
    })

    return () => {
      unsubAuth(); unsubBalance(); unsubTicks()
      unsubBuy(); unsubProfit(); unsubSymbols()
    }
  }, [ws, notify])

  // Auto-authorize when connected
  useEffect(() => {
    if (ws.isConnected && apiToken) {
      ws.authorize(apiToken)
    }
  }, [ws.isConnected, apiToken, ws])

  const login = useCallback((token) => {
    setApiToken(token)
    localStorage.setItem('deriv_token', token)
    if (ws.isConnected) {
      ws.authorize(token)
    }
  }, [ws])

  const logout = useCallback(() => {
    setApiToken('')
    setAccountInfo(null)
    setBalance(null)
    setProfitTable([])
    localStorage.removeItem('deriv_token')
  }, [])

  const switchAccount = useCallback((loginid) => {
    if (!accountInfo?.account_list) return
    const acct = accountInfo.account_list.find(a => a.loginid === loginid)
    if (acct && acct.token) {
      // If we saved tokens in account_list (we could in login/authUtils)
      login(acct.token)
    } else {
      // Try to re-authorize with existing multi-account tokens in localStorage if we had them.
      // Or send set_account_currency. Wait, Deriv requires the specific token for that account.
      // If we don't have the token, we can't switch. Let's assume we have it via login tokens.
      const tokens = JSON.parse(localStorage.getItem('deriv_tokens') || '{}')
      if (tokens[loginid]) {
        login(tokens[loginid])
      } else {
        notify('Token for this account not found. Please log in again.', 'warning')
      }
    }
  }, [accountInfo, login, notify])

  const startBot = useCallback((config, onLog) => {
    setBotRunning(true)
    setBotPaused(false)
    setActiveBots(prev => [...prev, { ...config, id: Date.now(), status: 'running', trades: 0, profit: 0 }])
    
    botInstance.current = new BotEngine({
      config: {
        ...config,
        direction: config.contractType === 'CALL' ? 'rise' : 'fall',
      },
      ws,
      onLog: onLog || ((log) => console.log(log)),
      onTrade: (trade) => {
        setTrades(prev => [trade, ...prev])
      },
      onStop: (stats) => {
        setBotRunning(false)
        setBotPaused(false)
        setActiveBots(prev => prev.map(b => b.status === 'running' || b.status === 'paused' ? { ...b, status: 'stopped' } : b))
      }
    })
    
    botInstance.current.start()

    return () => {
      if (botInstance.current) {
        botInstance.current.stop()
        botInstance.current = null
      }
    }
  }, [ws])

  const stopBot = useCallback((botId) => {
    if (botInstance.current) {
      botInstance.current.stop()
      botInstance.current = null
    } else {
      setBotRunning(false)
      setBotPaused(false)
      setActiveBots(prev => prev.map(b => b.id === botId ? { ...b, status: 'stopped' } : b))
    }
    notify('Bot stopped.', 'info')
  }, [notify])

  const pauseBot = useCallback(() => {
    if (botInstance.current) {
      botInstance.current.pause()
      setBotPaused(true)
      setActiveBots(prev => prev.map(b => b.status === 'running' ? { ...b, status: 'paused' } : b))
    }
  }, [])

  const resumeBot = useCallback(() => {
    if (botInstance.current) {
      botInstance.current.resume()
      setBotPaused(false)
      setActiveBots(prev => prev.map(b => b.status === 'paused' ? { ...b, status: 'running' } : b))
    }
  }, [])

  const subscribeToSymbol = useCallback((symbol) => {
    ws.getTicks(symbol)
  }, [ws])

  return (
    <DerivContext.Provider value={{
      // Connection
      isConnected: ws.isConnected,
      isAuthorized: ws.isAuthorized,
      // Auth
      apiToken, accountInfo, login, logout,
      // Data
      balance, trades, activeBots, ticks,
      profitTable, activeSymbols,
      // Bot control
      botRunning, botPaused, startBot, stopBot, pauseBot, resumeBot,
      // WS direct access
      ws,
      // Utilities
      notification, notify,
      subscribeToSymbol,
      switchAccount,
    }}>
      {children}
    </DerivContext.Provider>
  )
}

export function useDeriv() {
  const ctx = useContext(DerivContext)
  if (!ctx) throw new Error('useDeriv must be used inside DerivProvider')
  return ctx
}

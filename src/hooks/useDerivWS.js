import { useCallback, useEffect, useRef, useState } from 'react'

const LEGACY_WS_URL = 'wss://ws.binaryws.com/websockets/v3'
const MODERN_WS_URL = 'wss://api.derivws.com/trading/v1/options/ws/public'


export function useDerivWS(appId) {
  const ws = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const listeners = useRef({})
  const reconnectTimer = useRef(null)
  const pingInterval = useRef(null)
  const messageQueue = useRef([])
  const reqIdCounter = useRef(1)

  /**
   * Maps req_id → subscription.id (Deriv stream ID).
   * Used by forgetStream to cancel individual server-side streams.
   */
  const reqToStreamId = useRef({})

  const connect = useCallback((appIdOverride, overrideUrl) => {
    if (ws.current?.readyState === WebSocket.OPEN || ws.current?.readyState === WebSocket.CONNECTING) return

    clearTimeout(reconnectTimer.current)
    const rawAppId = appIdOverride || appId || import.meta.env.VITE_DERIV_APP_ID || '1089'
    
    // If we have an overrideUrl (OTP URL from Modern API), use it directly.
    // These URLs are already authenticated!
    let url = overrideUrl
    
    if (!url) {
      const isStrictlyNumeric = /^\d+$/.test(String(rawAppId))
      const connectionAppId = isStrictlyNumeric ? rawAppId : '1089'
      url = `${LEGACY_WS_URL}?app_id=${connectionAppId}`
    }

    ws.current = new WebSocket(url)

    ws.current.onopen = () => {
      setIsConnected(true)
      
      // If we connected via an OTP URL, we are already authorized
      if (overrideUrl) {
        setIsAuthorized(true)
      }

      // Flush queued messages
      while (messageQueue.current.length > 0) {
        const msg = messageQueue.current.shift()
        ws.current.send(JSON.stringify(msg))
      }

      // Keep-alive ping every 30 s
      pingInterval.current = setInterval(() => {
        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ ping: 1 }))
        }
      }, 30000)
    }

    ws.current.onclose = () => {
      setIsConnected(false)
      setIsAuthorized(false)
      clearInterval(pingInterval.current)
      reconnectTimer.current = setTimeout(connect, 3000)
    }

    ws.current.onerror = (err) => {
      if (ws.current?.readyState === WebSocket.CLOSING || ws.current?.readyState === WebSocket.CLOSED) return
      console.error('[DerivWS] Connection Error.', err)
    }

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        // Track authorization
        if (data.msg_type === 'authorize') {
          setIsAuthorized(!data.error)
        }

        // Store req_id → subscription.id mapping for targeted forget
        if (data.subscription?.id && data.req_id) {
          reqToStreamId.current[data.req_id] = data.subscription.id
        }

        // Dispatch to specific-type listeners
        const msgType = data.msg_type
        if (msgType && listeners.current[msgType]) {
          listeners.current[msgType].forEach(cb => cb(data))
        }

        // Dispatch to wildcard listeners
        if (listeners.current['*']) {
          listeners.current['*'].forEach(cb => cb(data))
        }
      } catch (e) {
        console.error('[DerivWS] Parse error:', e)
      }
    }
  }, [appId])

  const disconnect = useCallback(() => {
    clearTimeout(reconnectTimer.current)
    clearInterval(pingInterval.current)
    if (ws.current) {
      const socket = ws.current
      ws.current = null
      socket.onopen = null
      socket.onclose = null
      socket.onerror = null
      socket.onmessage = null
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close()
      }
    }
  }, [])

  const send = useCallback((payload) => {
    if (!payload.req_id) {
      payload.req_id = reqIdCounter.current++
    }
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(payload))
      return payload.req_id
    }
    if (messageQueue.current.length < 50) {
      messageQueue.current.push(payload)
      return payload.req_id
    }
    console.warn('[DerivWS] Queue full. Cannot send:', payload)
    return false
  }, [])

  const authorize = useCallback((token) => {
    const rawAppId = appId || import.meta.env.VITE_DERIV_APP_ID || '1089'
    const parsedId = parseInt(rawAppId)
    const payload = { authorize: token }
    
    // Only add app_id to payload if it's a valid number (Legacy)
    if (!isNaN(parsedId)) {
      payload.app_id = parsedId
    }
    
    return send(payload)
  }, [send, appId])

  const subscribe = useCallback((msgType, callback) => {
    if (!listeners.current[msgType]) listeners.current[msgType] = []
    listeners.current[msgType].push(callback)
    return () => {
      listeners.current[msgType] = listeners.current[msgType].filter(cb => cb !== callback)
    }
  }, [])

  const getBalance = useCallback(() => send({ balance: 1, subscribe: 1 }), [send])

  /**
   * Subscribe to live ticks for a symbol.
   * Returns the req_id so callers can later forget the specific stream.
   */
  const getTicks = useCallback((symbol) => send({ ticks: symbol, subscribe: 1 }), [send])

  /**
   * Fetch + subscribe to tick history for a symbol.
   * Returns the req_id so callers can later forget the specific stream.
   */
  const getTickHistory = useCallback((symbol, count = 100) => send({
    ticks_history: symbol,
    count,
    end: 'latest',
    style: 'ticks',
    subscribe: 1,
  }), [send])

  /**
   * Fetch OHLC candle history for a symbol.
   * Deriv responds with msg_type:'candles' for the snapshot,
   * then msg_type:'ohlc' for each live-update tick.
   *
   * granularity: seconds per candle (60=1m, 300=5m, 900=15m,
   *              3600=1H, 14400=4H, 86400=1D)
   */
  const getCandleHistory = useCallback((symbol, granularity = 60, count = 200) => send({
    ticks_history: symbol,
    end: 'latest',
    count,
    style: 'candles',
    granularity,
    subscribe: 1,
  }), [send])


  const buyContract = useCallback((params) => send({
    buy: 1,
    price: params.stake,
    parameters: {
      contract_type: params.contractType,
      symbol: params.symbol,
      duration: params.duration,
      duration_unit: params.durationUnit || 't',
      basis: 'stake',
      amount: params.stake,
      currency: 'USD',
    },
  }), [send])

  const getProfitTable = useCallback((limit = 25) => send({ profit_table: 1, limit, description: 1 }), [send])

  const getActiveSymbols = useCallback(() => send({ active_symbols: 'brief', product_type: 'basic' }), [send])

  /**
   * Forget ALL subscriptions of a given type (e.g. 'ticks', 'proposal').
   * Use sparingly — prefer forgetStream for targeted cleanup.
   */
  const forgetAll = useCallback((type) => send({ forget_all: type }), [send])

  /**
   * Forget a single server-side stream by its subscription.id.
   * Use this instead of forget_all to avoid disrupting other pages' streams.
   */
  const forgetStream = useCallback((streamId) => {
    if (streamId) send({ forget: streamId })
  }, [send])

  /**
   * Resolve the Deriv subscription.id for a previously-sent req_id.
   * Returns null if the stream hasn't responded yet.
   */
  const getStreamId = useCallback((reqId) => reqToStreamId.current[reqId] ?? null, [])

  const sendProposal = useCallback((params) => {
    const { amount, basis, contract_type, currency, duration, duration_unit, symbol, ...extra } = params
    return new Promise((resolve, reject) => {
      const reqId = send({
        proposal: 1,
        amount,
        basis: basis || 'stake',
        contract_type,
        currency: currency || 'USD',
        duration,
        duration_unit,
        symbol,
        ...extra,
      })

      if (reqId === false) { reject(new Error('WebSocket not ready and queue full')); return }

      const timeout = setTimeout(() => { cleanup(); reject(new Error('Proposal request timed out')) }, 10000)

      const cleanup = subscribe('proposal', (data) => {
        if (data.req_id === reqId) {
          clearTimeout(timeout)
          cleanup()
          if (data.error) reject(new Error(data.error.message))
          else resolve(data.proposal)
        }
      })
    })
  }, [send, subscribe])

  const sellContract = useCallback((contractId) => send({ sell: contractId, price: 0 }), [send])

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  return {
    isConnected,
    isAuthorized,
    send,
    authorize,
    subscribe,
    getBalance,
    getTicks,
    getTickHistory,
    getCandleHistory,
    buyContract,
    getProfitTable,
    getActiveSymbols,
    forgetAll,
    forgetStream,
    getStreamId,
    sendProposal,
    sellContract,
  }
}

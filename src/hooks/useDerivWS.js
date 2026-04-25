import { useCallback, useEffect, useRef, useState } from 'react'

const DERIV_WS_URL = 'wss://ws.binaryws.com/websockets/v3'

export function useDerivWS(appId) {
  const ws = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const listeners = useRef({})
  const reconnectTimer = useRef(null)
  const pingInterval = useRef(null)
  const messageQueue = useRef([])
  const reqIdCounter = useRef(1)

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN || ws.current?.readyState === WebSocket.CONNECTING) return

    clearTimeout(reconnectTimer.current)
    const url = `${DERIV_WS_URL}?app_id=${appId || import.meta.env.VITE_DERIV_APP_ID || '1089'}`
    ws.current = new WebSocket(url)

    ws.current.onopen = () => {
      setIsConnected(true)
      
      // Flush message queue
      while (messageQueue.current.length > 0) {
        const msg = messageQueue.current.shift()
        ws.current.send(JSON.stringify(msg))
      }

      // Keep-alive ping every 30s
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
      // Auto-reconnect after 3 seconds
      reconnectTimer.current = setTimeout(connect, 3000)
    }

    ws.current.onerror = (err) => {
      console.error('[DerivWS] Error:', err)
    }

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        // Handle authorization
        if (data.msg_type === 'authorize') {
          if (data.error) {
            setIsAuthorized(false)
          } else {
            setIsAuthorized(true)
          }
        }

        // Dispatch to registered listeners
        const msgType = data.msg_type
        if (msgType && listeners.current[msgType]) {
          listeners.current[msgType].forEach(cb => cb(data))
        }

        // Also dispatch to wildcard listeners
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
      ws.current.onclose = null // prevent reconnect loops on intentional disconnect
      ws.current.close()
      ws.current = null
    }
  }, [])

  const send = useCallback((payload) => {
    // Inject a req_id if not present
    if (!payload.req_id) {
      payload.req_id = reqIdCounter.current++
    }

    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(payload))
      return payload.req_id
    }
    
    // Queue if not connected (max 50 messages)
    if (messageQueue.current.length < 50) {
      messageQueue.current.push(payload)
      return payload.req_id
    } else {
      console.warn('[DerivWS] Queue full. Cannot send:', payload)
      return false
    }
  }, [])

  const authorize = useCallback((token) => {
    return send({ authorize: token })
  }, [send])

  const subscribe = useCallback((msgType, callback) => {
    if (!listeners.current[msgType]) {
      listeners.current[msgType] = []
    }
    listeners.current[msgType].push(callback)

    return () => {
      listeners.current[msgType] = listeners.current[msgType].filter(cb => cb !== callback)
    }
  }, [])

  const getBalance = useCallback(() => {
    send({ balance: 1, subscribe: 1 })
  }, [send])

  const getTicks = useCallback((symbol) => {
    send({ ticks: symbol, subscribe: 1 })
  }, [send])

  const getTickHistory = useCallback((symbol, count = 100) => {
    send({
      ticks_history: symbol,
      count,
      end: 'latest',
      style: 'ticks',
      subscribe: 1,
    })
  }, [send])

  const buyContract = useCallback((params) => {
    return send({
      buy: 1,
      price: params.stake,
      parameters: {
        contract_type: params.contractType, // 'CALL' | 'PUT' | 'DIGITOVER' | etc.
        symbol: params.symbol,
        duration: params.duration,
        duration_unit: params.durationUnit || 't',
        basis: 'stake',
        amount: params.stake,
        currency: 'USD',
      },
    })
  }, [send])

  const getProfitTable = useCallback((limit = 25) => {
    send({ profit_table: 1, limit, description: 1 })
  }, [send])

  const getActiveSymbols = useCallback(() => {
    send({ active_symbols: 'brief', product_type: 'basic' })
  }, [send])

  const forgetAll = useCallback((type) => {
    send({ forget_all: type })
  }, [send])

  const sendProposal = useCallback((params) => {
    return new Promise((resolve, reject) => {
      const reqId = send({
        proposal: 1,
        amount: params.amount,
        basis: params.basis || 'stake',
        contract_type: params.contract_type,
        currency: params.currency || 'USD',
        duration: params.duration,
        duration_unit: params.duration_unit,
        symbol: params.symbol,
      })

      if (reqId === false) {
        reject(new Error('WebSocket not ready and queue full'))
        return
      }

      const timeout = setTimeout(() => {
        cleanup()
        reject(new Error('Proposal request timed out'))
      }, 10000)

      const cleanup = subscribe('proposal', (data) => {
        if (data.req_id === reqId) {
          clearTimeout(timeout)
          cleanup()
          if (data.error) {
            reject(new Error(data.error.message))
          } else {
            resolve(data.proposal)
          }
        }
      })
    })
  }, [send, subscribe])

  const sellContract = useCallback((contractId) => {
    return send({ sell: contractId, price: 0 })
  }, [send])

  useEffect(() => {
    connect()
    return () => {
      disconnect()
    }
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
    buyContract,
    getProfitTable,
    getActiveSymbols,
    forgetAll,
    sendProposal,
    sellContract,
  }
}

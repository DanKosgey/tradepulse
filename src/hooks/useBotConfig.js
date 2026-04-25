import { useState, useEffect } from 'react'

const DEFAULT_CONFIG = {
  symbol: 'R_100',
  contractType: 'CALL',
  stake: 1,
  duration: 5,
  durationUnit: 't',
  strategy: 'single',
  martingaleMultiplier: 2,
  takeProfit: 50,
  stopLoss: 20,
  maxTrades: 100,
  intervalSeconds: 30,
}

export function useBotConfig() {
  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('tradepulse_bot_config')
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.warn('Failed to load bot config:', e)
    }
    return DEFAULT_CONFIG
  })

  useEffect(() => {
    localStorage.setItem('tradepulse_bot_config', JSON.stringify(config))
  }, [config])

  const resetConfig = () => setConfig(DEFAULT_CONFIG)

  return [config, setConfig, resetConfig]
}

// Comprehensive Deriv Market Symbols
export const SYMBOLS = [
  // ─── DERIVED: Continuous Indices ──────────────────────────────────────────
  { value: '1HZ10V',  label: 'Volatility 10 (1s) Index',  category: 'Continuous Indices', market: 'Derived' },
  { value: 'R_10',    label: 'Volatility 10 Index',       category: 'Continuous Indices', market: 'Derived' },
  { value: '1HZ25V',  label: 'Volatility 25 (1s) Index',  category: 'Continuous Indices', market: 'Derived' },
  { value: 'R_25',    label: 'Volatility 25 Index',       category: 'Continuous Indices', market: 'Derived' },
  { value: '1HZ50V',  label: 'Volatility 50 (1s) Index',  category: 'Continuous Indices', market: 'Derived' },
  { value: 'R_50',    label: 'Volatility 50 Index',       category: 'Continuous Indices', market: 'Derived' },
  { value: '1HZ75V',  label: 'Volatility 75 (1s) Index',  category: 'Continuous Indices', market: 'Derived' },
  { value: 'R_75',    label: 'Volatility 75 Index',       category: 'Continuous Indices', market: 'Derived' },
  { value: '1HZ100V', label: 'Volatility 100 (1s) Index', category: 'Continuous Indices', market: 'Derived' },
  { value: 'R_100',   label: 'Volatility 100 Index',      category: 'Continuous Indices', market: 'Derived' },
  { value: '1HZ150V', label: 'Volatility 150 (1s) Index', category: 'Continuous Indices', market: 'Derived' },
  { value: '1HZ250V', label: 'Volatility 250 (1s) Index', category: 'Continuous Indices', market: 'Derived' },

  // ─── DERIVED: Crash/Boom ──────────────────────────────────────────────────
  { value: 'BOOM500',  label: 'Boom 500 Index',   category: 'Crash/Boom Indices', market: 'Derived' },
  { value: 'BOOM1000', label: 'Boom 1000 Index',  category: 'Crash/Boom Indices', market: 'Derived' },
  { value: 'CRASH500', label: 'Crash 500 Index',  category: 'Crash/Boom Indices', market: 'Derived' },
  { value: 'CRASH1000',label: 'Crash 1000 Index', category: 'Crash/Boom Indices', market: 'Derived' },

  // ─── DERIVED: Jump Indices ────────────────────────────────────────────────
  { value: 'JD10',  label: 'Jump 10 Index',  category: 'Jump Indices', market: 'Derived' },
  { value: 'JD25',  label: 'Jump 25 Index',  category: 'Jump Indices', market: 'Derived' },
  { value: 'JD50',  label: 'Jump 50 Index',  category: 'Jump Indices', market: 'Derived' },
  { value: 'JD75',  label: 'Jump 75 Index',  category: 'Jump Indices', market: 'Derived' },
  { value: 'JD100', label: 'Jump 100 Index', category: 'Jump Indices', market: 'Derived' },

  // ─── DERIVED: Step Indices ───────────────────────────────────────────────
  { value: 'STPR', label: 'Step Index', category: 'Step Indices', market: 'Derived' },

  // ─── FOREX: Major Pairs ───────────────────────────────────────────────────
  { value: 'frxAUDJPY', label: 'AUD/JPY', category: 'Major Pairs', market: 'Forex' },
  { value: 'frxAUDUSD', label: 'AUD/USD', category: 'Major Pairs', market: 'Forex' },
  { value: 'frxEURAUD', label: 'EUR/AUD', category: 'Major Pairs', market: 'Forex' },
  { value: 'frxEURCHF', label: 'EUR/CHF', category: 'Major Pairs', market: 'Forex' },
  { value: 'frxEURGBP', label: 'EUR/GBP', category: 'Major Pairs', market: 'Forex' },
  { value: 'frxEURJPY', label: 'EUR/JPY', category: 'Major Pairs', market: 'Forex' },
  { value: 'frxEURUSD', label: 'EUR/USD', category: 'Major Pairs', market: 'Forex' },
  { value: 'frxGBPAUD', label: 'GBP/AUD', category: 'Major Pairs', market: 'Forex' },
  { value: 'frxGBPUSD', label: 'GBP/USD', category: 'Major Pairs', market: 'Forex' },
  { value: 'frxUSDCAD', label: 'USD/CAD', category: 'Major Pairs', market: 'Forex' },
  { value: 'frxUSDCHF', label: 'USD/CHF', category: 'Major Pairs', market: 'Forex' },
  { value: 'frxUSDJPY', label: 'USD/JPY', category: 'Major Pairs', market: 'Forex' },

  // ─── CRYPTOCURRENCIES ─────────────────────────────────────────────────────
  { value: 'cryBTCUSD', label: 'BTC/USD', category: 'Crypto Pairs', market: 'Cryptocurrencies' },
  { value: 'cryETHUSD', label: 'ETH/USD', category: 'Crypto Pairs', market: 'Cryptocurrencies' },
  { value: 'cryLTCUSD', label: 'LTC/USD', category: 'Crypto Pairs', market: 'Cryptocurrencies' },

  // ─── COMMODITIES ──────────────────────────────────────────────────────────
  { value: 'gold',   label: 'Gold',   category: 'Metals', market: 'Commodities' },
  { value: 'silver', label: 'Silver', category: 'Metals', market: 'Commodities' },
  { value: 'oil',    label: 'Oil',    category: 'Energy', market: 'Commodities' },
]

export const CONTRACT_TYPES = {
  // Up/Down
  CALL: { label: 'Rise', description: 'Win if exit price is higher than entry', color: 'accent', type: 'Up/Down' },
  PUT: { label: 'Fall', description: 'Win if exit price is lower than entry', color: 'danger', type: 'Up/Down' },
  CALLE: { label: 'Rise Equals', description: 'Win if exit price is higher than or equal to entry', color: 'accent', type: 'Up/Down' },
  PUTE: { label: 'Fall Equals', description: 'Win if exit price is lower than or equal to entry', color: 'danger', type: 'Up/Down' },
  
  // Higher/Lower
  ONETOUCH: { label: 'Touch', description: 'Win if market touches target', color: 'cyan', type: 'Touch/No Touch' },
  NOTOUCH: { label: 'No Touch', description: 'Win if market does not touch target', color: 'warning', type: 'Touch/No Touch' },
  
  // Digits
  DIGITOVER: { label: 'Digit Over', description: 'Win if last digit is greater than prediction', color: 'cyan', type: 'Digits' },
  DIGITUNDER: { label: 'Digit Under', description: 'Win if last digit is less than prediction', color: 'warning', type: 'Digits' },
  DIGITEVEN: { label: 'Digit Even', description: 'Win if last digit is even', color: 'cyan', type: 'Digits' },
  DIGITODD: { label: 'Digit Odd', description: 'Win if last digit is odd', color: 'warning', type: 'Digits' },
  DIGITMATCH: { label: 'Digit Match', description: 'Win if last digit matches prediction', color: 'accent', type: 'Digits' },
  DIGITDIFF: { label: 'Digit Differs', description: 'Win if last digit differs from prediction', color: 'danger', type: 'Digits' },
}


export const DURATION_UNITS = [
  { value: 't', label: 'Ticks', min: 1, max: 10 },
  { value: 's', label: 'Seconds', min: 15, max: 86400 },
  { value: 'm', label: 'Minutes', min: 1, max: 1440 },
  { value: 'h', label: 'Hours', min: 1, max: 24 },
  { value: 'd', label: 'Days', min: 1, max: 365 },
]

export const STRATEGIES = [
  {
    value: 'single',
    label: 'Single',
    description: 'Fixed stake on every trade',
    risk: 'Low',
  },
  {
    value: 'martingale',
    label: 'Martingale',
    description: 'Double stake after each loss, reset on win',
    risk: 'High',
  },
  {
    value: 'anti_martingale',
    label: 'Anti-Martingale',
    description: 'Double stake after each win, reset on loss',
    risk: 'Medium',
  },
  {
    value: 'dalembert',
    label: "D'Alembert",
    description: 'Add one unit on loss, subtract one on win',
    risk: 'Medium',
  },
]

/**
 * Maps Deriv symbol values → TradingView symbol strings.
 *
 * Deriv-native synthetic indices (volatility, crash/boom, jump, step)
 * are available under the "DERIV:" exchange prefix in TradingView.
 *
 * Standard market symbols (forex, crypto, commodities) use their
 * respective exchange prefixes.
 */
export const TV_SYMBOL_MAP = {
  // ── Continuous Volatility Indices (Regular) ─────────────────────────────────
  R_10:      'DERIV:R_10',
  R_25:      'DERIV:R_25',
  R_50:      'DERIV:R_50',
  R_75:      'DERIV:R_75',
  R_100:     'DERIV:R_100',

  // ── Continuous Volatility Indices (1-second) ─────────────────────────────────
  '1HZ10V':  'DERIV:1HZ10V',
  '1HZ25V':  'DERIV:1HZ25V',
  '1HZ50V':  'DERIV:1HZ50V',
  '1HZ75V':  'DERIV:1HZ75V',
  '1HZ100V': 'DERIV:1HZ100V',
  '1HZ150V': 'DERIV:1HZ150V',
  '1HZ250V': 'DERIV:1HZ250V',

  // ── Crash / Boom Indices ──────────────────────────────────────────────────────
  BOOM300:   'DERIV:BOOM300',
  BOOM500:   'DERIV:BOOM500',
  BOOM1000:  'DERIV:BOOM1000',
  CRASH300:  'DERIV:CRASH300',
  CRASH500:  'DERIV:CRASH500',
  CRASH1000: 'DERIV:CRASH1000',

  // ── Jump Indices ──────────────────────────────────────────────────────────────
  JD10:  'DERIV:JD10',
  JD25:  'DERIV:JD25',
  JD50:  'DERIV:JD50',
  JD75:  'DERIV:JD75',
  JD100: 'DERIV:JD100',

  // ── Step Index ────────────────────────────────────────────────────────────────
  STPR: 'DERIV:STPR',

  // ── Range Break Indices ───────────────────────────────────────────────────────
  RDBULL: 'DERIV:RDBULL',
  RDBEAR: 'DERIV:RDBEAR',

  // ── Forex Major Pairs ─────────────────────────────────────────────────────────
  frxAUDJPY: 'FX:AUDJPY',
  frxAUDUSD: 'FX:AUDUSD',
  frxEURAUD: 'FX:EURAUD',
  frxEURCHF: 'FX:EURCHF',
  frxEURGBP: 'FX:EURGBP',
  frxEURJPY: 'FX:EURJPY',
  frxEURUSD: 'FX:EURUSD',
  frxGBPAUD: 'FX:GBPAUD',
  frxGBPUSD: 'FX:GBPUSD',
  frxUSDCAD: 'FX:USDCAD',
  frxUSDCHF: 'FX:USDCHF',
  frxUSDJPY: 'FX:USDJPY',

  // ── Cryptocurrencies ──────────────────────────────────────────────────────────
  cryBTCUSD: 'BINANCE:BTCUSDT',
  cryETHUSD: 'BINANCE:ETHUSDT',
  cryLTCUSD: 'BINANCE:LTCUSDT',

  // ── Commodities ───────────────────────────────────────────────────────────────
  gold:   'OANDA:XAUUSD',
  silver: 'OANDA:XAGUSD',
  oil:    'TVC:USOIL',
}

/**
 * Set of Deriv-native symbols whose chart data comes from Deriv's own
 * ticks_history WebSocket API (not TradingView's data feeds).
 * Used by Charts.jsx to pick the correct renderer.
 */
export const DERIV_NATIVE_SYMBOLS = new Set([
  'R_10','R_25','R_50','R_75','R_100',
  '1HZ10V','1HZ25V','1HZ50V','1HZ75V','1HZ100V','1HZ150V','1HZ250V',
  'BOOM300','BOOM500','BOOM1000','CRASH300','CRASH500','CRASH1000',
  'JD10','JD25','JD50','JD75','JD100',
  'STPR','RDBULL','RDBEAR',
])

export function formatCurrency(amount, currency = 'USD') {
  const num = parseFloat(amount)
  const sign = num >= 0 ? '+' : ''
  return `${sign}${currency} ${Math.abs(num).toFixed(2)}`
}

export function getWinColor(value) {
  return value >= 0 ? '#00ff87' : '#ff3b5c'
}

export function calcMartingaleProjection(initialStake, multiplier, steps) {
  const rows = []
  let stake = initialStake
  let totalRisk = 0
  for (let i = 1; i <= steps; i++) {
    totalRisk += stake
    rows.push({ step: i, stake: parseFloat(stake.toFixed(2)), totalRisk: parseFloat(totalRisk.toFixed(2)) })
    stake *= multiplier
  }
  return rows
}

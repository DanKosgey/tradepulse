// All supported Deriv synthetic symbols
export const SYMBOLS = [
  { value: 'R_100', label: 'Volatility 100 Index', category: 'Continuous Indices' },
  { value: 'R_75', label: 'Volatility 75 Index', category: 'Continuous Indices' },
  { value: 'R_50', label: 'Volatility 50 Index', category: 'Continuous Indices' },
  { value: 'R_25', label: 'Volatility 25 Index', category: 'Continuous Indices' },
  { value: 'R_10', label: 'Volatility 10 Index', category: 'Continuous Indices' },
  { value: '1HZ100V', label: 'Volatility 100 (1s) Index', category: '1s Indices' },
  { value: '1HZ75V', label: 'Volatility 75 (1s) Index', category: '1s Indices' },
  { value: '1HZ50V', label: 'Volatility 50 (1s) Index', category: '1s Indices' },
  { value: '1HZ25V', label: 'Volatility 25 (1s) Index', category: '1s Indices' },
  { value: '1HZ10V', label: 'Volatility 10 (1s) Index', category: '1s Indices' },
  { value: 'RDBULL', label: 'Bull Market Index', category: 'Daily Reset Indices' },
  { value: 'RDBEAR', label: 'Bear Market Index', category: 'Daily Reset Indices' },
  { value: 'JD10', label: 'Jump 10 Index', category: 'Jump Indices' },
  { value: 'JD25', label: 'Jump 25 Index', category: 'Jump Indices' },
  { value: 'JD50', label: 'Jump 50 Index', category: 'Jump Indices' },
  { value: 'JD75', label: 'Jump 75 Index', category: 'Jump Indices' },
  { value: 'JD100', label: 'Jump 100 Index', category: 'Jump Indices' },
]

export const CONTRACT_TYPES = {
  CALL: { label: 'Rise', description: 'Win if exit price is higher than entry', color: 'accent' },
  PUT: { label: 'Fall', description: 'Win if exit price is lower than entry', color: 'danger' },
  DIGITOVER: { label: 'Digit Over', description: 'Win if last digit of exit price is greater than your prediction', color: 'cyan' },
  DIGITUNDER: { label: 'Digit Under', description: 'Win if last digit of exit price is less than your prediction', color: 'warning' },
  DIGITEVEN: { label: 'Digit Even', description: 'Win if last digit of exit price is even', color: 'cyan' },
  DIGITODD: { label: 'Digit Odd', description: 'Win if last digit of exit price is odd', color: 'warning' },
  DIGITMATCH: { label: 'Digit Match', description: 'Win if last digit of exit price matches your prediction', color: 'accent' },
  DIGITDIFF: { label: 'Digit Differs', description: 'Win if last digit differs from your prediction', color: 'danger' },
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

export const TV_SYMBOL_MAP = {
  R_100: 'DERIV:VOLATILITY100',
  R_75: 'DERIV:VOLATILITY75',
  R_50: 'DERIV:VOLATILITY50INDEX',
  R_25: 'DERIV:VOLATILITY25',
  R_10: 'DERIV:VOLATILITY10INDEX',
  '1HZ100V': 'DERIV:VOLATILITY100_1S',
  RDBULL: 'DERIV:BULL_MARKET_INDEX',
  RDBEAR: 'DERIV:BEAR_MARKET_INDEX',
}

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

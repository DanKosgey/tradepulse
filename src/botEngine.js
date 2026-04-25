/**
 * TradePulse Bot Engine
 * Handles strategy execution, contract lifecycle, risk management
 */

export const BOT_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  STOPPED: 'stopped',
  ERROR: 'error',
}

export class BotEngine {
  constructor({ config, ws, onLog, onTrade, onStop }) {
    this.config = config
    this.ws = ws
    this.onLog = onLog || (() => {})
    this.onTrade = onTrade || (() => {})
    this.onStop = onStop || (() => {})

    this.status = BOT_STATUS.IDLE
    this.currentStake = parseFloat(config.stake)
    this.initialStake = parseFloat(config.stake)
    this.totalProfit = 0
    this.totalTrades = 0
    this.wins = 0
    this.losses = 0
    this.consecutiveLosses = 0
    this.consecutiveWins = 0
    this.consecutiveWins = 0
    this.openContractId = null
    this.timer = null
    this.unsubscribers = []
    this.paused = false
  }

  log(msg, type = 'info') {
    this.onLog({ time: new Date().toLocaleTimeString(), msg, type })
  }

  start() {
    if (this.status === BOT_STATUS.RUNNING) return
    this.status = BOT_STATUS.RUNNING
    this.log(`Bot started — Strategy: ${this.config.strategy} | Symbol: ${this.config.symbol}`, 'success')

    // Subscribe to buy responses
    const unsubBuy = this.ws.subscribe('buy', (data) => this._onBuyResponse(data))
    // Subscribe to proposal open contract (to track results)
    const unsubPoc = this.ws.subscribe('proposal_open_contract', (data) => this._onContractUpdate(data))

    this.unsubscribers.push(unsubBuy, unsubPoc)

    // Execute first trade immediately, then on interval
    this._executeTrade()
  }

  stop(reason = 'Manual stop') {
    if (this.status === BOT_STATUS.STOPPED) return
    this.status = BOT_STATUS.STOPPED
    this.paused = false
    clearTimeout(this.timer)
    this.unsubscribers.forEach(fn => fn())
    this.unsubscribers = []
    this.log(`Bot stopped — ${reason} | P&L: ${this.totalProfit >= 0 ? '+' : ''}$${this.totalProfit.toFixed(2)}`, 'warning')
    this.onStop({ reason, totalProfit: this.totalProfit, totalTrades: this.totalTrades })
  }

  pause() {
    if (this.status !== BOT_STATUS.RUNNING) return
    this.paused = true
    this.log('Bot paused. No new trades will be placed until resumed.', 'warning')
  }

  resume() {
    if (this.status !== BOT_STATUS.RUNNING) return
    this.paused = false
    this.log('Bot resumed. Continuing trading...', 'success')
    if (!this.openContractId) {
      this._executeTrade()
    }
  }

  get isPaused() {
    return this.paused
  }

  getStats() {
    return {
      status: this.status,
      currentStake: this.currentStake,
      totalProfit: this.totalProfit,
      totalTrades: this.totalTrades,
      wins: this.wins,
      losses: this.losses,
      winRate: this.totalTrades ? ((this.wins / this.totalTrades) * 100).toFixed(1) : 0,
    }
  }

  async _executeTrade() {
    if (this.status !== BOT_STATUS.RUNNING) return
    if (this.paused) {
      // If paused, just check again later
      this.timer = setTimeout(() => this._executeTrade(), 2000)
      return
    }

    // Check take profit / stop loss
    if (this.totalProfit >= this.config.takeProfit) {
      this.stop(`Take profit reached (+$${this.config.takeProfit})`)
      return
    }
    if (Math.abs(this.totalProfit) >= this.config.stopLoss && this.totalProfit < 0) {
      this.stop(`Stop loss triggered (-$${this.config.stopLoss})`)
      return
    }
    if (this.totalTrades >= this.config.maxTrades) {
      this.stop(`Max trades reached (${this.config.maxTrades})`)
      return
    }

    this.log(`Requesting proposal — ${this.config.contractType} | Stake: $${this.currentStake.toFixed(2)}`)

    try {
      const proposal = await this.ws.sendProposal({
        amount: this.currentStake,
        basis: 'stake',
        contract_type: this.config.contractType,
        currency: 'USD',
        duration: this.config.duration,
        duration_unit: this.config.durationUnit,
        symbol: this.config.symbol,
      })

      if (this.status !== BOT_STATUS.RUNNING || this.paused) return

      const payout = proposal.payout
      this.log(`Proposal received: Payout $${payout} (Net: $${(payout - this.currentStake).toFixed(2)})`)
      this.log(`Placing trade #${this.totalTrades + 1}...`)

      this.ws.send({
        buy: proposal.id,
        price: proposal.ask_price
      })
    } catch (err) {
      this.log(`Proposal error: ${err.message}`, 'error')
      // Retry after delay
      this.timer = setTimeout(() => this._executeTrade(), 5000)
    }
  }

  _onBuyResponse(data) {
    if (this.status !== BOT_STATUS.RUNNING) return

    if (data.error) {
      this.log(`Buy error: ${data.error.message}`, 'error')
      // Retry after delay
      this.timer = setTimeout(() => this._executeTrade(), 5000)
      return
    }

    this.openContractId = data.buy.contract_id
    this.log(`Contract opened #${data.buy.contract_id} — $${data.buy.buy_price}`, 'success')

    // Subscribe to contract updates
    this.ws.send({
      proposal_open_contract: 1,
      contract_id: this.openContractId,
      subscribe: 1,
    })
  }

  _onContractUpdate(data) {
    if (!data.proposal_open_contract) return
    const contract = data.proposal_open_contract

    // Only handle our open contract
    if (contract.contract_id !== this.openContractId) return

    // Contract is still open
    if (!contract.is_sold) return

    // Contract settled
    const profit = parseFloat(contract.profit)
    const won = profit > 0

    this.totalTrades++
    this.totalProfit += profit
    this.openContractId = null

    if (won) {
      this.wins++
      this.consecutiveWins++
      this.consecutiveLosses = 0
      this.log(`WIN +$${profit.toFixed(2)} | Total P&L: ${this.totalProfit >= 0 ? '+' : ''}$${this.totalProfit.toFixed(2)}`, 'success')
    } else {
      this.losses++
      this.consecutiveLosses++
      this.consecutiveWins = 0
      this.log(`LOSS $${profit.toFixed(2)} | Total P&L: ${this.totalProfit >= 0 ? '+' : ''}$${this.totalProfit.toFixed(2)}`, 'error')
    }

    this.onTrade({
      contractId: contract.contract_id,
      symbol: contract.underlying,
      stake: parseFloat(contract.buy_price),
      payout: parseFloat(contract.sell_price || 0),
      profit,
      won,
      time: new Date().toISOString(),
    })

    // Forget subscription
    this.ws.send({ forget: contract.id })

    // Calculate next stake based on strategy
    this._adjustStake(won)

    // Schedule next trade
    const delay = (this.config.intervalSeconds || 5) * 1000
    this.timer = setTimeout(() => this._executeTrade(), delay)
  }

  _adjustStake(won) {
    const strategy = this.config.strategy

    if (strategy === 'single') {
      this.currentStake = this.initialStake

    } else if (strategy === 'martingale') {
      if (won) {
        this.currentStake = this.initialStake
      } else {
        this.currentStake = parseFloat(
          (this.currentStake * (this.config.martingaleMultiplier || 2)).toFixed(2)
        )
        // Safety cap at 10x initial
        const cap = this.initialStake * Math.pow(this.config.martingaleMultiplier || 2, this.config.maxMartingaleSteps || 6)
        this.currentStake = Math.min(this.currentStake, cap)
      }

    } else if (strategy === 'anti_martingale') {
      if (won) {
        this.currentStake = parseFloat(
          (this.currentStake * (this.config.martingaleMultiplier || 2)).toFixed(2)
        )
      } else {
        this.currentStake = this.initialStake
      }

    } else if (strategy === 'dalembert') {
      const unit = this.initialStake
      if (won) {
        this.currentStake = Math.max(this.initialStake, parseFloat((this.currentStake - unit).toFixed(2)))
      } else {
        this.currentStake = parseFloat((this.currentStake + unit).toFixed(2))
      }
    }

    this.log(`Next stake: $${this.currentStake.toFixed(2)} (${strategy})`)
  }
}

// Parse Deriv/Binary.com XML bot format
export function parseBotXml(xmlString) {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlString, 'text/xml')

    const config = {
      symbol: 'R_100',
      contractType: 'CALL',
      stake: 1,
      duration: 5,
      durationUnit: 't',
      strategy: 'single',
      takeProfit: 50,
      stopLoss: 20,
      maxTrades: 100,
      intervalSeconds: 5,
      martingaleMultiplier: 2,
    }

    // Try to extract common block values from Blockly XML
    const blocks = doc.querySelectorAll('block')
    blocks.forEach(block => {
      const type = block.getAttribute('type')
      const value = block.querySelector('field')?.textContent

      if (type === 'trade_definition_market' && value) config.symbol = value
      if (type === 'trade_definition_tradetype' && value) {
        config.contractType = value.includes('CALL') ? 'CALL' : 'PUT'
      }
      if (type === 'trade_definition_stake' && value) config.stake = parseFloat(value) || 1
      if (type === 'trade_definition_duration' && value) config.duration = parseInt(value) || 5
    })

    return { success: true, config }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

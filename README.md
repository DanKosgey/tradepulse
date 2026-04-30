# Phoenix 🚀

> **Next-gen automated trading platform for Deriv** — Build, deploy, and monitor trading bots with a sleek cyberpunk UI.

---

## Features

- 🤖 **Bot Builder** — Configure Rise/Fall, Over/Under strategies with Martingale, Anti-Martingale, D'Alembert risk management
- 📊 **Live Dashboard** — Real-time balance, P&L chart, market ticks
- 📈 **TradingView Charts** — Professional charting with multiple indicators
- 📋 **Trade History** — Full profit table with CSV export and daily P&L bar chart
- ⚙️ **Settings** — API token management, account info
- 🔌 **Deriv WebSocket API** — Full real-time integration, auto-reconnect, keep-alive ping

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_DERIV_APP_ID=your_app_id_here
```

> Get a **free App ID** at [api.deriv.com/app-registration](https://api.deriv.com/app-registration)
> Use `http://localhost:3000` as the OAuth redirect URI during development.

### 3. Run development server

```bash
npm run dev
```

Visit `http://localhost:3000`

### 4. Build for production

```bash
npm run build
```

Output is in the `dist/` folder. Deploy to Vercel, Netlify, or any static host.

## Deployment

Set `VITE_DERIV_APP_ID` in your hosting provider's env vars.
Run: `npm run build` → deploy the `/dist` folder.

---

## Getting Your Deriv API Token

1. Log in to [app.deriv.com](https://app.deriv.com)
2. Go to **Account Settings → API Token**
3. Create a token with these scopes: **Read, Trade, Payments, Admin**
4. Paste it into Phoenix's login form or Settings page

---

## Deriv App Registration (for OAuth)

1. Go to [api.deriv.com/app-registration](https://api.deriv.com/app-registration)
2. Fill in your app name and details
3. Set redirect URI to your app's URL (e.g., `https://yourdomain.com/app`)
4. Copy your **App ID** into `.env` as `VITE_DERIV_APP_ID`

---

## Project Structure

```
src/
├── components/
│   ├── Layout.jsx        # App shell with sidebar + topbar
│   ├── Sidebar.jsx       # Navigation sidebar
│   ├── Topbar.jsx        # Top bar with live ticks + actions
│   └── Notification.jsx  # Toast notifications
├── context/
│   └── DerivContext.jsx  # Global state (balance, trades, bots)
├── hooks/
│   └── useDerivWS.js     # WebSocket connection & API methods
├── pages/
│   ├── Landing.jsx       # Landing/login page
│   ├── Dashboard.jsx     # Main dashboard
│   ├── BotBuilder.jsx    # Bot configuration & control
│   ├── Charts.jsx        # TradingView embedded charts
│   ├── History.jsx       # Trade history & analytics
│   └── Settings.jsx      # Account & token settings
└── index.css             # Global styles & design system
```

---

## Supported Symbols

- Volatility 100 Index (`R_100`)
- Volatility 50 Index (`R_50`)
- Volatility 25 Index (`R_25`)
- Volatility 10 Index (`R_10`)
- Volatility 100 (1s) Index (`1HZ100V`)
- Volatility 50 (1s) Index (`1HZ50V`)
- Bull/Bear Market Indices

---

## Bot Strategies

| Strategy | Description |
|---|---|
| Single | One trade at a time, fixed stake |
| Martingale | Double stake after each loss |
| Anti-Martingale | Double stake after each win |
| D'Alembert | Increase stake by 1 unit on loss |

---

## ⚠️ Disclaimer

> Phoenix is an **independent, third-party** tool and is **not affiliated with Deriv Ltd**.
> Automated trading involves significant financial risk. Never trade with money you cannot afford to lose.
> Always test strategies on a **demo account** before using real funds.

---

## Tech Stack

- **React 18** + Vite
- **Tailwind CSS** — custom cyberpunk design system
- **Recharts** — P&L and analytics charts
- **TradingView Widget** — professional market charts
- **Deriv WebSocket API v3** — real-time trading

---

## License

MIT — use freely, modify, and deploy as your own.

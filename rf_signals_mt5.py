"""
GLM RF Trend Pro v4 — MT5 Signal Exporter
==========================================
Fetches OHLCV from MetaTrader 5, computes all strategy signals,
and exports a TradingView-importable CSV.

Requirements:
    pip install MetaTrader5 pandas numpy

Usage:
    python rf_signals_mt5.py                          # uses defaults below
    python rf_signals_mt5.py --symbol XAUUSD --tf H1 --bars 2000
    python rf_signals_mt5.py --symbol Volatility\ 100\ Index --tf M1 --bars 5000

TradingView import:
    Chart → Import data → select the exported CSV
    The script column will render as a colored overlay when you add it as
    an external indicator via Pine's "input.source" or simply read the
    signal/regime columns to re-plot.
"""

import argparse
import sys
import math
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd

# ── MT5 import guard ──────────────────────────────────────────────────────
try:
    import MetaTrader5 as mt5
except ImportError:
    print("ERROR: MetaTrader5 package not found.")
    print("       Run:  pip install MetaTrader5")
    sys.exit(1)


# ══════════════════════════════════════════════════════════════════════════
#  TIMEFRAME MAP
# ══════════════════════════════════════════════════════════════════════════
TF_MAP = {
    "M1" : mt5.TIMEFRAME_M1,
    "M2" : mt5.TIMEFRAME_M2,
    "M3" : mt5.TIMEFRAME_M3,
    "M4" : mt5.TIMEFRAME_M4,
    "M5" : mt5.TIMEFRAME_M5,
    "M6" : mt5.TIMEFRAME_M6,
    "M10": mt5.TIMEFRAME_M10,
    "M12": mt5.TIMEFRAME_M12,
    "M15": mt5.TIMEFRAME_M15,
    "M20": mt5.TIMEFRAME_M20,
    "M30": mt5.TIMEFRAME_M30,
    "H1" : mt5.TIMEFRAME_H1,
    "H2" : mt5.TIMEFRAME_H2,
    "H3" : mt5.TIMEFRAME_H3,
    "H4" : mt5.TIMEFRAME_H4,
    "H6" : mt5.TIMEFRAME_H6,
    "H8" : mt5.TIMEFRAME_H8,
    "H12": mt5.TIMEFRAME_H12,
    "D1" : mt5.TIMEFRAME_D1,
    "W1" : mt5.TIMEFRAME_W1,
    "MN1": mt5.TIMEFRAME_MN1,
}


# ══════════════════════════════════════════════════════════════════════════
#  MT5 DATA FETCH
# ══════════════════════════════════════════════════════════════════════════
def fetch_mt5(symbol: str, timeframe_str: str, bars: int,
              login: int = None, password: str = None,
              server: str = None) -> pd.DataFrame:

    if not mt5.initialize():
        print(f"MT5 initialize() failed: {mt5.last_error()}")
        sys.exit(1)

    # Optional login (skip if MT5 terminal is already open & logged in)
    if login and password and server:
        ok = mt5.login(login, password=password, server=server)
        if not ok:
            print(f"MT5 login failed: {mt5.last_error()}")
            mt5.shutdown()
            sys.exit(1)

    tf = TF_MAP.get(timeframe_str.upper())
    if tf is None:
        print(f"Unknown timeframe '{timeframe_str}'. Choose from: {list(TF_MAP)}")
        mt5.shutdown()
        sys.exit(1)

    print(f"Fetching {bars} bars of {symbol} {timeframe_str} from MT5…")
    rates = mt5.copy_rates_from_pos(symbol, tf, 0, bars)
    mt5.shutdown()

    if rates is None or len(rates) == 0:
        print(f"No data returned. Check symbol name and that MT5 has {symbol} in Market Watch.")
        sys.exit(1)

    df = pd.DataFrame(rates)
    df["time"] = pd.to_datetime(df["time"], unit="s")
    df = df.rename(columns={
        "time"      : "datetime",
        "open"      : "open",
        "high"      : "high",
        "low"       : "low",
        "close"     : "close",
        "tick_volume": "volume",
        "real_volume": "real_volume",
        "spread"    : "spread",
    })
    df = df.set_index("datetime").sort_index()
    print(f"  Got {len(df)} bars  |  {df.index[0]}  →  {df.index[-1]}")
    return df


# ══════════════════════════════════════════════════════════════════════════
#  INDICATOR FUNCTIONS  (identical to rf_trend_strategy.py)
# ══════════════════════════════════════════════════════════════════════════

def kalman_filter(src: np.ndarray, period: int, alpha: float, beta: float) -> np.ndarray:
    b  = period
    v3 = alpha * b
    v1 = np.nan
    v2 = 1.0
    result = np.empty(len(src))
    for i, s in enumerate(src):
        if np.isnan(v1):
            v1 = src[i - 1] if i > 0 else s
        v5 = v1
        v4 = v2 / (v2 + v3)
        v1 = v5 + v4 * (s - v5)
        v2 = (1.0 - v4) * v2 + beta / b
        result[i] = v1
    return result


def wma(series: np.ndarray, period: int) -> np.ndarray:
    weights = np.arange(1, period + 1, dtype=float)
    out = np.full(len(series), np.nan)
    for i in range(period - 1, len(series)):
        out[i] = np.dot(series[i - period + 1 : i + 1], weights) / weights.sum()
    return out


def calc_atr(high: np.ndarray, low: np.ndarray, close: np.ndarray, period: int) -> np.ndarray:
    tr = np.maximum(high - low,
         np.maximum(np.abs(high - np.roll(close, 1)),
                    np.abs(low  - np.roll(close, 1))))
    tr[0] = high[0] - low[0]
    out = np.full(len(tr), np.nan)
    out[period - 1] = np.mean(tr[:period])
    for i in range(period, len(tr)):
        out[i] = (out[i - 1] * (period - 1) + tr[i]) / period
    return out


def calc_supertrend(k: np.ndarray, high: np.ndarray, low: np.ndarray,
                    close: np.ndarray, factor: float, atr_period: int):
    atr_vals  = calc_atr(high, low, close, atr_period)
    upper_raw = k + factor * atr_vals
    lower_raw = k - factor * atr_vals
    n = len(k)
    upper_band = upper_raw.copy()
    lower_band = lower_raw.copy()
    direction  = np.zeros(n, dtype=int)
    st_line    = np.full(n, np.nan)

    for i in range(1, n):
        if np.isnan(atr_vals[i]):
            direction[i] = 1
            st_line[i]   = upper_band[i]
            continue
        prev_lower = lower_band[i - 1]
        prev_upper = upper_band[i - 1]
        lower_band[i] = (lower_raw[i] if lower_raw[i] > prev_lower or close[i-1] < prev_lower
                         else prev_lower)
        upper_band[i] = (upper_raw[i] if upper_raw[i] < prev_upper or close[i-1] > prev_upper
                         else prev_upper)
        prev_st = st_line[i - 1]
        if np.isnan(prev_st):
            direction[i] = 1
        elif prev_st == prev_upper:
            direction[i] = -1 if k[i] > upper_band[i] else 1
        else:
            direction[i] = 1 if k[i] < lower_band[i] else -1
        st_line[i] = lower_band[i] if direction[i] == -1 else upper_band[i]

    return st_line, direction, upper_band, lower_band, atr_vals


# ══════════════════════════════════════════════════════════════════════════
#  SIGNAL COMPUTATION
# ══════════════════════════════════════════════════════════════════════════

def compute_signals(df: pd.DataFrame, cfg: dict) -> pd.DataFrame:
    n     = len(df)
    close = df["close"].to_numpy(dtype=float)
    high  = df["high"].to_numpy(dtype=float)
    low   = df["low"].to_numpy(dtype=float)
    open_ = df["open"].to_numpy(dtype=float)
    vol   = df["volume"].to_numpy(dtype=float) if "volume" in df.columns else np.ones(n)

    # ── Core indicators ───────────────────────────────────────────
    k = kalman_filter(close, cfg["kalman_period"], cfg["kalman_alpha"], cfg["kalman_beta"])
    st_line, direction, upper_band, lower_band, raw_atr = calc_supertrend(
        k, high, low, close, cfg["st_factor"], cfg["st_atr_period"])

    vola  = wma(high - low, 200)
    upper = k + vola * cfg["dev"]
    lower = k - vola * cfg["dev"]

    # ── Band trend state ──────────────────────────────────────────
    trend = np.zeros(n, dtype=int)
    for i in range(n):
        if close[i] > upper[i]:
            trend[i] = 1
        elif close[i] < lower[i]:
            trend[i] = -1
        else:
            trend[i] = trend[i - 1] if i > 0 else 0

    ktrend  = np.where(direction < 0, 1, np.where(direction > 0, -1, 0))
    kt_prod = ktrend * trend

    is_ranging  = (kt_prod == -1)
    is_trending = (kt_prod ==  1)

    # ── ST flips ──────────────────────────────────────────────────
    st_flip_bull = np.zeros(n, dtype=bool)
    st_flip_bear = np.zeros(n, dtype=bool)
    for i in range(1, n):
        if direction[i] < 0 <= direction[i - 1]:
            st_flip_bull[i] = True
        if direction[i] >= 0 > direction[i - 1]:
            st_flip_bear[i] = True

    # ── Primary signals ───────────────────────────────────────────
    signal_up   = np.zeros(n, dtype=bool)
    signal_down = np.zeros(n, dtype=bool)
    for i in range(1, n):
        crossed = kt_prod[i] > 0 and kt_prod[i - 1] <= 0
        if crossed and trend[i] ==  1: signal_up[i]   = True
        if crossed and trend[i] == -1: signal_down[i] = True

    # ── Filters ───────────────────────────────────────────────────
    avg_atr = pd.Series(raw_atr).rolling(50).mean().to_numpy()
    vol_sma = pd.Series(vol).rolling(20).mean().to_numpy()

    atr_ok_arr   = np.where(
        ~cfg["use_atr_filter"], True,
        raw_atr >= cfg["atr_min_mult"] * avg_atr)

    lb = cfg["kalman_slope_lookback"]
    k_slope = np.full(n, np.nan)
    k_slope[lb:] = np.abs(k[lb:] - k[:-lb])
    slope_ok_arr = np.where(
        ~cfg["use_kalman_slope"], True,
        k_slope >= cfg["kalman_slope_min_mult"] * raw_atr)

    vol_ok_arr   = np.where(
        ~cfg["use_vol_filter"], True,
        vol >= cfg["vol_mult"] * vol_sma)

    signal_ok = atr_ok_arr & slope_ok_arr & vol_ok_arr

    # ── Kalman curvature / ATR expanding ─────────────────────────
    k_curving_up   = np.zeros(n, dtype=bool)
    k_curving_down = np.zeros(n, dtype=bool)
    atr_expanding  = np.zeros(n, dtype=bool)
    for i in range(2, n):
        k_curving_up[i]   = k[i] > k[i-1] > k[i-2]
        k_curving_down[i] = k[i] < k[i-1] < k[i-2]
        atr_expanding[i]  = raw_atr[i] > raw_atr[i-1] and atr_ok_arr[i]

    # ── bars since primary signal ─────────────────────────────────
    bars_since_bull = np.full(n, np.inf)
    bars_since_bear = np.full(n, np.inf)
    last_bull = last_bear = -np.inf
    for i in range(n):
        if signal_up[i]:   last_bull = i
        if signal_down[i]: last_bear = i
        bars_since_bull[i] = i - last_bull
        bars_since_bear[i] = i - last_bear

    # ── Entry conditions ──────────────────────────────────────────
    early_bull = (cfg["use_early_breakout"] & (trend == 1) & (direction >= 0)
                  & (close > upper) & atr_expanding & k_curving_up & slope_ok_arr)
    early_bear = (cfg["use_early_breakout"] & (trend == -1) & (direction <= 0)
                  & (close < lower) & atr_expanding & k_curving_down & slope_ok_arr)

    pb_bull = (cfg["use_pullback"] & is_trending & (ktrend == 1)
               & (bars_since_bull >= cfg["pullback_lookback"])
               & (low <= k) & (close > k) & (close > open_) & atr_ok_arr)
    pb_bear = (cfg["use_pullback"] & is_trending & (ktrend == -1)
               & (bars_since_bear >= cfg["pullback_lookback"])
               & (high >= k) & (close < k) & (close < open_) & atr_ok_arr)

    # ── Transition zone ───────────────────────────────────────────
    is_transitioning = is_ranging & atr_expanding & (k_curving_up | k_curving_down)

    # ── Regime label ─────────────────────────────────────────────
    regime = np.where(is_transitioning, "Transition",
              np.where(is_ranging,      "Ranging",
              np.where(is_trending,     "Trending", "Neutral")))

    # ── Assemble output ───────────────────────────────────────────
    out = df[["open", "high", "low", "close", "volume"]].copy()
    out.index.name = "time"

    out["kalman"]          = np.round(k,        5)
    out["supertrend"]      = np.round(st_line,  5)
    out["st_direction"]    = direction                  # -1 bull / +1 bear
    out["upper_band"]      = np.round(upper,    5)
    out["lower_band"]      = np.round(lower,    5)
    out["st_upper"]        = np.round(upper_band, 5)
    out["st_lower"]        = np.round(lower_band, 5)
    out["vola"]            = np.round(vola,     5)
    out["raw_atr"]         = np.round(raw_atr,  5)
    out["avg_atr"]         = np.round(avg_atr,  5)
    out["trend"]           = trend                      # +1 / -1 / 0
    out["ktrend"]          = ktrend
    out["kt_prod"]         = kt_prod
    out["regime"]          = regime

    # Signal flags (1 = true, 0 = false — TradingView plots these easily)
    out["signal_ok"]       = signal_ok.astype(int)
    out["signal_up"]       = signal_up.astype(int)
    out["signal_down"]     = signal_down.astype(int)
    out["st_flip_bull"]    = st_flip_bull.astype(int)
    out["st_flip_bear"]    = st_flip_bear.astype(int)
    out["early_bull"]      = early_bull.astype(int)
    out["early_bear"]      = early_bear.astype(int)
    out["pullback_bull"]   = pb_bull.astype(int)
    out["pullback_bear"]   = pb_bear.astype(int)
    out["is_ranging"]      = is_ranging.astype(int)
    out["is_trending"]     = is_trending.astype(int)
    out["is_transitioning"]= is_transitioning.astype(int)
    out["k_curving_up"]    = k_curving_up.astype(int)
    out["k_curving_down"]  = k_curving_down.astype(int)
    out["atr_expanding"]   = atr_expanding.astype(int)

    # Composite entry column (for easy TradingView plotting)
    # 1=Long Standard, 2=Long Early, 3=Long Pullback
    # -1=Short Standard, -2=Short Early, -3=Short Pullback
    entry_signal = np.zeros(n, dtype=int)
    entry_signal[signal_up   & ~is_ranging & signal_ok] = 1
    entry_signal[signal_down & ~is_ranging & signal_ok] = -1
    entry_signal[early_bull  & ~is_ranging & signal_ok] = 2
    entry_signal[early_bear  & ~is_ranging & signal_ok] = -2
    entry_signal[pb_bull     & signal_ok]               = 3
    entry_signal[pb_bear     & signal_ok]               = -3
    out["entry_signal"] = entry_signal

    # Exit column: 1=exit long, -1=exit short
    exit_signal = np.zeros(n, dtype=int)
    exit_signal[st_flip_bear] =  1
    exit_signal[st_flip_bull] = -1
    out["exit_signal"] = exit_signal

    return out


# ══════════════════════════════════════════════════════════════════════════
#  CLI
# ══════════════════════════════════════════════════════════════════════════

def parse_args():
    p = argparse.ArgumentParser(description="GLM RF Trend Pro v4 — MT5 → Signal CSV")

    # MT5 connection
    p.add_argument("--symbol",   default="XAUUSDm",  help="MT5 symbol name")
    p.add_argument("--tf",       default="m1",       help="Timeframe e.g. M1 M5 M15 H1 H4 D1")
    p.add_argument("--bars",     type=int, default=4320, help="Number of bars to fetch")
    p.add_argument("--login",    type=int, default=None,  help="MT5 account number (optional)")
    p.add_argument("--password", default=None,             help="MT5 password (optional)")
    p.add_argument("--server",   default=None,             help="MT5 broker server (optional)")

    # Output
    p.add_argument("--out",      default="signals.csv", help="Output CSV filename")

    # Strategy params (same defaults as Pine Script)
    p.add_argument("--kalman-alpha",        type=float, default=0.01)
    p.add_argument("--kalman-beta",         type=float, default=0.1)
    p.add_argument("--kalman-period",       type=int,   default=77)
    p.add_argument("--dev",                 type=float, default=1.2)
    p.add_argument("--st-factor",           type=float, default=0.7)
    p.add_argument("--st-atr-period",       type=int,   default=7)

    p.add_argument("--atr-filter",          action="store_true",  default=True)
    p.add_argument("--no-atr-filter",       dest="atr_filter",    action="store_false")
    p.add_argument("--atr-min-mult",        type=float, default=0.8)
    p.add_argument("--kalman-slope",        action="store_true",  default=True)
    p.add_argument("--no-kalman-slope",     dest="kalman_slope",  action="store_false")
    p.add_argument("--kalman-slope-lb",     type=int,   default=3)
    p.add_argument("--kalman-slope-mult",   type=float, default=0.15)
    p.add_argument("--vol-filter",          action="store_true",  default=False)
    p.add_argument("--vol-mult",            type=float, default=1.2)

    p.add_argument("--early-breakout",      action="store_true",  default=True)
    p.add_argument("--no-early-breakout",   dest="early_breakout",action="store_false")
    p.add_argument("--pullback",            action="store_true",  default=True)
    p.add_argument("--no-pullback",         dest="pullback",      action="store_false")
    p.add_argument("--pullback-lookback",   type=int,   default=5)

    return p.parse_args()


def main():
    args = parse_args()

    cfg = {
        "kalman_alpha"          : args.kalman_alpha,
        "kalman_beta"           : args.kalman_beta,
        "kalman_period"         : args.kalman_period,
        "dev"                   : args.dev,
        "st_factor"             : args.st_factor,
        "st_atr_period"         : args.st_atr_period,
        "use_atr_filter"        : args.atr_filter,
        "atr_min_mult"          : args.atr_min_mult,
        "use_kalman_slope"      : args.kalman_slope,
        "kalman_slope_lookback" : args.kalman_slope_lb,
        "kalman_slope_min_mult" : args.kalman_slope_mult,
        "use_vol_filter"        : args.vol_filter,
        "vol_mult"              : args.vol_mult,
        "use_early_breakout"    : args.early_breakout,
        "use_pullback"          : args.pullback,
        "pullback_lookback"     : args.pullback_lookback,
    }

    # Fetch from MT5
    df = fetch_mt5(
        symbol       = args.symbol,
        timeframe_str= args.tf,
        bars         = args.bars,
        login        = args.login,
        password     = args.password,
        server       = args.server,
    )

    # Compute signals
    print("Computing signals…")
    signals = compute_signals(df, cfg)

    # Save
    out_path = Path(args.out)
    signals.to_csv(out_path)
    print(f"\n✔  Saved {len(signals)} rows → {out_path.resolve()}")

    # Quick summary
    n_entries = (signals["entry_signal"] != 0).sum()
    n_exits   = (signals["exit_signal"]  != 0).sum()
    regimes   = signals["regime"].value_counts().to_dict()
    print(f"\n   Entry signals : {n_entries}")
    print(f"   Exit  signals : {n_exits}")
    print(f"   Regime counts : {regimes}")
    print(f"\n   Columns in CSV:")
    for col in signals.columns:
        print(f"     {col}")
    print(f"\n   Import into TradingView:")
    print(f"   Chart menu → Import data → select '{out_path.name}'")
    print(f"   Then use 'entry_signal' and 'regime' columns as your plot source.")


if __name__ == "__main__":
    main()

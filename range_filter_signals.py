"""
Range Filtered Trend Signals — Python/MT5 port of AlgoAlpha's Pine Script indicator.
Pulls 1-minute OHLC from MetaTrader 5, computes signals, and writes a CSV.

Requirements:
    pip install MetaTrader5 pandas numpy

Usage:
    python range_filter_signals.py --symbol EURUSD --bars 5000 --output signals.csv
"""

import argparse
import sys
from datetime import datetime

import numpy as np
import pandas as pd

# ── MetaTrader 5 ─────────────────────────────────────────────────────────────
try:
    import MetaTrader5 as mt5
except ImportError:
    sys.exit("MetaTrader5 package not found. Run: pip install MetaTrader5")


# ─────────────────────────────────────────────────────────────────────────────
# Indicator maths
# ─────────────────────────────────────────────────────────────────────────────

def kalman_filter(close: np.ndarray, period: int, alpha: float, beta: float) -> np.ndarray:
    """
    Port of the Pine Script `kalman()` function.
    v1 = estimate, v2 = error covariance, v3 = process noise, v4 = Kalman gain
    """
    n = len(close)
    v1 = np.full(n, np.nan)
    v2 = np.ones(n)
    v3 = alpha * period          # alpha * b  (b == kalmanPeriod in Pine)
    v4 = np.zeros(n)

    # Initialise v1 on the first non-NaN bar using the previous bar's close
    for i in range(1, n):
        if np.isnan(v1[i - 1]):
            v1[i - 1] = close[i - 1]   # mirrors Pine's `v1 := a[1]` on first bar

        v4[i]  = v2[i - 1] / (v2[i - 1] + v3)
        v1[i]  = v1[i - 1] + v4[i] * (close[i] - v1[i - 1])
        v2[i]  = (1 - v4[i]) * v2[i - 1] + beta / period

    return v1


def wma(series: np.ndarray, length: int) -> np.ndarray:
    """Weighted Moving Average (matches Pine's ta.wma)."""
    weights = np.arange(1, length + 1, dtype=float)
    weights /= weights.sum()
    result = np.full(len(series), np.nan)
    for i in range(length - 1, len(series)):
        result[i] = np.dot(series[i - length + 1 : i + 1], weights)
    return result


def atr(high: np.ndarray, low: np.ndarray, close: np.ndarray, period: int) -> np.ndarray:
    """True Range → RMA (Wilder's smoothing), matching Pine's ta.atr."""
    tr = np.maximum(high - low,
         np.maximum(np.abs(high - np.roll(close, 1)),
                    np.abs(low  - np.roll(close, 1))))
    tr[0] = high[0] - low[0]

    result = np.full(len(tr), np.nan)
    # Seed with simple mean
    result[period - 1] = tr[:period].mean()
    for i in range(period, len(tr)):
        result[i] = (result[i - 1] * (period - 1) + tr[i]) / period
    return result


def supertrend(k: np.ndarray,
               high: np.ndarray, low: np.ndarray, close: np.ndarray,
               factor: float, atr_period: int):
    """
    Port of pine_supertrend() using the Kalman-filtered series `k` as source.
    Returns (supertrend_line, direction) where direction: -1=bull, 1=bear
    (matches Pine's convention).
    """
    n = len(k)
    atr_vals = atr(high, low, close, atr_period)

    upper_raw = k + factor * atr_vals
    lower_raw = k - factor * atr_vals

    upper = np.full(n, np.nan)
    lower = np.full(n, np.nan)
    direction = np.zeros(n, dtype=int)
    st = np.full(n, np.nan)

    for i in range(n):
        if np.isnan(atr_vals[i]):
            continue

        prev_lower = lower[i - 1] if i > 0 and not np.isnan(lower[i - 1]) else lower_raw[i]
        prev_upper = upper[i - 1] if i > 0 and not np.isnan(upper[i - 1]) else upper_raw[i]
        prev_k     = k[i - 1]     if i > 0 else k[i]

        # Pine: lowerBand > prevLower OR k[1] < prevLower → use raw; else keep prev
        lower[i] = lower_raw[i] if (lower_raw[i] > prev_lower or prev_k < prev_lower) else prev_lower
        upper[i] = upper_raw[i] if (upper_raw[i] < prev_upper or prev_k > prev_upper) else prev_upper

        prev_st  = st[i - 1]     if i > 0 else np.nan
        prev_dir = direction[i - 1] if i > 0 else 1

        if np.isnan(atr_vals[i - 1]) if i > 0 else True:
            direction[i] = 1
        elif prev_st == prev_upper:
            direction[i] = -1 if k[i] > upper[i] else 1
        else:
            direction[i] = 1 if k[i] < lower[i] else -1

        st[i] = lower[i] if direction[i] == -1 else upper[i]

    return st, direction


def compute_signals(df: pd.DataFrame,
                    kalman_alpha: float  = 0.01,
                    kalman_beta:  float  = 0.1,
                    kalman_period: int   = 77,
                    dev:           float = 1.2,
                    st_factor:     float = 0.7,
                    st_atr_period: int   = 7,
                    wma_period:    int   = 200) -> pd.DataFrame:
    """
    Compute all indicator values and generate signal columns.

    Signals emitted (boolean columns, True on the bar they occur):
      - signal_trending_up   : crossover(ktrend*trend, 0) AND trend==1
      - signal_trending_down : crossover(ktrend*trend, 0) AND trend==-1
      - signal_ranging       : crossunder(ktrend*trend, 0)
      - signal_st_bull       : crossover(trend, 0)
      - signal_st_bear       : crossunder(trend, 0)
      - signal_lt_bull       : crossover(ktrend, 0)
      - signal_lt_bear       : crossunder(ktrend, 0)
    """
    close = df["close"].values
    high  = df["high"].values
    low   = df["low"].values
    open_ = df["open"].values
    n     = len(df)

    # ── Kalman filter ────────────────────────────────────────────────────────
    k_vals = kalman_filter(close, kalman_period, kalman_alpha, kalman_beta)

    # ── Supertrend on k ──────────────────────────────────────────────────────
    st_line, st_dir = supertrend(k_vals, high, low, close, st_factor, st_atr_period)

    # ── Volatility band ──────────────────────────────────────────────────────
    vola  = wma(high - low, wma_period)
    upper = k_vals + vola * dev
    lower = k_vals - vola * dev

    # ── Trend (short-term range filter) ─────────────────────────────────────
    trend = np.zeros(n, dtype=int)
    for i in range(n):
        if close[i] > upper[i]:
            trend[i] = 1
        elif close[i] < lower[i]:
            trend[i] = -1
        else:
            trend[i] = trend[i - 1] if i > 0 else 0

    # ── Kalman trend (long-term) ─────────────────────────────────────────────
    # Pine: direction < 0 → ktrend=1 (bull), direction > 0 → ktrend=-1 (bear)
    ktrend = np.where(st_dir < 0, 1, np.where(st_dir > 0, -1, 0))

    # ── Combined product ─────────────────────────────────────────────────────
    kt_prod = ktrend * trend   # positive → both aligned (trending)

    # ── Crossover helpers ────────────────────────────────────────────────────
    def crossover(a, b):
        """a crosses over b (a[i-1] <= b and a[i] > b)."""
        sig = np.zeros(n, dtype=bool)
        for i in range(1, n):
            sig[i] = (a[i - 1] <= b) and (a[i] > b)
        return sig

    def crossunder(a, b):
        """a crosses under b."""
        sig = np.zeros(n, dtype=bool)
        for i in range(1, n):
            sig[i] = (a[i - 1] >= b) and (a[i] < b)
        return sig

    co_kt = crossover(kt_prod, 0)
    cu_kt = crossunder(kt_prod, 0)
    co_trend  = crossover(trend,  0)
    cu_trend  = crossunder(trend, 0)
    co_ktrend = crossover(ktrend, 0)
    cu_ktrend = crossunder(ktrend, 0)

    # ── Build output DataFrame ───────────────────────────────────────────────
    out = df[["time", "open", "high", "low", "close"]].copy()
    out["kalman"]       = k_vals
    out["supertrend"]   = st_line
    out["st_direction"] = st_dir          # -1 bull, 1 bear
    out["vola_upper"]   = upper
    out["vola_lower"]   = lower
    out["trend"]        = trend           # 1 bull, -1 bear, 0 neutral
    out["ktrend"]       = ktrend          # 1 bull, -1 bear
    out["kt_product"]   = kt_prod

    out["signal_trending_up"]   = co_kt & (trend == 1)
    out["signal_trending_down"] = co_kt & (trend == -1)
    out["signal_ranging"]       = cu_kt
    out["signal_st_bull"]       = co_trend
    out["signal_st_bear"]       = cu_trend
    out["signal_lt_bull"]       = co_ktrend
    out["signal_lt_bear"]       = cu_ktrend

    return out


# ─────────────────────────────────────────────────────────────────────────────
# MT5 data fetch
# ─────────────────────────────────────────────────────────────────────────────

def fetch_mt5_data(symbol: str, bars: int) -> pd.DataFrame:
    if not mt5.initialize():
        sys.exit(f"MT5 initialize() failed — {mt5.last_error()}")

    rates = mt5.copy_rates_from_pos(symbol, mt5.TIMEFRAME_M1, 0, bars)
    mt5.shutdown()

    if rates is None or len(rates) == 0:
        sys.exit(f"No data returned for {symbol}. Check symbol name and MT5 connection.")

    df = pd.DataFrame(rates)
    df["time"] = pd.to_datetime(df["time"], unit="s")
    df = df.rename(columns={"tick_volume": "volume"})[
        ["time", "open", "high", "low", "close", "volume"]
    ].reset_index(drop=True)
    return df


# ─────────────────────────────────────────────────────────────────────────────
# CLI entry-point
# ─────────────────────────────────────────────────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser(
        description="Export Range Filtered Trend Signals to CSV using MT5 M1 data."
    )
    p.add_argument("--symbol",         default="EURUSD",      help="MT5 symbol (default: EURUSD)")
    p.add_argument("--bars",           default=5000, type=int, help="Number of M1 bars to fetch (default: 5000)")
    p.add_argument("--output",         default="signals.csv",  help="Output CSV path (default: signals.csv)")
    p.add_argument("--signals-only",   action="store_true",    help="Output only rows where any signal fired")
    # Indicator params
    p.add_argument("--kalman-alpha",   default=0.01,  type=float)
    p.add_argument("--kalman-beta",    default=0.1,   type=float)
    p.add_argument("--kalman-period",  default=77,    type=int)
    p.add_argument("--dev",            default=1.2,   type=float)
    p.add_argument("--st-factor",      default=0.7,   type=float)
    p.add_argument("--st-atr-period",  default=7,     type=int)
    p.add_argument("--wma-period",     default=200,   type=int)
    return p.parse_args()


def main():
    args = parse_args()

    print(f"[1/3] Fetching {args.bars} M1 bars for {args.symbol} from MT5 …")
    df = fetch_mt5_data(args.symbol, args.bars)
    print(f"      Got {len(df)} bars  ({df['time'].iloc[0]} → {df['time'].iloc[-1]})")

    print("[2/3] Computing indicator & signals …")
    result = compute_signals(
        df,
        kalman_alpha   = args.kalman_alpha,
        kalman_beta    = args.kalman_beta,
        kalman_period  = args.kalman_period,
        dev            = args.dev,
        st_factor      = args.st_factor,
        st_atr_period  = args.st_atr_period,
        wma_period     = args.wma_period,
    )

    # Drop warm-up rows where Kalman / WMA haven't stabilised
    warmup = max(args.wma_period, args.kalman_period) + args.st_atr_period
    result = result.iloc[warmup:].reset_index(drop=True)

    if args.signals_only:
        signal_cols = [c for c in result.columns if c.startswith("signal_")]
        mask = result[signal_cols].any(axis=1)
        result = result[mask].reset_index(drop=True)
        print(f"      {len(result)} signal bars found after warm-up filter.")

    print(f"[3/3] Writing CSV → {args.output}")
    result.to_csv(args.output, index=False)

    # ── Summary ───────────────────────────────────────────────────────────────
    sig_cols = [c for c in result.columns if c.startswith("signal_")]
    print("\n── Signal counts ──────────────────────────────────")
    for col in sig_cols:
        count = result[col].sum()
        label = col.replace("signal_", "").replace("_", " ").title()
        print(f"  {label:<25} {count:>5}")
    print("───────────────────────────────────────────────────")
    print(f"\nDone. Output: {args.output}")


if __name__ == "__main__":
    main()

import MetaTrader5 as mt5
import pandas as pd
from datetime import datetime
import time
import os

def download_latest_ticks():
    if not mt5.initialize():
        print(f"initialize() failed, error code = {mt5.last_error()}")
        return

    symbol = "Volatility 100 Index.0"
    mt5.symbol_select(symbol, True)

    print(f"Fetching latest 2,000,000 ticks for {symbol}...")
    
    # Using copy_ticks_from with datetime.now() gets the latest ticks backwards
    # This is often more reliable for "latest" data than copy_ticks_range
    ticks = mt5.copy_ticks_from(symbol, datetime.now(), 2000000, mt5.COPY_TICKS_ALL)

    if ticks is None or len(ticks) == 0:
        print(f"No ticks found. Error: {mt5.last_error()}")
        mt5.shutdown()
        return

    print(f"Retrieved {len(ticks)} ticks.")
    df = pd.DataFrame(ticks)
    df['time'] = pd.to_datetime(df['time'], unit='s')

    print(f"Earliest tick in batch: {df['time'].min()}")
    print(f"Latest tick in batch: {df['time'].max()}")

    filename = f"latest_{symbol.replace(' ', '_').lower()}_ticks.csv"
    df.to_csv(filename, index=False)
    print(f"Saved to {filename}")

    mt5.shutdown()

if __name__ == "__main__":
    download_latest_ticks()

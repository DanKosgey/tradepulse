import MetaTrader5 as mt5
import pandas as pd
from datetime import datetime
import time
import os

def download_v100_ticks():
    # 1. Initialize MetaTrader 5
    if not mt5.initialize():
        print(f"initialize() failed, error code = {mt5.last_error()}")
        return

    print("Successfully initialized MT5")

    # 2. Identify the correct symbol
    # Deriv symbols usually have spaces or are like 'Volatility 100 Index'
    symbol = "Volatility 100 Index"
    
    # Check if symbol is available
    symbol_info = mt5.symbol_info(symbol)
    if symbol_info is None:
        print(f"{symbol} not found. Searching for similar symbols...")
        symbols = mt5.symbols_get()
        v100_symbols = [s.name for s in symbols if "100" in s.name and "Volatility" in s.name]
        if v100_symbols:
            symbol = v100_symbols[0]
            print(f"Using found symbol: {symbol}")
        else:
            print("Could not find Volatility 100 Index. Please check your MT5 Market Watch.")
            mt5.shutdown()
            return

    # Select the symbol in Market Watch
    mt5.symbol_select(symbol, True)

    # 3. Define the time range
    # To get "max" amount, we can start from a date far in the past
    # Note: MT5 tick history depth depends on the broker and your MT5 settings (Max bars in chart)
    utc_from = datetime(2020, 1, 1)
    utc_to = datetime.now()

    print(f"Fetching ticks for {symbol} from {utc_from} to {utc_to}...")

    # 4. Fetch ticks
    # mt5.copy_ticks_range can return a lot of data. 
    # For very large datasets, you might need to fetch in chunks, 
    # but let's try the direct approach first.
    ticks = mt5.copy_ticks_range(symbol, utc_from, utc_to, mt5.COPY_TICKS_ALL)

    if ticks is None or len(ticks) == 0:
        print(f"No ticks found for {symbol}. Error: {mt5.last_error()}")
        mt5.shutdown()
        return

    print(f"Retrieved {len(ticks)} ticks.")

    # 5. Convert to Pandas DataFrame
    df = pd.DataFrame(ticks)
    # Convert time in seconds to datetime objects
    df['time'] = pd.to_datetime(df['time'], unit='s')

    # 6. Save to CSV
    filename = f"{symbol.replace(' ', '_').lower()}_ticks.csv"
    filepath = os.path.join(os.getcwd(), filename)
    
    print(f"Saving data to {filename}...")
    df.to_csv(filepath, index=False)
    
    print(f"Download complete! File saved at: {filepath}")
    print(f"First few rows:\n{df.head()}")

    # 7. Shutdown MT5 connection
    mt5.shutdown()

if __name__ == "__main__":
    download_v100_ticks()

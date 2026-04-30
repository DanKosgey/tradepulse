import MetaTrader5 as mt5
import pandas as pd
from datetime import datetime, timedelta
import time
import os

def download_max_ticks():
    if not mt5.initialize():
        print(f"initialize() failed, error code = {mt5.last_error()}")
        return

    symbol = "Volatility 100 Index.0"
    mt5.symbol_select(symbol, True)

    print(f"Forcing history download for {symbol}...")
    # Requesting bars often forces the terminal to download history from the server
    # We'll request the last 10,000 M1 bars
    bars = mt5.copy_rates_from_pos(symbol, mt5.TIMEFRAME_M1, 0, 10000)
    if bars is not None:
        print(f"Synced {len(bars)} bars. Now attempting to fetch ticks...")
    
    # Wait a bit for sync
    time.sleep(2)

    # We will try to fetch ticks in chunks to avoid timeouts and see where the data stops
    total_ticks = []
    current_end_time = datetime.now()
    chunk_size = 500000
    max_iterations = 10 # Adjust as needed
    
    for i in range(max_iterations):
        print(f"Iteration {i+1}: Fetching {chunk_size} ticks before {current_end_time}...")
        ticks = mt5.copy_ticks_from(symbol, current_end_time, chunk_size, mt5.COPY_TICKS_ALL)
        
        if ticks is None or len(ticks) == 0:
            print(f"No more ticks found at iteration {i+1}.")
            break
            
        df_chunk = pd.DataFrame(ticks)
        df_chunk['time'] = pd.to_datetime(df_chunk['time'], unit='s')
        total_ticks.append(df_chunk)
        
        # Update end time for next chunk (the earliest tick in this chunk)
        earliest_tick_time = df_chunk['time'].min()
        if current_end_time == earliest_tick_time:
            # Avoid infinite loop if no new data
            break
        current_end_time = earliest_tick_time
        
        print(f"  Retrieved {len(df_chunk)} ticks. Oldest: {earliest_tick_time}")
        
        if len(df_chunk) < chunk_size:
            print("  Reached the end of available history.")
            break

    if not total_ticks:
        print("No ticks could be retrieved.")
        mt5.shutdown()
        return

    # Combine all chunks
    full_df = pd.concat(total_ticks).drop_duplicates(subset=['time_msc']).sort_values('time_msc')
    
    print(f"Final dataset: {len(full_df)} ticks.")
    print(f"Range: {full_df['time'].min()} to {full_df['time'].max()}")

    filename = f"max_{symbol.replace(' ', '_').lower()}_ticks.csv"
    full_df.to_csv(filename, index=False)
    print(f"Saved to {filename}")

    mt5.shutdown()

if __name__ == "__main__":
    download_max_ticks()

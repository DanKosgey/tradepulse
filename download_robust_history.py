import MetaTrader5 as mt5
import pandas as pd
from datetime import datetime, timedelta
import os

def download_robust_history():
    if not mt5.initialize():
        print(f"initialize() failed, error code = {mt5.last_error()}")
        return

    symbol = "Volatility 100 Index.0"
    mt5.symbol_select(symbol, True)

    # We will fetch day-by-day from today going back to 2020 (or until no more data)
    current_date = datetime.now().date()
    end_date = datetime(2020, 1, 1).date()
    
    all_dfs = []
    
    print(f"Starting robust download for {symbol}...")
    
    while current_date >= end_date:
        start_dt = datetime.combine(current_date, datetime.min.time())
        end_dt = datetime.combine(current_date, datetime.max.time())
        
        print(f"Fetching {current_date}...")
        ticks = mt5.copy_ticks_range(symbol, start_dt, end_dt, mt5.COPY_TICKS_ALL)
        
        if ticks is not None and len(ticks) > 0:
            df_day = pd.DataFrame(ticks)
            df_day['time'] = pd.to_datetime(df_day['time'], unit='s')
            all_dfs.append(df_day)
            print(f"  Done: {len(ticks)} ticks found.")
        else:
            print(f"  No data found for {current_date}. Error: {mt5.last_error()}")
            # If we hit multiple empty days in a row, we might have reached the absolute end
            # For now, let's just continue and see
            pass
            
        current_date -= timedelta(days=1)
        
        # Limit to 30 days for now to verify it works, then the user can extend
        if len(all_dfs) >= 60: 
            break

    if not all_dfs:
        print("No data retrieved at all.")
        mt5.shutdown()
        return

    full_df = pd.concat(all_dfs).drop_duplicates(subset=['time_msc']).sort_values('time_msc')
    
    print(f"\nFinal dataset: {len(full_df)} ticks.")
    print(f"Range: {full_df['time'].min()} to {full_df['time'].max()}")

    filename = f"robust_{symbol.replace(' ', '_').lower()}_ticks.csv"
    full_df.to_csv(filename, index=False)
    print(f"Saved to {filename}")

    mt5.shutdown()

if __name__ == "__main__":
    download_robust_history()

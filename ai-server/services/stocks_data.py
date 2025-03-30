import yfinance as yf
import time, random
from datetime import datetime, timedelta

cache = {}
CACHE_EXPIRY = timedelta(minutes=15)  

def fetch_stock_data(ticker, max_retries=3):
    """
    Fetches real-time stock data from Yahoo Finance with retry logic and caching.
    
    Args:
        ticker: Stock ticker symbol
        max_retries: Maximum number of retry attempts
    
    Returns:
        Dictionary with current price and dividend yield
    """
    current_time = datetime.now()
    if ticker in cache and current_time - cache[ticker]["timestamp"] < CACHE_EXPIRY:
        print(f"Using cached data for {ticker}")
        return cache[ticker]["data"]
        
    retry_count = 0
    base_delay = 2  
    
    while retry_count < max_retries:
        try:
            stock = yf.Ticker(ticker)
            history = stock.history(period="1y")
            
            if history.empty:
                raise Exception(f"No data returned for {ticker}")
                
            dividends = history["Dividends"].sum()
            current_price = stock.history(period="1d")["Close"].iloc[-1]
            
            result = {
                "currentPrice": round(current_price, 2),
                "dividendYield": round((dividends / current_price) * 100, 2) if current_price else 0,
            }
            
            # Store in cache
            cache[ticker] = {
                "data": result,
                "timestamp": current_time
            }
            
            return result
            
        except Exception as e:
            retry_count += 1
            if "Too Many Requests" in str(e) or "Rate limited" in str(e):
                if retry_count >= max_retries:
                    print(f"Error fetching data for {ticker} after {max_retries} retries: {e}")
                    return {
                        "currentPrice": None,
                        "dividendYield": None,
                    }
                
                delay = base_delay * (2 ** (retry_count - 1)) + random.uniform(0, 1)
                print(f"Rate limited for {ticker}. Retrying in {delay:.2f} seconds (attempt {retry_count}/{max_retries})")
                time.sleep(delay)
            else:
                print(f"Error fetching data for {ticker}: {e}")
                return {
                    "currentPrice": None,
                    "dividendYield": None,
                }

def fetch_multiple_stocks(tickers, delay_between_requests=1):
    """
    Fetches data for multiple stocks with delay between requests to avoid rate limiting.
    
    Args:
        tickers: List of ticker symbols
        delay_between_requests: Seconds to wait between API calls
    
    Returns:
        Dictionary of ticker to stock data
    """
    results = {}
    
    for i, ticker in enumerate(tickers):
        results[ticker] = fetch_stock_data(ticker)
        
        if i < len(tickers) - 1:
            time.sleep(delay_between_requests)
            
    return results
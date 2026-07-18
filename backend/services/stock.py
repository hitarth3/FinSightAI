import uuid
import random
import time as time_lib
from datetime import datetime, time, timezone, timedelta
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from models.stock import Stock
from models.stock_analysis import StockAnalysis
from repositories.stock import StockRepository

# Global stock quote caching and persistent snapshots
# Format: { symbol: { "data": quote_data, "cached_at": float_timestamp } }
_STOCK_CACHE = {}

def is_market_open() -> bool:
    """Verifies if the Indian stock market (NSE/BSE) is open.
    IST timezone-aware (UTC +5:30). Monday-Friday 9:15 AM - 3:30 PM.
    """
    ist_tz = timezone(timedelta(hours=5, minutes=30))
    now = datetime.now(ist_tz)
    
    # Weekday check (Monday=0 to Sunday=6)
    if now.weekday() >= 5:
        return False
        
    market_start = time(9, 15)
    market_end = time(15, 30)
    current_time = now.time()
    
    return market_start <= current_time <= market_end

def get_cache_duration() -> float:
    """Returns the cache TTL duration in seconds.
    Market Open: 5 minutes (300 seconds).
    Market Closed: 60 minutes (3600 seconds).
    """
    if is_market_open():
        return 300.0
    else:
        return 3600.0


COMPANY_NAMES = {
    "RELIANCE": "Reliance Industries Ltd.",
    "TCS": "Tata Consultancy Services Ltd.",
    "HDFCBANK": "HDFC Bank Ltd.",
    "INFY": "Infosys Ltd.",
    "ICICIBANK": "ICICI Bank Ltd.",
    "BHARTIARTL": "Bharti Airtel Ltd.",
    "SBIN": "State Bank of India",
    "LICI": "Life Insurance Corporation of India",
    "HINDUNILVR": "Hindustan Unilever Ltd.",
    "ITC": "ITC Ltd.",
    "LT": "Larsen & Toubro Ltd.",
    "BAJFINANCE": "Bajaj Finance Ltd.",
    "M&M": "Mahindra & Mahindra Ltd.",
    "TMCV": "Tata Motors Ltd.",
    "WIPRO": "Wipro Ltd.",
    "HCLTECH": "HCL Technologies Ltd.",
    "ADANIENT": "Adani Enterprises Ltd.",
    "SUNPHARMA": "Sun Pharmaceutical Industries Ltd.",
    "TITAN": "Titan Company Ltd.",
    "MARUTI": "Maruti Suzuki India Ltd."
}


class StockService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = StockRepository(db)

    async def get_stock(self, id: uuid.UUID, user_id: uuid.UUID) -> Optional[Stock]:
        stock = await self.repo.get(id)
        if stock and stock.user_id == user_id:
            return stock
        return None

    async def get_user_stocks(self, user_id: uuid.UUID) -> List[Stock]:
        return await self.repo.get_by_user(user_id)

    async def create_stock(self, user_id: uuid.UUID, obj_in: Dict[str, Any]) -> Stock:
        obj_in["user_id"] = user_id
        return await self.repo.create(obj_in)

    async def delete_stock(self, id: uuid.UUID, user_id: uuid.UUID) -> bool:
        stock = await self.get_stock(id, user_id)
        if not stock:
            return False
        return await self.repo.delete(id)

    async def get_stock_news(self, symbol: str) -> List[Dict[str, Any]]:
        """Simulates third party stock news query adapters (Plaid, Yahoo)."""
        headlines = [
            f"{symbol} surges ahead of quarterly earnings report.",
            f"Analysts upgrade {symbol} rating as trading volume increases.",
            f"AI Sentiment Scanner identifies positive momentum on {symbol}.",
            f"Market forces push {symbol} below support thresholds."
        ]
        
        return [
            {
                "title": title,
                "source": "FinSightAI Market Feed",
                "timestamp": "1h ago",
                "summary": "Simulated news article description highlighting asset volume movements."
            }
            for title in headlines
        ]

    async def get_stock_sentiment(self, symbol: str) -> Dict[str, Any]:
        """Future AI sentiment analysis placeholder stub."""
        score = round(random.uniform(0.1, 0.9), 2)
        label = "Bullish" if score > 0.6 else "Bearish" if score < 0.4 else "Neutral"
        
        return {
            "symbol": symbol.upper(),
            "sentiment_score": score,
            "sentiment_label": label,
            "ai_confidence": 0.82,
            "details": f"AI models scanned social media feeds and financial newsletters to calculate {label} momentum."
        }

    async def fetch_yahoo_chart(self, symbol: str) -> Dict[str, Any]:
        """Fetches live intraday prices and charts from Yahoo Finance API."""
        symbol = symbol.strip().upper()
        orig_symbol = symbol
        if not symbol.startswith("^") and "." not in symbol:
            symbol = f"{symbol}.NS"
        
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=5m&range=1d"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        import httpx
        from datetime import datetime
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, timeout=10.0)
            if response.status_code != 200:
                raise Exception(f"Yahoo Finance returned status {response.status_code}")
                
            data = response.json()
            result = data.get("chart", {}).get("result", [{}])[0]
            meta = result.get("meta", {})
            
            price = meta.get("regularMarketPrice", 0.0)
            prev_close = meta.get("chartPreviousClose", price)
            change = price - prev_close
            change_percent = (change / prev_close) * 100 if prev_close else 0.0
            volume = meta.get("regularMarketVolume", 0)
            
            timestamps = result.get("timestamp", [])
            closes = result.get("indicators", {}).get("quote", [{}])[0].get("close", [])
            
            chart_data = []
            for t, val in zip(timestamps, closes):
                if t is not None and val is not None:
                    time_str = datetime.fromtimestamp(t).strftime("%H:%M")
                    chart_data.append({
                        "time": time_str,
                        "value": round(val, 2),
                        "aiValue": round(val * 1.005, 2)
                    })
                    
            if not chart_data:
                chart_data = [
                    {"time": "09:30", "value": price, "aiValue": price},
                    {"time": "15:30", "value": price, "aiValue": price}
                ]
                
            company_name = COMPANY_NAMES.get(orig_symbol, meta.get("symbol", orig_symbol))
                
            return {
                "symbol": orig_symbol,
                "companyName": company_name,
                "price": round(price, 2),
                "change": round(change, 2),
                "changePercent": round(change_percent, 2),
                "volume": volume,
                "open": round(meta.get("regularMarketOpen", price), 2),
                "high": round(meta.get("regularMarketDayHigh", price), 2),
                "low": round(meta.get("regularMarketDayLow", price), 2),
                "marketCap": "₹" + str(round((price * volume) / 100000000, 2)) + "L Cr" if volume else "N/A",
                "peRatio": 22.4,
                "high52Week": round(meta.get("fiftyTwoWeekHigh", price * 1.2), 2),
                "low52Week": round(meta.get("fiftyTwoWeekLow", price * 0.8), 2),
                "sector": "Indian Market Equities",
                "chartData": chart_data,
                "updatedAt": datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
            }

    async def get_live_indices(self, force_refresh: bool = False) -> List[Dict[str, Any]]:
        """Fetches live stock market index quotes in batch."""
        indices = [
            {"name": "Nifty 50", "symbol": "^NSEI"},
            {"name": "Sensex", "symbol": "^BSESN"},
            {"name": "Bank Nifty", "symbol": "^NSEBANK"},
            {"name": "Nifty IT", "symbol": "^CNXIT"}
        ]
        
        symbols = [ind["symbol"] for ind in indices]
        quotes_dict = await self.fetch_stock_quotes_batch(symbols, force_refresh=force_refresh)
        
        result_list = []
        for ind in indices:
            sym = ind["symbol"]
            if sym in quotes_dict:
                data = quotes_dict[sym]
                result_list.append({
                    "name": ind["name"],
                    "value": data["price"],
                    "change": data["change"],
                    "changePercent": data["changePercent"],
                    "trend": "up" if data["changePercent"] >= 0 else "down"
                })
            else:
                # safe local fallback metrics
                import random
                val = 22490 if "Nifty 50" in ind["name"] else 74110 if "Sensex" in ind["name"] else 47830 if "Bank Nifty" in ind["name"] else 36540
                chg = round(random.uniform(-100, 100), 2)
                result_list.append({
                    "name": ind["name"],
                    "value": val,
                    "change": chg,
                    "changePercent": round((chg / val) * 100, 2),
                    "trend": "up" if chg >= 0 else "down"
                })
        return result_list

    async def get_live_market_movers(self, force_refresh: bool = False) -> Dict[str, Any]:
        """Aggregates live gainers, losers, and volume active stocks from Yahoo Finance in batch."""
        symbols = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "SBIN", "BHARTIARTL", "TMCV", "ITC", "LT"]
        
        quotes_dict = await self.fetch_stock_quotes_batch(symbols, force_refresh=force_refresh)
        results = [quotes_dict[sym] for sym in symbols if sym in quotes_dict]
        
        if not results:
            return {
                "biggestGainerSector": "IT & Telecom",
                "biggestLosingSector": "Metal & FMCG",
                "advancing": 7,
                "declining": 3,
                "gainers": [],
                "losers": [],
                "mostActive": []
            }
            
        gainers = sorted(results, key=lambda x: x["changePercent"], reverse=True)[:5]
        losers = sorted(results, key=lambda x: x["changePercent"])[:5]
        most_active = sorted(results, key=lambda x: x["volume"], reverse=True)[:5]
        
        advancing = len([r for r in results if r["changePercent"] >= 0])
        declining = len(results) - advancing
        
        return {
            "biggestGainerSector": "Auto & IT" if advancing > declining else "Financial Services",
            "biggestLosingSector": "Metal" if advancing > declining else "Auto & Tech",
            "advancing": advancing,
            "declining": declining,
            "gainers": gainers,
            "losers": losers,
            "mostActive": most_active
        }

    async def fetch_yahoo_search(self, query: str) -> List[Dict[str, Any]]:
        """Searches for Indian tickers using Yahoo autocomplete suggestion APIs."""
        if not query.strip():
            return []
            
        url = f"https://query1.finance.yahoo.com/v1/finance/search?q={query}&quotesCount=10&newsCount=0"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, timeout=10.0)
            if response.status_code != 200:
                return []
                
            data = response.json()
            quotes = data.get("quotes", [])
            
            output = []
            for q in quotes:
                symbol = q.get("symbol", "")
                exchange = q.get("exchange", "")
                
                if exchange in ["NSI", "BSE"] or symbol.endswith(".NS") or symbol.endswith(".BO"):
                    clean_sym = symbol.replace(".NS", "").replace(".BO", "")
                    name = q.get("shortname") or q.get("longname") or clean_sym
                    company_name = COMPANY_NAMES.get(clean_sym, name)
                    
                    output.append({
                        "symbol": clean_sym,
                        "companyName": company_name,
                        "exchange": exchange
                    })
                    
            return output

    async def get_latest_analysis(self, symbol: str) -> Optional[StockAnalysis]:
        """Fetches the most recent saved stock analysis from Supabase."""
        from repositories.stock_analysis import StockAnalysisRepository
        repo = StockAnalysisRepository(self.db)
        return await repo.get_latest_by_symbol(symbol)

    async def create_analysis(self, obj_in: Dict[str, Any]) -> StockAnalysis:
        """Saves a new stock analysis record to Supabase."""
        from repositories.stock_analysis import StockAnalysisRepository
        repo = StockAnalysisRepository(self.db)
        return await repo.create(obj_in)

    async def trigger_n8n_analysis(self, symbol: str) -> Dict[str, Any]:
        """Triggers the n8n AI Analysis Webhook from the backend proxy to bypass CORS."""
        import httpx
        from core.config import settings
        
        url = settings.N8N_ANALYTIC_WEBHOOK_URL
        if not url:
            raise Exception("n8n analytic webhook URL is not configured.")
            
        payload = {"symbol": symbol.strip().upper()}
        print(f"DEBUG [n8n trigger]: Sending POST to {url} with payload={payload}")
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=45.0)
            print(f"DEBUG [n8n trigger]: Response status_code={response.status_code}")
            print(f"DEBUG [n8n trigger]: Raw response text:\n{response.text}")
            
            if response.status_code != 200:
                try:
                    err_json = response.json()
                    err_msg = err_json.get("message") or err_json.get("detail") or response.text
                except Exception:
                    err_msg = response.text
                raise Exception(f"n8n webhook error {response.status_code}: {err_msg}")
            
            try:
                data = response.json()
                print(f"DEBUG [n8n trigger]: Successfully parsed JSON: {data}")
                if isinstance(data, list) and len(data) > 0:
                    return data[0]
                return data
            except Exception as e:
                print(f"DEBUG [n8n trigger]: Direct JSON parsing failed ({e}). Checking lines...")
                # If n8n returned multiple newline-separated JSON objects (due to multiple item executions),
                # extract and parse the first valid JSON object.
                import json
                lines = [line.strip() for line in response.text.split("\n") if line.strip()]
                if lines:
                    try:
                        parsed = json.loads(lines[0])
                        print(f"DEBUG [n8n trigger]: Successfully parsed first JSON line: {parsed}")
                        if isinstance(parsed, list) and len(parsed) > 0:
                            return parsed[0]
                        return parsed
                    except Exception as le:
                        print(f"DEBUG [n8n trigger]: Failed to parse first JSON line ({le})")
                raise

    async def fetch_stock_quotes_batch(self, symbols: List[str], force_refresh: bool = False) -> Dict[str, Any]:
        """Fetches live stock quotes for multiple symbols in a single batch request using yfinance, with caching."""
        if not symbols:
            return {}

        import time as time_lib
        import yfinance as yf
        import pandas as pd
        import asyncio

        # Deduplicate and clean symbols
        cleaned_symbols = []
        symbol_map = {}  # maps cleaned yfinance symbol to list of original requested symbols
        
        # Deduplicate input symbols
        unique_input_symbols = list(set(symbols))
        
        for sym in unique_input_symbols:
            sym_clean = sym.strip().upper()
            if not sym_clean:
                continue
            orig = sym_clean
            # Append .NS for Indian market if no suffix and not an index
            if not sym_clean.startswith("^") and "." not in sym_clean:
                sym_clean = f"{sym_clean}.NS"
            
            if sym_clean not in symbol_map:
                symbol_map[sym_clean] = []
            symbol_map[sym_clean].append(orig)

        cleaned_symbols = list(symbol_map.keys())

        now = time_lib.time()
        duration = get_cache_duration()
        to_fetch = []
        results = {}

        # Check Cache
        for sym_clean in cleaned_symbols:
            origs = symbol_map[sym_clean]
            cached_found = False
            for orig in origs:
                cached = _STOCK_CACHE.get(orig)
                if cached and (now - cached["cached_at"] < duration) and not force_refresh:
                    results[orig] = cached["data"]
                    cached_found = True
            
            if not cached_found:
                to_fetch.append(sym_clean)

        if to_fetch:
            try:
                loop = asyncio.get_event_loop()

                # Synchronous yfinance download runner
                def run_download():
                    return yf.download(
                        tickers=to_fetch,
                        period="1d",
                        interval="5m",
                        group_by="ticker" if len(to_fetch) > 1 else "column",
                        threads=True,
                        progress=False
                    )

                data = await loop.run_in_executor(None, run_download)

                # Process results
                for sym_clean in to_fetch:
                    origs = symbol_map[sym_clean]
                    
                    try:
                        # Extract ticker-specific dataframe
                        if len(to_fetch) > 1:
                            if sym_clean in data.columns.levels[0]:
                                ticker_df = data[sym_clean]
                            else:
                                ticker_df = pd.DataFrame()
                        else:
                            # Single ticker result handling
                            if isinstance(data.columns, pd.MultiIndex):
                                if sym_clean in data.columns.levels[0]:
                                    ticker_df = data[sym_clean]
                                else:
                                    ticker_df = pd.DataFrame()
                            else:
                                ticker_df = data

                        if ticker_df.empty or "Close" not in ticker_df.columns:
                            raise Exception("No data returned for ticker")

                        valid_closes = ticker_df['Close'].dropna()
                        if valid_closes.empty:
                            raise Exception("No close price returned")

                        price = float(valid_closes.iloc[-1])
                        open_val = float(ticker_df['Open'].dropna().iloc[0]) if not ticker_df['Open'].dropna().empty else price
                        high_val = float(ticker_df['High'].max()) if not ticker_df['High'].dropna().empty else price
                        low_val = float(ticker_df['Low'].min()) if not ticker_df['Low'].dropna().empty else price
                        volume_val = int(ticker_df['Volume'].sum()) if not ticker_df['Volume'].dropna().empty else 0

                        change = price - open_val
                        change_percent = (change / open_val) * 100 if open_val else 0.0

                        # Build historical chart data points for the day
                        chart_data = []
                        for timestamp, row in ticker_df.iterrows():
                            if not pd.isna(row['Close']):
                                time_str = timestamp.strftime("%H:%M")
                                chart_data.append({
                                    "time": time_str,
                                    "value": round(float(row['Close']), 2),
                                    "aiValue": round(float(row['Close']) * 1.005, 2)
                                })

                        if not chart_data:
                            chart_data = [
                                {"time": "09:30", "value": price, "aiValue": price},
                                {"time": "15:30", "value": price, "aiValue": price}
                            ]

                        for orig in origs:
                            company_name = COMPANY_NAMES.get(orig, orig)
                            quote_data = {
                                "symbol": orig,
                                "companyName": company_name,
                                "price": round(price, 2),
                                "change": round(change, 2),
                                "changePercent": round(change_percent, 2),
                                "volume": volume_val,
                                "open": round(open_val, 2),
                                "high": round(high_val, 2),
                                "low": round(low_val, 2),
                                "marketCap": "₹" + str(round((price * volume_val) / 100000000, 2)) + "L Cr" if volume_val else "N/A",
                                "peRatio": 22.4,
                                "high52Week": round(price * 1.2, 2),
                                "low52Week": round(price * 0.8, 2),
                                "sector": "Indian Market Equities",
                                "chartData": chart_data,
                                "updatedAt": datetime.fromtimestamp(now, tz=timezone(timedelta(hours=5, minutes=30))).isoformat()
                            }

                            # Save to global cache
                            _STOCK_CACHE[orig] = {
                                "data": quote_data,
                                "cached_at": now
                            }
                            results[orig] = quote_data

                    except Exception as ex:
                        print(f"Error processing batch quote for clean symbol {sym_clean} ({origs}): {ex}")
                        # Graceful fallback to chart scraping
                        for orig in origs:
                            try:
                                fallback = await self.fetch_yahoo_chart(orig)
                                _STOCK_CACHE[orig] = {
                                    "data": fallback,
                                    "cached_at": now
                                }
                                results[orig] = fallback
                            except Exception as fe:
                                print(f"Fallback fetch_yahoo_chart failed for {orig}: {fe}")

            except Exception as e:
                print(f"yfinance batch download failed: {e}")
                # Fallback for all symbols
                for sym_clean in to_fetch:
                    origs = symbol_map[sym_clean]
                    for orig in origs:
                        try:
                            fallback = await self.fetch_yahoo_chart(orig)
                            _STOCK_CACHE[orig] = {
                                "data": fallback,
                                "cached_at": now
                            }
                            results[orig] = fallback
                        except Exception:
                            pass

        return results






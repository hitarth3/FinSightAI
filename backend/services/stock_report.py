"""Shared stock research engine for HTTP and MCP; no workflow server required."""
import asyncio
import json
import logging
import re
from datetime import datetime, timezone

import httpx
import numpy as np
import yfinance as yf
from pydantic import BaseModel, Field

from core.config import settings
from schemas.stock_analysis import StockAnalysisCreate

logger = logging.getLogger(__name__)


class MarketDataUnavailable(Exception):
    pass


def normalize_symbol(symbol: str) -> str:
    symbol = symbol.strip().upper()
    if not re.fullmatch(r"[A-Z0-9][A-Z0-9&.\-]{0,19}", symbol):
        raise ValueError("Use a valid NSE/BSE ticker, for example RELIANCE or TCS.NS.")
    if '.' in symbol and not symbol.endswith(('.NS', '.BO')):
        raise ValueError("Only NSE (.NS) and BSE (.BO) tickers are supported.")
    return symbol.removesuffix('.NS')


def _history(symbol: str):
    ticker = symbol if symbol.endswith('.BO') else f'{symbol}.NS'
    return yf.Ticker(ticker).history(period='6mo', interval='1d', auto_adjust=True, timeout=15)


async def market_snapshot(symbol: str) -> dict:
    symbol = normalize_symbol(symbol)
    try:
        history = await asyncio.wait_for(asyncio.to_thread(_history, symbol), timeout=20)
        values = history[['Close', 'High', 'Low']].replace([np.inf, -np.inf], np.nan).dropna()
        values = values[(values > 0).all(axis=1)]
        if len(values) < 50:
            raise MarketDataUnavailable("At least 50 daily price observations are required.")
        close = values['Close']
        latest = values.index[-1].isoformat()
        return {
            'symbol': symbol, 'source': 'Yahoo Finance via yfinance (adjusted daily prices)',
            'marketDataAsOf': latest, 'observations': len(values),
            'price': round(float(close.iloc[-1]), 2),
            'sma20': round(float(close.tail(20).mean()), 2),
            'sma50': round(float(close.tail(50).mean()), 2),
            'return20': round(float((close.iloc[-1] / close.iloc[-21] - 1) * 100), 2),
            'volatility': round(float(close.pct_change().dropna().std() * np.sqrt(252) * 100), 2),
            'support': sorted(set(round(float(values['Low'].tail(n).min()), 2) for n in (20, 50))),
            'resistance': sorted(set(round(float(values['High'].tail(n).max()), 2) for n in (20, 50))),
        }
    except MarketDataUnavailable:
        raise
    except Exception as exc:
        raise MarketDataUnavailable("Market history is unavailable. Please retry later.") from exc


class Narrative(BaseModel):
    summary: str = Field(min_length=30, max_length=3000)


async def generate_report(symbol: str) -> StockAnalysisCreate:
    snapshot = await market_snapshot(symbol)
    price, short, long = (snapshot[k] for k in ('price', 'sma20', 'sma50'))
    score = 50 + (15 if price > short else -15) + (15 if short > long else -15)
    score += 10 if snapshot['return20'] > 0 else -10
    trend = 'Bullish' if score >= 70 else 'Bearish' if score <= 30 else 'Sideways'
    summary = (
        f"Technical report (rules-based). {snapshot['symbol']} last adjusted close: ₹{price}; "
        f"20/50-session averages: ₹{short}/₹{long}. 20-session return: {snapshot['return20']}%. "
        f"Annualized historical volatility: {snapshot['volatility']}%. "
    )
    if settings.GROQ_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                response = await client.post(
                    'https://api.groq.com/openai/v1/chat/completions',
                    headers={'Authorization': f'Bearer {settings.GROQ_API_KEY}'},
                    json={'model': settings.STOCK_REPORT_MODEL, 'temperature': 0.2,
                          'max_tokens': 700, 'response_format': {'type': 'json_object'},
                          'messages': [
                              {'role': 'system', 'content': 'Write a concise stock research summary using only supplied price metrics. No news, fundamentals, forecasts or personalized investment advice. Return JSON with one summary string.'},
                              {'role': 'user', 'content': json.dumps(snapshot)},
                          ]},
                )
                response.raise_for_status()
                narrative = Narrative.model_validate_json(response.json()['choices'][0]['message']['content'])
                summary = 'AI-assisted technical report (Groq). ' + narrative.summary + ' '
        except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError):
            logger.warning('Stock narrative unavailable; using calculated technical summary.')
            summary += 'AI summary unavailable; calculated metrics remain available. '
    summary += (
        f"Source: {snapshot['source']}; market data as of {snapshot['marketDataAsOf']}. "
        'Strength is a trend heuristic, not a return forecast. Confidence is not estimated (0). '
        'Support/resistance are historical range extrema, not price targets. '
        'News and fundamentals were not evaluated. Research only; not personalized investment advice.'
    )
    return StockAnalysisCreate(
        symbol=snapshot['symbol'], strength_score=score, recommendation='HOLD', trend=trend,
        confidence=0, risk_level='High' if snapshot['volatility'] >= 30 else 'Medium',
        sentiment='Not evaluated', support_levels=snapshot['support'],
        resistance_levels=snapshot['resistance'], summary=summary,
        analysis_generated_at=datetime.now(timezone.utc),
    )

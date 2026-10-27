"""Recent company headlines with source attribution and conservative fallback scoring."""
import asyncio
import re
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
from urllib.parse import urlparse
from xml.etree import ElementTree

import httpx
import yfinance as yf


def company_query(symbol: str) -> str:
    from services.stock import COMPANY_NAMES
    base = symbol.removesuffix('.BO')
    company = COMPANY_NAMES.get(base)
    if company:
        return re.sub(r'\s+Ltd\.?$', '', company)
    # Unknown tickers stay explicitly qualified as Indian stocks in the query.
    return f'{base} stock India'


def _yahoo_news(symbol: str) -> list:
    ticker = symbol if symbol.endswith('.BO') else f'{symbol}.NS'
    return yf.Ticker(ticker).get_news(count=12)


def clean_articles(articles: list, now: datetime | None = None) -> list[dict]:
    now = now or datetime.now(timezone.utc)
    cleaned, seen = [], set()
    for article in articles:
        try:
            title = re.sub(r'\s+', ' ', str(article['title'])).strip()[:350]
            url = str(article['url'])
            published = datetime.fromisoformat(article['published_at'].replace('Z', '+00:00'))
            if published.tzinfo is None:
                continue
            if not now - timedelta(days=14) <= published <= now + timedelta(minutes=10):
                continue
            if not title or urlparse(url).scheme != 'https' or not urlparse(url).netloc:
                continue
            identity = re.sub(r'\W+', '', title.lower())
            if identity in seen:
                continue
            seen.add(identity)
            cleaned.append({'title': title, 'url': url, 'source': str(article['source'])[:120],
                            'published_at': published.isoformat()})
        except (KeyError, TypeError, ValueError):
            continue
    return sorted(cleaned, key=lambda a: a['published_at'], reverse=True)[:12]


async def fetch_company_news(symbol: str) -> list[dict]:
    """Company-scoped Google News RSS, with ticker-associated Yahoo as fallback."""
    query = company_query(symbol)
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get('https://news.google.com/rss/search',
                params={'q': f'"{query}" when:14d', 'hl': 'en-IN', 'gl': 'IN', 'ceid': 'IN:en'})
            response.raise_for_status()
        if len(response.content) > 2_000_000:
            raise ValueError('News feed exceeded size limit')
        root = ElementTree.fromstring(response.content)
        articles = []
        for item in root.findall('./channel/item'):
            try:
                articles.append({'title': item.findtext('title'), 'url': item.findtext('link'),
                    'source': item.findtext('source') or 'Google News',
                    'published_at': parsedate_to_datetime(item.findtext('pubDate')).isoformat()})
            except (TypeError, ValueError):
                continue
        result = clean_articles(articles)
        if result:
            return result
    except (httpx.HTTPError, ValueError, ElementTree.ParseError):
        pass
    try:
        raw = await asyncio.wait_for(asyncio.to_thread(_yahoo_news, symbol), timeout=12)
        articles = []
        for item in raw:
            content = item.get('content') or {}
            title = content.get('title') or ''
            # Reject generic market articles returned for an unrelated ticker.
            base = symbol.split('.')[0].lower()
            if not (re.search(r'\b' + re.escape(base) + r'\b', title.lower()) or query.lower() in title.lower()):
                continue
            articles.append({'title': title, 'url': (content.get('canonicalUrl') or {}).get('url'),
                'source': (content.get('provider') or {}).get('displayName', 'Yahoo Finance'),
                'published_at': content.get('pubDate')})
        return clean_articles(articles)
    except Exception:
        return []


def headline_sentiment(title: str) -> str:
    """Transparent lexical fallback; never described as model sentiment."""
    positive = len(re.findall(r'\b(beat|beats|growth|grows|gain|gains|surge|surges|upgrade|upgraded|rally|rallies|profit|profits|wins|record)\b', title.lower()))
    negative = len(re.findall(r'\b(miss|misses|loss|losses|fall|falls|slump|slumps|downgrade|downgraded|drop|drops|cuts|lawsuit|fraud|decline|declines)\b', title.lower()))
    # Negated or mixed headlines cannot safely be assigned a directional label by keywords.
    if re.search(r'\b(no|not|never|despite|but)\b', title.lower()) or (positive and negative):
        return 'Neutral'
    return 'Positive' if positive else 'Negative' if negative else 'Neutral'


def aggregate_sentiment(articles: list[dict]) -> str:
    if not articles:
        return 'Unavailable'
    labels = [a['sentiment'] for a in articles]
    positive, negative = labels.count('Positive'), labels.count('Negative')
    if positive and negative and abs(positive - negative) / len(labels) < 0.34:
        return 'Mixed'
    balance = (positive - negative) / len(labels)
    return 'Positive' if balance >= 0.2 else 'Negative' if balance <= -0.2 else 'Neutral'

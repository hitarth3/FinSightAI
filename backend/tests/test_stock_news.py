from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock

import httpx
import pytest

from services import stock_news, stock_report
from core.config import settings


def article(title='TCS wins new contract', source='Publisher A', days=1):
    return {'title': title, 'source': source, 'url': 'https://example.com/story',
            'published_at': (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()}


def test_news_filters_old_duplicate_and_unsafe_links():
    valid = article()
    result = stock_news.clean_articles([valid, valid, article(days=20),
        {**valid, 'url': 'javascript:alert(1)'}, {**valid, 'published_at': 'nonsense'}, article(days=-2)])
    assert result == [valid]


def test_headline_fallback_and_mixed_aggregation():
    assert stock_news.headline_sentiment('TCS wins record contract') == 'Positive'
    assert stock_news.headline_sentiment('TCS profits fall despite new contract') == 'Neutral'
    assert stock_news.headline_sentiment('TCS shares slump') == 'Negative'
    assert stock_news.aggregate_sentiment([]) == 'Unavailable'
    assert stock_news.aggregate_sentiment([{'sentiment': 'Positive'}, {'sentiment': 'Negative'}]) == 'Mixed'


@pytest.mark.asyncio
async def test_rss_news_is_parsed(monkeypatch):
    from email.utils import format_datetime
    date = format_datetime(datetime.now(timezone.utc))
    xml = f'<rss><channel><item><title>TCS wins contract</title><link>https://example.com/story</link><pubDate>{date}</pubDate><source>Publisher</source></item></channel></rss>'
    response = httpx.Response(200, request=httpx.Request('GET', 'https://example.com'), text=xml)
    monkeypatch.setattr(httpx.AsyncClient, 'get', AsyncMock(return_value=response))
    result = await stock_news.fetch_company_news('TCS')
    assert len(result) == 1
    assert result[0]['source'] == 'Publisher'


@pytest.mark.asyncio
async def test_news_provider_failure_is_not_neutral(monkeypatch):
    monkeypatch.setattr(httpx.AsyncClient, 'get', AsyncMock(side_effect=httpx.ConnectError('offline')))
    monkeypatch.setattr(stock_news, '_yahoo_news', lambda symbol: [])
    assert await stock_news.fetch_company_news('TCS') == []


def snapshot(days=0):
    return {'symbol': 'TCS', 'source': 'test', 'marketDataAsOf': (datetime.now(timezone.utc) - timedelta(days=days)).isoformat(),
            'observations': 120, 'price': 120, 'sma20': 110, 'sma50': 100, 'return20': 10,
            'volatility': 20, 'support': [90], 'resistance': [130]}


def test_confidence_rewards_evidence_and_penalizes_stale_prices():
    news = [article(source=f'Publisher {i}') for i in range(5)]
    high, components = stock_report.evidence_confidence(snapshot(), news, True)
    assert high == 95
    assert sum(components.values()) == high
    assert stock_report.evidence_confidence(snapshot(), [], False)[0] == 55
    assert stock_report.evidence_confidence(snapshot(days=20), news, True)[0] <= 45


@pytest.mark.asyncio
async def test_model_sentiment_is_grounded_and_persistable(monkeypatch):
    monkeypatch.setattr(stock_report, 'market_snapshot', AsyncMock(return_value=snapshot()))
    monkeypatch.setattr(stock_report, 'fetch_company_news', AsyncMock(return_value=[article()]))
    monkeypatch.setattr(settings, 'GROQ_API_KEY', 'test-only')
    response = httpx.Response(200, request=httpx.Request('POST', 'https://example.com'),
        json={'choices': [{'message': {'content': '{"summary":"The supplied headlines and price data support a positive trend.","articles":[{"id":0,"sentiment":"Positive"}]}'}}]})
    monkeypatch.setattr(httpx.AsyncClient, 'post', AsyncMock(return_value=response))
    report = await stock_report.generate_report('TCS')
    assert report.sentiment == 'Positive'
    assert report.confidence == 73
    assert report.recommendation == 'BUY'
    assert report.evidence['news'][0]['url'] == 'https://example.com/story'
    assert report.evidence['news_method'] == 'Groq headline analysis'


@pytest.mark.asyncio
async def test_invented_article_ids_rejected(monkeypatch):
    monkeypatch.setattr(stock_report, 'market_snapshot', AsyncMock(return_value=snapshot()))
    monkeypatch.setattr(stock_report, 'fetch_company_news', AsyncMock(return_value=[article('TCS shares slump')]))
    monkeypatch.setattr(settings, 'GROQ_API_KEY', 'test-only')
    response = httpx.Response(200, request=httpx.Request('POST', 'https://example.com'),
        json={'choices': [{'message': {'content': '{"summary":"This ungrounded summary should not be used by the report.","articles":[{"id":99,"sentiment":"Positive"}]}'}}]})
    monkeypatch.setattr(httpx.AsyncClient, 'post', AsyncMock(return_value=response))
    report = await stock_report.generate_report('TCS')
    assert report.sentiment == 'Negative'
    assert report.recommendation == 'HOLD'
    assert report.evidence['news_method'] == 'Headline keyword scoring'

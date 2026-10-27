from unittest.mock import AsyncMock

import pandas as pd
import pytest

from core.config import settings
from services import stock_report
from services.stock import StockService


@pytest.fixture
def prices(monkeypatch):
    frame = pd.DataFrame({'Close': range(100, 160), 'High': range(102, 162), 'Low': range(98, 158)},
                         index=pd.date_range('2026-07-01', periods=60, tz='UTC'))
    monkeypatch.setattr(stock_report, '_history', lambda symbol: frame)
    monkeypatch.setattr(settings, 'GROQ_API_KEY', None)
    monkeypatch.setattr(stock_report, 'fetch_company_news', AsyncMock(return_value=[]))
    return frame


@pytest.mark.asyncio
async def test_report_uses_real_metrics(prices):
    report = await stock_report.generate_report(' tcs.ns ')
    assert report.symbol == 'TCS'
    assert report.strength_score == 90
    assert report.support_levels == [108.0, 138.0]
    assert report.resistance_levels == [161.0]
    assert report.sentiment == 'Unavailable'
    assert 'rules-based' in report.summary
    assert '2026-08-29' in report.summary


@pytest.mark.asyncio
async def test_report_is_persisted(prices, db_session):
    service = StockService(db_session)
    result = await service.generate_analysis('TCS')
    saved = await service.get_latest_analysis('TCS')
    assert saved.summary == result['summary']
    assert saved.evidence == result['evidence']
    assert saved.confidence == result['confidence']
    assert saved.strength_score == 90


@pytest.mark.parametrize('symbol', ['../secret', 'AAPL.US', '', 'A' * 21])
def test_invalid_symbol(symbol):
    with pytest.raises(ValueError):
        stock_report.normalize_symbol(symbol)


@pytest.mark.asyncio
async def test_missing_market_data(monkeypatch):
    monkeypatch.setattr(stock_report, '_history', lambda symbol: pd.DataFrame())
    with pytest.raises(stock_report.MarketDataUnavailable):
        await stock_report.generate_report('TCS')


@pytest.mark.asyncio
async def test_ai_failure_falls_back(prices, monkeypatch):
    monkeypatch.setattr(settings, 'GROQ_API_KEY', 'test-only')
    monkeypatch.setattr(stock_report.httpx.AsyncClient, 'post', AsyncMock(side_effect=stock_report.httpx.ConnectError('offline')))
    result = await stock_report.generate_report('TCS')
    assert 'AI summary unavailable' in result.summary
    assert result.strength_score == 90


@pytest.mark.asyncio
async def test_generation_requires_login(client):
    response = await client.post('/api/stocks/analysis/trigger/TCS')
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_authenticated_report_endpoint(prices, client):
    from main import app
    from core.dependencies import get_current_user
    app.dependency_overrides[get_current_user] = lambda: object()
    response = await client.post('/api/stocks/analysis/trigger/TCS')
    assert response.status_code == 200
    data = response.json()['data']
    assert data['symbol'] == 'TCS'
    assert data['strength_score'] == 90
    saved = await client.get('/api/stocks/analysis/TCS')
    assert saved.json()['data']['summary'] == data['summary']
    invalid = await client.post('/api/stocks/analysis/trigger/AAPL.US')
    assert invalid.status_code == 422


@pytest.mark.asyncio
async def test_provider_failure_endpoint(client, monkeypatch):
    from main import app
    from core.dependencies import get_current_user
    app.dependency_overrides[get_current_user] = lambda: object()
    monkeypatch.setattr(stock_report, '_history', lambda symbol: pd.DataFrame())
    response = await client.post('/api/stocks/analysis/trigger/TCS')
    assert response.status_code == 503


@pytest.mark.asyncio
@pytest.mark.parametrize('content, expected', [
    ('{"summary":"The supplied price averages indicate a positive historical trend.","articles":[]}', 'AI-assisted technical report'),
    ('{"summary":42}', 'AI summary unavailable'),
    ('not json', 'AI summary unavailable'),
])
async def test_ai_response_validation(prices, monkeypatch, content, expected):
    monkeypatch.setattr(settings, 'GROQ_API_KEY', 'test-only')
    response = stock_report.httpx.Response(200, request=stock_report.httpx.Request('POST', 'https://example.test'),
        json={'choices': [{'message': {'content': content}}]})
    monkeypatch.setattr(stock_report.httpx.AsyncClient, 'post', AsyncMock(return_value=response))
    report = await stock_report.generate_report('TCS')
    assert expected in report.summary
    assert report.strength_score == 90
    assert report.sentiment == 'Unavailable'

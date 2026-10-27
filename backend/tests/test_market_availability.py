from unittest.mock import AsyncMock
import pytest
from services.stock import StockService


@pytest.mark.asyncio
async def test_missing_index_quotes_are_never_fabricated(monkeypatch):
    service = StockService(None)
    monkeypatch.setattr(service, 'fetch_stock_quotes_batch', AsyncMock(return_value={}))
    assert await service.get_live_indices() == []


@pytest.mark.asyncio
async def test_partial_index_response_contains_only_observed_values(monkeypatch):
    service = StockService(None)
    monkeypatch.setattr(service, 'fetch_stock_quotes_batch', AsyncMock(return_value={
        '^NSEI': {'price': 25000, 'change': 100, 'changePercent': 0.4},
    }))
    result = await service.get_live_indices()
    assert len(result) == 1
    assert result[0]['value'] == 25000

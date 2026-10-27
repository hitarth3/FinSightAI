import json
from unittest.mock import AsyncMock

import httpx
import pytest
from app.modules.expenses.grok_service import GrokService
from app.modules.expenses.ocr_service import OCRService
from core.config import settings


@pytest.mark.asyncio
async def test_rejected_google_key_falls_through_to_groq(monkeypatch):
    monkeypatch.setattr(settings, 'GOOGLE_API_KEY', 'invalid-fixture')
    monkeypatch.setattr(settings, 'GROK_API_KEY', None)
    monkeypatch.setattr(settings, 'GROQ_API_KEY', 'fixture')
    response = {'choices': [{'message': {'content': json.dumps({
        'merchant': 'Corner Shop', 'amount': 125.5, 'date': '2026-10-28', 'category': 'FOOD'
    })}}]}
    post = AsyncMock(side_effect=[httpx.Response(401), httpx.Response(200, json=response)])
    monkeypatch.setattr(httpx.AsyncClient, 'post', post)
    parsed = await GrokService.parse_receipt('Corner Shop\nTotal Rs 125.50\n28/10/2026')
    assert parsed['amount'] == 125.5
    assert parsed['merchant'] == 'Corner Shop'
    assert post.await_count == 2
    assert 'api.groq.com' in post.call_args.args[0]


@pytest.mark.asyncio
async def test_empty_ocr_never_calls_a_provider(monkeypatch):
    post = AsyncMock(side_effect=AssertionError('Empty OCR must not reach a provider'))
    monkeypatch.setattr(httpx.AsyncClient, 'post', post)
    result = await GrokService.parse_receipt('   ')
    assert result['confidence'] == 0
    assert result['amount'] == 0
    post.assert_not_called()


@pytest.mark.parametrize('name', ['swiggy', 'amazon', 'uber'])
def test_filename_never_fabricates_receipt_text(name):
    assert OCRService._get_fallback_text(f'{name}.jpg', f'{name}-receipt.jpg') == ''


@pytest.mark.parametrize('text,expected', [
    ('Swiggy\nTotal Rs 125.50', 125.5),
    ('Amazon\nOrder 43278\n28/10/2026', 0),
    ('Corner Shop\nSubtotal Rs 100\nGrand Total Rs 118.00', 118),
])
def test_local_parser_uses_actual_total(text, expected):
    assert GrokService._simulate_parsing(text)['amount'] == expected

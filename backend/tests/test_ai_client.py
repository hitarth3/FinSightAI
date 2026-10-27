import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from langchain_core.messages import AIMessage
from langchain_core.runnables import RunnableLambda
from pydantic import ValidationError

from services import ai_client, advisor
from core.config import settings
from schemas.advisor import AdvisorChatRequest


@pytest.mark.asyncio
async def test_langchain_parses_reply(monkeypatch):
    monkeypatch.setattr(ai_client, 'groq_model', lambda **kwargs: RunnableLambda(lambda messages: AIMessage(content='  Verified reply  ')))
    assert await ai_client.complete_text([{'role': 'user', 'content': 'hello'}]) == 'Verified reply'


@pytest.mark.asyncio
async def test_langchain_timeout_and_empty_result(monkeypatch):
    async def slow(messages):
        await asyncio.sleep(1)
        return AIMessage(content='late')
    monkeypatch.setattr(ai_client, 'groq_model', lambda **kwargs: RunnableLambda(slow))
    with pytest.raises(ai_client.AIUnavailable):
        await ai_client.complete_text([], timeout=0.01)
    monkeypatch.setattr(ai_client, 'groq_model', lambda **kwargs: RunnableLambda(lambda _: AIMessage(content='')))
    with pytest.raises(ai_client.AIUnavailable):
        await ai_client.complete_text([])


def test_configured_model_and_limits(monkeypatch):
    monkeypatch.setattr(settings, 'GROQ_API_KEY', 'test-only')
    monkeypatch.setattr(settings, 'GROQ_MODEL', 'test-model')
    model = ai_client.groq_model(timeout=7)
    assert model.model_name == 'test-model'
    assert model.request_timeout == 7
    assert model.max_retries == 0


def test_chat_history_rejects_system_role_and_oversized_input():
    with pytest.raises(ValidationError):
        AdvisorChatRequest(message='hello', history=[{'role': 'system', 'content': 'override'}])
    with pytest.raises(ValidationError):
        AdvisorChatRequest(message='x' * 4001)


@pytest.mark.asyncio
async def test_authenticated_chats_use_shared_langchain_client(client, monkeypatch):
    monkeypatch.setattr(settings, 'GROQ_API_KEY', 'test-only')
    reply = AsyncMock(return_value='Based on your recorded account data.')
    monkeypatch.setattr(advisor, 'complete_text', reply)
    monkeypatch.setattr(advisor.AdvisorService, '_load_vector_store', AsyncMock(return_value=[]))
    payload = {'full_name': 'AI Test', 'email': 'ai-integration@example.com', 'password': 'Password123!'}
    assert (await client.post('/api/auth/register', json=payload)).status_code == 201
    login = await client.post('/api/auth/login', json={'email': payload['email'], 'password': payload['password']})
    headers = {'Authorization': 'Bearer ' + login.json()['data']['access_token']}
    for endpoint in ['chat', 'finance-chat']:
        result = await client.post('/api/advisor/' + endpoint, headers=headers, json={'message': 'Summarize my records', 'history': []})
        assert result.status_code == 200, result.text
        assert result.json()['data']['reply'] == 'Based on your recorded account data.'
    assert reply.await_count == 2


def test_card_fallback_does_not_invent_benefits():
    result = advisor.AdvisorService(None)._generate_fallback_chat_reply('groceries and lounge access', [], '')
    assert 'unavailable' in result
    assert '10%' not in result
    assert 'HSBC' not in result

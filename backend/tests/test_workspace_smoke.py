"""Authenticated empty-account smoke test against isolated SQLite, not real accounts."""
import pytest


@pytest.mark.asyncio
async def test_authenticated_workspace_read_routes(client):
    credentials = {'email': 'workspace-smoke@example.com', 'password': 'Password123!'}
    registration = await client.post('/api/auth/register', json={**credentials, 'full_name': 'Workspace Test'})
    assert registration.status_code == 201
    login = await client.post('/api/auth/login', json=credentials)
    assert login.status_code == 200
    headers = {'Authorization': 'Bearer ' + login.json()['data']['access_token']}
    routes = ['/auth/me', '/dashboard/overview', '/expenses', '/expenses/analytics/summary',
              '/credit-cards', '/credit-card-summary', '/credit-card-insights',
              '/stocks', '/investments', '/loans', '/advisor/reward-analytics']
    for path in routes:
        result = await client.get('/api' + path, headers=headers)
        assert result.status_code == 200, (path, result.text)
        assert result.json()['success'] is True

"""Real database regression coverage for private receipt attachments."""
import uuid
from datetime import date

import pytest
from sqlalchemy import select
from models.user import User
from app.modules.expenses.models import Expense, ExpenseUpload, StatementImport
from app.modules.expenses import service


@pytest.mark.asyncio
@pytest.mark.parametrize('record_type', ['upload', 'expense', 'statement'])
async def test_private_files_and_thumbnails(client, db_session, tmp_path, monkeypatch, record_type):
    monkeypatch.setattr(service, 'UPLOAD_DIR', str(tmp_path))
    credentials = {'email': f'{record_type}@example.com', 'password': 'Password123!'}
    await client.post('/api/auth/register', json={**credentials, 'full_name': 'Receipt Owner'})
    login = await client.post('/api/auth/login', json=credentials)
    headers = {'Authorization': f"Bearer {login.json()['data']['access_token']}"}
    user = await db_session.scalar(select(User).where(User.email == credentials['email']))
    file_id = uuid.uuid4()
    original = f'{file_id}.jpg'
    thumbnail = f'thumbnails/{file_id}_thumb.png'
    prefix = '/api/expenses/uploads/'
    (tmp_path / 'thumbnails').mkdir()
    for name in (original, thumbnail):
        (tmp_path / name).write_bytes(b'private fixture')
    if record_type == 'upload':
        record = ExpenseUpload(id=file_id, user_id=user.id, file_name='receipt.jpg', file_url=prefix + original)
    elif record_type == 'expense':
        record = Expense(user_id=user.id, merchant='Fixture', amount=10, category='FOOD',
                         payment_method='CASH', expense_date=date.today(),
                         receipt_url=prefix + original, thumbnail_url=prefix + thumbnail)
    else:
        record = StatementImport(user_id=user.id, file_name='statement.jpg', file_url=prefix + original)
    db_session.add(record)
    await db_session.commit()
    allowed = [original] if record_type == 'statement' else [original, thumbnail]
    for name in allowed:
        for _ in range(2):
            response = await client.get(prefix + name, headers=headers)
            assert response.status_code == 200
            assert response.content == b'private fixture'
    other = {'email': 'outsider@example.com', 'password': 'Password123!'}
    await client.post('/api/auth/register', json={**other, 'full_name': 'Other User'})
    login = await client.post('/api/auth/login', json=other)
    other_headers = {'Authorization': f"Bearer {login.json()['data']['access_token']}"}
    for name in (original, thumbnail):
        assert (await client.get(prefix + name, headers=other_headers)).status_code == 404
        assert (await client.get(prefix + name)).status_code == 401
    (tmp_path / original).unlink()
    assert (await client.get(prefix + original, headers=headers)).status_code == 404

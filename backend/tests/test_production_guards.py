import pytest
from pydantic import ValidationError
from core.config import Settings, INSECURE_DEFAULT_SECRET_KEY
from app.modules.expenses.schemas import StatementTransactionUpdate


def production_settings(**overrides):
    values = dict(DEBUG=False, SECRET_KEY='a-unique-test-signing-key-with-32-characters', ENABLE_MFA=False,
                  CORS_ALLOWED_ORIGINS='https://finance.example.com', _env_file=None)
    values.update(overrides)
    return Settings(**values)


@pytest.mark.parametrize('secret', ['', 'short', INSECURE_DEFAULT_SECRET_KEY, 'your_secret_key_placeholder_for_production'])
def test_production_rejects_weak_or_placeholder_signing_keys(secret):
    with pytest.raises(ValidationError, match='SECRET_KEY'):
        production_settings(SECRET_KEY=secret)


def test_production_requires_explicit_origins():
    with pytest.raises(ValidationError, match='CORS_ALLOWED_ORIGINS'):
        production_settings(CORS_ALLOWED_ORIGINS='*')


def test_unimplemented_mfa_delivery_cannot_be_enabled_in_production():
    with pytest.raises(ValidationError, match='MFA delivery'):
        production_settings(ENABLE_MFA=True)


def test_valid_production_settings():
    assert production_settings().DEBUG is False


@pytest.mark.parametrize('amount', [float('inf'), float('nan'), -1, 0])
def test_statement_review_rejects_invalid_amounts(amount):
    with pytest.raises(ValidationError):
        StatementTransactionUpdate(amount=amount)


@pytest.mark.asyncio
async def test_failed_login_counter_persists_across_request_rollbacks(tmp_path):
    """Each request commits/rolls back as in production, without a shared test session."""
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from sqlalchemy import select
    from uuid import UUID
    from httpx import AsyncClient, ASGITransport
    from database.session import Base, get_db
    from main import app
    from models.user import User

    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'auth.db'}")
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async def request_db():
        async with factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    previous = app.dependency_overrides.get(get_db)
    app.dependency_overrides[get_db] = request_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
            registration = await client.post('/api/auth/register', json={
                'full_name': 'Persistent User', 'email': 'persistent@example.com', 'password': 'Password123!'
            })
            assert registration.status_code == 201
            for _ in range(2):
                response = await client.post('/api/auth/login', json={'email': 'persistent@example.com', 'password': 'incorrect'})
                assert response.status_code == 401
            async with factory() as session:
                user = (await session.execute(select(User).where(User.email == 'persistent@example.com'))).scalar_one()
                assert user.failed_login_attempts == 2
    finally:
        if previous is None:
            app.dependency_overrides.pop(get_db, None)
        else:
            app.dependency_overrides[get_db] = previous
        await engine.dispose()


async def sign_in(client, name):
    await client.post('/api/auth/register', json={'full_name': name, 'email': f'{name}@example.com', 'password': 'Password123!'})
    login = await client.post('/api/auth/login', json={'email': f'{name}@example.com', 'password': 'Password123!'})
    return login.json()['data']


@pytest.mark.asyncio
async def test_logout_revokes_access_and_refresh_tokens(client):
    tokens = await sign_in(client, 'logoutuser')
    headers = {'Authorization': f"Bearer {tokens['access_token']}"}
    assert (await client.get('/api/auth/me', headers=headers)).status_code == 200
    assert (await client.post('/api/auth/logout', json={'refresh_token': tokens['refresh_token']})).status_code == 200
    assert (await client.get('/api/auth/me', headers=headers)).status_code == 401
    assert (await client.post('/api/auth/refresh', json={'refresh_token': tokens['refresh_token']})).status_code == 401


@pytest.mark.asyncio
async def test_rotated_refresh_token_cannot_be_replayed(client):
    old_token = (await sign_in(client, 'rotateuser'))['refresh_token']
    response = await client.post('/api/auth/refresh', json={'refresh_token': old_token})
    assert response.status_code == 200
    new_token = response.json()['data']['refresh_token']
    assert new_token != old_token
    assert (await client.post('/api/auth/refresh', json={'refresh_token': old_token})).status_code == 401
    assert (await client.post('/api/auth/refresh', json={'refresh_token': new_token})).status_code == 200


@pytest.mark.asyncio
async def test_expenses_are_isolated_between_users(client):
    owner_token, other_token = await sign_in(client, 'owner'), await sign_in(client, 'other')
    owner = {'Authorization': f"Bearer {owner_token['access_token']}"}
    other = {'Authorization': f"Bearer {other_token['access_token']}"}
    response = await client.post('/api/expenses/manual', headers=owner, json={
        'amount': 45, 'merchant': 'Private merchant', 'category': 'FOOD', 'payment_method': 'UPI', 'expense_date': '2026-10-01'
    })
    assert response.status_code == 201
    expense_id = response.json()['data']['id']
    assert (await client.get('/api/expenses', headers=other)).json()['data'] == []
    assert (await client.delete(f'/api/expenses/{expense_id}', headers=other)).status_code == 404
    assert len((await client.get('/api/expenses', headers=owner)).json()['data']) == 1


@pytest.mark.asyncio
async def test_upload_uses_validated_type_not_untrusted_filename():
    from io import BytesIO
    from fastapi import UploadFile
    from starlette.datastructures import Headers
    from app.modules.expenses.uploads import read_validated_upload
    upload = UploadFile(BytesIO(b'%PDF-1.4\n'), filename='script.html', headers=Headers({'content-type': 'application/pdf'}))
    content, extension = await read_validated_upload(upload)
    assert extension == '.pdf'
    assert content.startswith(b'%PDF-')


@pytest.mark.asyncio
async def test_upload_rejects_mismatched_content():
    from io import BytesIO
    from fastapi import UploadFile, HTTPException
    from starlette.datastructures import Headers
    from app.modules.expenses.uploads import read_validated_upload
    upload = UploadFile(BytesIO(b'<html>invalid</html>'), filename='receipt.png', headers=Headers({'content-type': 'image/png'}))
    with pytest.raises(HTTPException) as error:
        await read_validated_upload(upload)
    assert error.value.status_code == 400


@pytest.mark.asyncio
async def test_upload_reads_at_most_limit_plus_one():
    from unittest.mock import AsyncMock
    from fastapi import HTTPException
    from app.modules.expenses.uploads import read_validated_upload, MAX_UPLOAD_BYTES
    upload = AsyncMock()
    upload.content_type = 'application/pdf'
    upload.read.return_value = b'x' * (MAX_UPLOAD_BYTES + 1)
    with pytest.raises(HTTPException) as error:
        await read_validated_upload(upload)
    assert error.value.status_code == 413
    upload.read.assert_awaited_once_with(MAX_UPLOAD_BYTES + 1)


@pytest.mark.asyncio
async def test_failed_otp_attempts_persist_between_requests(tmp_path):
    """Rejecting bad codes must consume the attempt limit across independent sessions."""
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from sqlalchemy import select
    from uuid import UUID
    from httpx import AsyncClient, ASGITransport
    from core.config import settings
    from database.session import Base, get_db
    from main import app
    from models.otp import OTPVerification

    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'otp.db'}")
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async def request_db():
        async with factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    previous_override = app.dependency_overrides.get(get_db)
    previous_mfa = settings.ENABLE_MFA
    app.dependency_overrides[get_db] = request_db
    settings.ENABLE_MFA = True
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
            await client.post('/api/auth/register', json={
                'full_name': 'OTP User', 'email': 'otp-user@example.com', 'password': 'Password123!'
            })
            response = await client.post('/api/auth/login', json={
                'email': 'otp-user@example.com', 'password': 'Password123!'
            })
            assert response.status_code == 200 and response.json()['data']['requires_mfa'] is True
            user_id = response.json()['data']['user_id']
            for attempt in range(settings.RATE_LIMIT_ATTEMPTS):
                rejected = await client.post('/api/auth/verify-otp', json={
                    'user_id': user_id, 'otp_code': '000000'
                })
                assert rejected.status_code == 400
            async with factory() as session:
                otp = (await session.execute(select(OTPVerification).where(OTPVerification.user_id == UUID(user_id)))).scalar_one()
                assert otp.is_used is True
                assert otp.attempts == settings.RATE_LIMIT_ATTEMPTS
    finally:
        settings.ENABLE_MFA = previous_mfa
        if previous_override is None:
            app.dependency_overrides.pop(get_db, None)
        else:
            app.dependency_overrides[get_db] = previous_override
        await engine.dispose()

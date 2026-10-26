import pytest
from httpx import AsyncClient
from sqlalchemy import select
from models.user import User


@pytest.mark.asyncio
async def test_register_and_login_success(client: AsyncClient, db_session) -> None:
    """Verifies standard registration, password hashing, and direct JWT login responses."""
    # 1. Register
    reg_payload = {
        "full_name": "Alice Smith",
        "email": "alice@finsight.ai",
        "password": "Password123!",
        "monthly_income": 85000.0,
        "risk_profile": "Aggressive"
    }
    
    response = await client.post("/api/auth/register", json=reg_payload)
    print("DEBUG REGISTER RESPONSE:", response.json())
    assert response.status_code == 201
    
    body = response.json()
    assert body["success"] is True
    assert body["message"] == "User registration completed successfully."
    assert body["data"]["email"] == "alice@finsight.ai"
    assert "id" in body["data"]

    # 2. Login (direct login since settings.ENABLE_MFA is False in testing conftest)
    login_payload = {
        "email": "alice@finsight.ai",
        "password": "Password123!",
        "device_name": "test-device"
    }
    
    login_resp = await client.post("/api/auth/login", json=login_payload)
    assert login_resp.status_code == 200
    
    login_body = login_resp.json()
    assert login_body["success"] is True
    assert login_body["data"]["requires_mfa"] is False
    assert "access_token" in login_body["data"]
    assert "refresh_token" in login_body["data"]


@pytest.mark.asyncio
async def test_login_incorrect_password(client: AsyncClient) -> None:
    """Asserts that wrong credentials yield standardized HTTP 401 response structures."""
    # Register user first
    reg_payload = {
        "full_name": "Bob Jones",
        "email": "bob@finsight.ai",
        "password": "Password123!"
    }
    await client.post("/api/auth/register", json=reg_payload)

    # Login with incorrect password
    login_payload = {
        "email": "bob@finsight.ai",
        "password": "WrongPassword123!"
    }
    response = await client.post("/api/auth/login", json=login_payload)
    assert response.status_code == 401
    
    body = response.json()
    assert body["success"] is False
    assert "Incorrect email or password." in body["message"]
    assert len(body["errors"]) > 0


@pytest.mark.asyncio
async def test_google_login_flow(client: AsyncClient) -> None:
    """Verifies that Google authentication works, registers user dynamically, and initializes session."""
    from unittest.mock import patch
    
    class MockResponse:
        def __init__(self, status_code, json_data):
            self.status_code = status_code
            self._json_data = json_data
        def json(self):
            return self._json_data

    async def mock_get(*args, **kwargs):
        from core.config import settings
        url = args[0] if len(args) > 0 else kwargs.get("url", "")
        if "oauth2.googleapis.com/tokeninfo" in url and "id_token=mock_valid_token" in url:
            return MockResponse(200, {
                "email": "alex.carter@google.com",
                "email_verified": "true",
                "aud": settings.GOOGLE_CLIENT_ID,
            })
        return MockResponse(400, {})

    with patch("httpx.AsyncClient.get", side_effect=mock_get):
        payload = {
            "token": "mock_valid_token",
            "email": "alex.carter@google.com",
            "device_name": "google-test"
        }
        response = await client.post("/api/auth/google", json=payload)
        print("DEBUG GOOGLE LOGIN RESP:", response.json())
        assert response.status_code == 200
        
        body = response.json()
        assert body["success"] is True
        assert body["data"]["requires_mfa"] is False
        assert "access_token" in body["data"]
        assert "refresh_token" in body["data"]


@pytest.mark.asyncio
async def test_google_login_rejects_wrong_audience(client: AsyncClient) -> None:
    """A Google ID token issued for a DIFFERENT application's client ID must be rejected."""
    from unittest.mock import patch

    class MockResponse:
        def __init__(self, status_code, json_data):
            self.status_code = status_code
            self._json_data = json_data
        def json(self):
            return self._json_data

    async def mock_get(*args, **kwargs):
        # Token is validly signed and current, but was issued for some other app.
        return MockResponse(200, {
            "email": "attacker@gmail.com",
            "email_verified": "true",
            "aud": "some-other-app.apps.googleusercontent.com",
        })

    with patch("httpx.AsyncClient.get", side_effect=mock_get):
        payload = {
            "token": "token_for_a_different_app",
            "email": "attacker@gmail.com",
            "device_name": "google-test"
        }
        response = await client.post("/api/auth/google", json=payload)
        assert response.status_code == 401
        assert response.json()["success"] is False


@pytest.mark.asyncio
async def test_login_locks_account_after_repeated_failures(client: AsyncClient) -> None:
    """After RATE_LIMIT_ATTEMPTS wrong passwords, the account should lock out further attempts."""
    from core.config import settings

    reg_payload = {
        "full_name": "Carol Lee",
        "email": "carol@finsight.ai",
        "password": "Password123!"
    }
    await client.post("/api/auth/register", json=reg_payload)

    wrong_login = {"email": "carol@finsight.ai", "password": "WrongPassword!"}
    for _ in range(settings.RATE_LIMIT_ATTEMPTS):
        resp = await client.post("/api/auth/login", json=wrong_login)
        assert resp.status_code == 401

    # One more attempt — even with the CORRECT password — should now be locked out.
    correct_login = {"email": "carol@finsight.ai", "password": "Password123!"}
    locked_resp = await client.post("/api/auth/login", json=correct_login)
    assert locked_resp.status_code == 401
    assert "locked" in locked_resp.json()["message"].lower()

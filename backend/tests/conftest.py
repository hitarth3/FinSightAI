import os
os.environ["DEBUG"] = "True"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
import asyncio
from typing import AsyncGenerator, Generator
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Force in-memory SQLite for testing to ensure lightning fast, database-isolated runs!
# SQLite is perfect for unit testing since it requires zero local Postgres setups.
from core.config import settings
settings.DATABASE_URL = "sqlite+aiosqlite:///:memory:"
settings.ENABLE_MFA = False # Simple tests
settings.GOOGLE_CLIENT_ID = "test-client-id.apps.googleusercontent.com"

from main import app
from database.session import Base, get_db

# Test Async engine for SQLite
test_engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False}
)

TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    class_=AsyncSession
)
app.state.db_session_factory = TestSessionLocal


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Creates a session-scoped event loop for async pytest routines."""
    policy = asyncio.get_event_loop_policy()
    loop = policy.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_db() -> AsyncGenerator[None, None]:
    """Generates all schemas in in-memory test database, dropping them on completion."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Yields a transactional database session rolled back after every test run."""
    async with test_engine.connect() as connection:
        transaction = await connection.begin()
        async with AsyncSession(bind=connection, expire_on_commit=False) as session:
            
            # Override FastAPI dependency injector
            async def _override_get_db():
                yield session
                
            app.dependency_overrides[get_db] = _override_get_db
            
            yield session
            
            await session.close()
        await transaction.rollback()
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def client(db_session) -> AsyncGenerator[AsyncClient, None]:
    """Yields an async HTTPX client pointing to our active FastAPI application."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

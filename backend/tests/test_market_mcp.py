"""Optional SDK tests, including a real stdio protocol handshake."""
import os
import sys
from pathlib import Path
from unittest.mock import AsyncMock

import pytest

pytest.importorskip('mcp')
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
import market_mcp


@pytest.mark.asyncio
async def test_registered_tool_calls_shared_engine(monkeypatch):
    snapshot = {'symbol': 'TCS', 'price': 100}
    handler = AsyncMock(return_value=snapshot)
    monkeypatch.setattr(market_mcp, 'market_snapshot', handler)
    result = await market_mcp.mcp.call_tool('get_market_snapshot', {'symbol': 'TCS'})
    handler.assert_awaited_once_with('TCS')
    assert 'TCS' in str(result)


@pytest.mark.asyncio
async def test_stdio_handshake_and_input_validation():
    backend = Path(__file__).resolve().parents[1]
    params = StdioServerParameters(command=sys.executable, args=[str(backend / 'market_mcp.py')],
                                   cwd=str(backend), env={**os.environ, 'DEBUG': 'True'})
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            listing = await session.list_tools()
            assert {tool.name for tool in listing.tools} == {'get_market_snapshot', 'generate_stock_report'}
            result = await session.call_tool('generate_stock_report', {'symbol': '../bad'})
            assert result.isError

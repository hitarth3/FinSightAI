"""Local stdio MCP tools. Shares the dashboard engine; no private account access."""
from mcp.server.fastmcp import FastMCP

from services.stock_report import generate_report, market_snapshot

mcp = FastMCP('FinSight Market Research')


@mcp.tool()
async def get_market_snapshot(symbol: str) -> dict:
    """Read adjusted daily NSE/BSE price metrics. Bare symbols use NSE."""
    return await market_snapshot(symbol)


@mcp.tool()
async def generate_stock_report(symbol: str) -> dict:
    """Generate price-based research with optional Groq narrative; does not save or trade."""
    report = await generate_report(symbol)
    return report.model_dump(mode='json')


if __name__ == '__main__':
    mcp.run(transport='stdio')

import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from database.session import get_db
from schemas.base import StandardResponse
from schemas.stock import StockCreate, StockResponse
from schemas.stock_analysis import StockAnalysisCreate, StockAnalysisResponse
from services.stock import StockService
from core.dependencies import get_current_user
from models.user import User

router = APIRouter(prefix="/stocks", tags=["Stocks Watchlist"])


@router.get("", response_model=StandardResponse[List[StockResponse]])
async def get_stocks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Retrieves all tracked stocks belonging to the authenticated user."""
    service = StockService(db)
    stocks = await service.get_user_stocks(current_user.id)
    return StandardResponse(
        success=True,
        message="Tracked stocks retrieved successfully.",
        data=[StockResponse.model_validate(stk) for stk in stocks]
    )


@router.post("", response_model=StandardResponse[StockResponse], status_code=status.HTTP_201_CREATED)
async def track_stock(
    payload: StockCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Tracks a new stock in the user's portfolio."""
    service = StockService(db)
    stock = await service.create_stock(current_user.id, payload.model_dump())
    return StandardResponse(
        success=True,
        message="Stock tracked successfully.",
        data=StockResponse.model_validate(stock)
    )


@router.delete("/{id}", response_model=StandardResponse[None])
async def untrack_stock(
    id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Deletes a tracked stock record by ID."""
    service = StockService(db)
    deleted = await service.delete_stock(id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tracked stock record not found.")
    return StandardResponse(
        success=True,
        message="Tracked stock untracked successfully."
    )


@router.get("/news/{symbol}", response_model=StandardResponse[List[Dict[str, Any]]])
async def get_news(
    symbol: str,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Simulates market feed queries fetching stock-specific news."""
    service = StockService(db)
    news = await service.get_stock_news(symbol)
    return StandardResponse(
        success=True,
        message=f"Market news retrieved for {symbol.upper()}.",
        data=news
    )


@router.get("/sentiment/{symbol}", response_model=StandardResponse[Dict[str, Any]])
async def get_sentiment(
    symbol: str,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Placeholder AI sentiment scanning module."""
    service = StockService(db)
    sentiment = await service.get_stock_sentiment(symbol)
    return StandardResponse(
        success=True,
        message=f"AI sentiment calculation completed for {symbol.upper()}.",
        data=sentiment
    )


@router.get("/market/indices", response_model=StandardResponse[List[Dict[str, Any]]])
async def get_market_indices(
    refresh: bool = False,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Retrieves live stock market index quotes from Yahoo Finance."""
    service = StockService(db)
    data = await service.get_live_indices(force_refresh=refresh)
    return StandardResponse(
        success=True,
        message="Market indices retrieved successfully.",
        data=data
    )


@router.get("/market/movers", response_model=StandardResponse[Dict[str, Any]])
async def get_market_movers(
    refresh: bool = False,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Retrieves live top gainers, losers, and most active stocks."""
    service = StockService(db)
    data = await service.get_live_market_movers(force_refresh=refresh)
    return StandardResponse(
        success=True,
        message="Market movers retrieved successfully.",
        data=data
    )


@router.get("/market/quotes", response_model=StandardResponse[Dict[str, Any]])
async def get_stock_quotes_batch(
    symbols: str,
    refresh: bool = False,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Retrieves live stock quotes for a comma-separated list of symbols in batch."""
    symbols_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    if not symbols_list:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Symbols parameter cannot be empty.")
        
    service = StockService(db)
    try:
        data = await service.fetch_stock_quotes_batch(symbols_list, force_refresh=refresh)
        return StandardResponse(
            success=True,
            message=f"Live quotes for {len(data)} symbols retrieved.",
            data=data
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch batch quotes: {str(e)}"
        )


@router.get("/market/quote/{symbol}", response_model=StandardResponse[Dict[str, Any]])
async def get_stock_quote(
    symbol: str,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Retrieves live prices and historical intraday chart points for a stock."""
    service = StockService(db)
    try:
        symbol_upper = symbol.strip().upper()
        # Use batch cache system for single quote fetches too
        data = await service.fetch_stock_quotes_batch([symbol_upper])
        if symbol_upper in data:
            return StandardResponse(
                success=True,
                message=f"Live quote for {symbol_upper} retrieved.",
                data=data[symbol_upper]
            )
        # Fallback to direct chart fetch if not in batch response
        fallback = await service.fetch_yahoo_chart(symbol)
        return StandardResponse(
            success=True,
            message=f"Live quote for {symbol_upper} retrieved.",
            data=fallback
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch live quote from Yahoo: {str(e)}"
        )


@router.get("/market/search", response_model=StandardResponse[List[Dict[str, Any]]])
async def search_market_stocks(
    q: str,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Queries Yahoo Autocomplete suggestion list, filtering for Indian tickers."""
    service = StockService(db)
    data = await service.fetch_yahoo_search(q)
    return StandardResponse(
        success=True,
        message=f"Found {len(data)} suggestions.",
        data=data
    )


@router.get("/analysis/{symbol}", response_model=StandardResponse[Optional[StockAnalysisResponse]])
async def get_latest_stock_analysis(
    symbol: str,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Retrieves the latest saved AI analysis from database for history reloads."""
    service = StockService(db)
    analysis = await service.get_latest_analysis(symbol)
    return StandardResponse(
        success=True,
        message=f"Latest analysis for {symbol.upper()} retrieved.",
        data=StockAnalysisResponse.model_validate(analysis) if analysis else None
    )


@router.post("/analysis", response_model=StandardResponse[StockAnalysisResponse], status_code=status.HTTP_201_CREATED)
async def save_stock_analysis(
    payload: StockAnalysisCreate,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Saves a new AI analysis report to the Supabase database."""
    service = StockService(db)
    analysis = await service.create_analysis(payload.model_dump())
    return StandardResponse(
        success=True,
        message="AI stock analysis saved successfully.",
        data=StockAnalysisResponse.model_validate(analysis)
    )


@router.post("/analysis/trigger/{symbol}", response_model=StandardResponse[Dict[str, Any]])
async def trigger_stock_analysis(
    symbol: str,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Triggers the live n8n webhook analysis from backend proxy to avoid client CORS constraints."""
    service = StockService(db)
    try:
        data = await service.trigger_n8n_analysis(symbol)
        return StandardResponse(
            success=True,
            message=f"n8n AI Analysis trigger succeeded for {symbol.upper()}.",
            data=data
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

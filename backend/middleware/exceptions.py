import logging
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from core.config import settings

logger = logging.getLogger(__name__)


def register_exception_handlers(app: FastAPI) -> None:
    """Mounts global handlers converting exceptions into unified standardized JSON layouts."""
    
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        detail_msg = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "message": detail_msg,
                "detail": detail_msg,
                "errors": [detail_msg]
            }
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        errors = []
        for error in exc.errors():
            loc = " -> ".join(str(x) for x in error.get("loc", []))
            errors.append(f"[{loc}]: {error.get('msg')}")
            
        summary = errors[0] if errors else "Validation error occurred."
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "message": summary,
                "detail": summary,
                "errors": errors
            }
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.error(f"Unhandled system crash: {exc}", exc_info=True)
        # Never leak raw internal exception text (DB errors, stack details, file
        # paths) to API consumers in production — only the server log gets it.
        err_str = str(exc) if settings.DEBUG else "An unexpected error occurred. Please try again later."
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "message": err_str,
                "detail": err_str,
                "errors": [err_str]
            }
        )

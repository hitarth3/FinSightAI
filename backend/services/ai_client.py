"""Shared LangChain Groq integration with bounded requests and validated output."""
import asyncio
from typing import Any

from langchain_core.output_parsers import StrOutputParser
from langchain_groq import ChatGroq

from core.config import settings


class AIUnavailable(RuntimeError):
    pass


def groq_model(*, temperature: float = 0.2, max_tokens: int = 2200, timeout: float = 20) -> ChatGroq:
    if not settings.GROQ_API_KEY:
        raise AIUnavailable('Groq is not configured.')
    return ChatGroq(model=settings.GROQ_MODEL, api_key=settings.GROQ_API_KEY,
                    temperature=temperature, max_tokens=max_tokens,
                    timeout=timeout, max_retries=0)


async def complete_text(messages: list[dict[str, Any]], *, temperature: float = 0.2,
                        max_tokens: int = 2200, timeout: float = 20) -> str:
    chain = groq_model(temperature=temperature, max_tokens=max_tokens, timeout=timeout) | StrOutputParser()
    try:
        result = await asyncio.wait_for(chain.ainvoke(messages), timeout=timeout)
    except Exception as exc:
        raise AIUnavailable('AI response is temporarily unavailable.') from exc
    if not isinstance(result, str) or not result.strip():
        raise AIUnavailable('AI returned an empty response.')
    return result.strip()

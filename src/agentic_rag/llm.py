"""LLM factory with a provider abstraction.

A single env var (``LLM_PROVIDER``) swaps the underlying chat model between:

* **huggingface** - free serverless inference via ``langchain-huggingface``
* **groq**        - generous free tier, OpenAI-compatible, very fast
* **ollama**      - fully local / offline

Returning a ``BaseChatModel`` keeps every downstream chain provider-agnostic.
"""

from __future__ import annotations

import logging

from langchain_core.language_models import BaseChatModel

from .config import Settings, get_settings

logger = logging.getLogger(__name__)


def get_llm(
    settings: Settings | None = None,
    *,
    temperature: float | None = None,
    max_new_tokens: int | None = None,
) -> BaseChatModel:
    """Build the configured chat model.

    Args:
        settings: Optional settings override (defaults to the cached singleton).
        temperature: Override sampling temperature for this instance.
        max_new_tokens: Override the max generated tokens for this instance.
    """
    settings = settings or get_settings()
    temperature = settings.llm_temperature if temperature is None else temperature
    max_new_tokens = settings.llm_max_new_tokens if max_new_tokens is None else max_new_tokens
    provider = settings.llm_provider.lower().strip()

    if provider == "huggingface":
        return _huggingface_chat(settings, temperature, max_new_tokens)
    if provider == "groq":
        return _groq_chat(settings, temperature, max_new_tokens)
    if provider == "ollama":
        return _ollama_chat(settings, temperature, max_new_tokens)

    raise ValueError(
        f"Unknown LLM_PROVIDER={provider!r}. Use one of: huggingface, groq, ollama."
    )


def _huggingface_chat(settings: Settings, temperature: float, max_new_tokens: int) -> BaseChatModel:
    from langchain_huggingface import ChatHuggingFace, HuggingFaceEndpoint

    if not settings.hf_token:
        logger.warning("HF_TOKEN is empty - Hugging Face inference will likely fail with 401.")

    endpoint_kwargs = {
        "repo_id": settings.llm_model,
        "task": "text-generation",
        "huggingfacehub_api_token": settings.hf_token,
        "max_new_tokens": max_new_tokens,
        # HF text-generation endpoints require a strictly positive temperature.
        "temperature": max(float(temperature), 1e-2),
        "repetition_penalty": 1.03,
    }
    provider = (settings.hf_provider or "").strip().lower()
    if provider and provider != "none":
        endpoint_kwargs["provider"] = settings.hf_provider

    try:
        endpoint = HuggingFaceEndpoint(**endpoint_kwargs)
    except TypeError:
        # Older langchain-huggingface without the `provider` kwarg.
        endpoint_kwargs.pop("provider", None)
        endpoint = HuggingFaceEndpoint(**endpoint_kwargs)

    return ChatHuggingFace(llm=endpoint)


def _groq_chat(settings: Settings, temperature: float, max_new_tokens: int) -> BaseChatModel:
    try:
        from langchain_groq import ChatGroq
    except ImportError as exc:  # pragma: no cover - optional dependency
        raise ImportError(
            "Groq provider selected but langchain-groq is not installed. "
            "Run: pip install langchain-groq"
        ) from exc

    return ChatGroq(
        model=settings.groq_model,
        api_key=settings.groq_api_key,
        temperature=temperature,
        max_tokens=max_new_tokens,
    )


def _ollama_chat(settings: Settings, temperature: float, max_new_tokens: int) -> BaseChatModel:
    try:
        from langchain_ollama import ChatOllama
    except ImportError as exc:  # pragma: no cover - optional dependency
        raise ImportError(
            "Ollama provider selected but langchain-ollama is not installed. "
            "Run: pip install langchain-ollama"
        ) from exc

    return ChatOllama(
        model=settings.ollama_model,
        base_url=settings.ollama_base_url,
        temperature=temperature,
        num_predict=max_new_tokens,
    )

"""LangSmith tracing setup.

LangChain/LangGraph emit traces automatically when the right environment
variables are present. This module flips them on from our typed settings so the
rest of the code never touches ``os.environ`` directly.
"""

from __future__ import annotations

import logging
import os

from .config import Settings, get_settings

logger = logging.getLogger(__name__)


def setup_tracing(settings: Settings | None = None) -> bool:
    """Enable LangSmith tracing if configured. Returns whether it was enabled.

    Safe to call multiple times (e.g. from API startup and the eval script).
    """
    settings = settings or get_settings()

    if not settings.langsmith_tracing or not settings.langsmith_api_key:
        os.environ["LANGSMITH_TRACING"] = "false"
        os.environ["LANGCHAIN_TRACING_V2"] = "false"
        logger.info("LangSmith tracing disabled (no key / flag off).")
        return False

    # Newer SDK env vars
    os.environ["LANGSMITH_TRACING"] = "true"
    os.environ["LANGSMITH_API_KEY"] = settings.langsmith_api_key
    os.environ["LANGSMITH_PROJECT"] = settings.langsmith_project
    os.environ["LANGSMITH_ENDPOINT"] = settings.langsmith_endpoint
    # Back-compat aliases still honoured by parts of the ecosystem
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_API_KEY"] = settings.langsmith_api_key
    os.environ["LANGCHAIN_PROJECT"] = settings.langsmith_project
    os.environ["LANGCHAIN_ENDPOINT"] = settings.langsmith_endpoint

    logger.info("LangSmith tracing enabled (project=%s).", settings.langsmith_project)
    return True

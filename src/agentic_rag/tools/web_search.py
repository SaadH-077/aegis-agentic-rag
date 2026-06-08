"""Web search tool.

Two providers, chosen automatically:
* **Tavily** (if ``TAVILY_API_KEY`` is set) — reliable, free-tier, LLM-oriented.
* **DuckDuckGo** via ``ddgs`` — keyless default / fallback, with a retry.

Both return LangChain ``Document`` objects so web hits flow through the same
grading + generation path as vector-store hits. Failures never raise — they log
and return ``[]`` so a web-search turn degrades gracefully.
"""

from __future__ import annotations

import logging

import requests
from langchain_core.documents import Document

logger = logging.getLogger(__name__)

TAVILY_URL = "https://api.tavily.com/search"


def _get_ddgs():
    """Import DDGS from whichever package version is installed."""
    try:
        from ddgs import DDGS  # new package name

        return DDGS
    except ImportError:
        from duckduckgo_search import DDGS  # legacy name

        return DDGS


class WebSearchTool:
    """Resilient web search exposing ``.invoke(query) -> list[Document]``."""

    def __init__(self, max_results: int = 4, tavily_api_key: str | None = None) -> None:
        self.max_results = max_results
        self.tavily_api_key = tavily_api_key

    def invoke(self, query: str) -> list[Document]:
        return self.search(query)

    def search(self, query: str) -> list[Document]:
        if self.tavily_api_key:
            docs = self._tavily(query)
            if docs:
                return docs
            logger.warning("Tavily returned no results; falling back to DuckDuckGo.")
        return self._duckduckgo(query)

    # -- providers -----------------------------------------------------------
    def _tavily(self, query: str) -> list[Document]:
        try:
            resp = requests.post(
                TAVILY_URL,
                json={
                    "api_key": self.tavily_api_key,
                    "query": query,
                    "max_results": self.max_results,
                    "search_depth": "basic",
                },
                timeout=20,
            )
            resp.raise_for_status()
            results = resp.json().get("results", [])
        except Exception as exc:  # noqa: BLE001
            logger.warning("Tavily search failed: %s", exc)
            return []
        return [
            Document(
                page_content=f"{r.get('title', '')}\n{r.get('content', '')}".strip(),
                metadata={
                    "source": r.get("url", "web"),
                    "title": r.get("title", ""),
                    "origin": "web_search",
                },
            )
            for r in results
        ]

    def _duckduckgo(self, query: str) -> list[Document]:
        documents: list[Document] = []
        for attempt in range(2):
            try:
                ddgs_cls = _get_ddgs()
                with ddgs_cls() as ddgs:
                    results = list(ddgs.text(query, region="wt-wt", max_results=self.max_results))
                for rank, result in enumerate(results):
                    title = result.get("title", "")
                    body = result.get("body") or result.get("snippet") or ""
                    href = result.get("href") or result.get("url") or "web"
                    documents.append(
                        Document(
                            page_content=f"{title}\n{body}".strip(),
                            metadata={
                                "source": href,
                                "title": title,
                                "origin": "web_search",
                                "rank": rank,
                            },
                        )
                    )
                if documents:
                    return documents
            except Exception as exc:  # noqa: BLE001 - import/network/rate-limit
                logger.warning("DuckDuckGo attempt %d failed: %s", attempt + 1, exc)
        return documents

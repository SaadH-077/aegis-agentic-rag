"""FastAPI backend exposing the agent over HTTP.

Endpoints
---------
GET  /health                      -> liveness + non-secret config summary
POST /ask                         -> run one turn (may return needs_approval)
POST /resume                      -> resume a paused (HITL) turn
GET  /threads/{thread_id}/history -> conversation history for a thread

The agent is provided via a dependency (``get_agent``) so tests can override it
with a fake using ``app.dependency_overrides`` — no network needed in CI.
"""

from __future__ import annotations

import contextlib
import json
import logging
import uuid
from collections.abc import Iterator
from functools import lru_cache

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .. import __version__
from ..config import get_settings
from ..graph.build import AgenticRAGAgent, build_agent
from .schemas import (
    AskRequest,
    AskResponse,
    HealthResponse,
    HistoryResponse,
    ResumeRequest,
)

logger = logging.getLogger(__name__)


@lru_cache
def _agent_singleton() -> AgenticRAGAgent:
    """Build the agent once per process (cached). Not cached on failure."""
    return build_agent()


def get_agent() -> AgenticRAGAgent:
    """Dependency that yields the agent, mapping missing-index to a clean 503."""
    try:
        return _agent_singleton()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


def create_app() -> FastAPI:
    app = FastAPI(
        title="Agentic RAG Assistant",
        version=__version__,
        description=(
            "Adaptive, self-correcting RAG agent built with LangChain, LangGraph "
            "and LangSmith. Routes questions, grades retrieval, falls back to web "
            "search (with human approval), and self-checks its answers."
        ),
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health", response_model=HealthResponse, tags=["meta"])
    def health() -> HealthResponse:
        return HealthResponse(
            status="ok",
            version=__version__,
            config=get_settings().provider_summary(),
        )

    @app.get("/stats", tags=["meta"])
    def stats(agent: AgenticRAGAgent = Depends(get_agent)) -> dict:
        """Live system telemetry for the UI: model, KB size, index size, tracing."""
        s = get_settings()
        kb_docs = 0
        vectors = 0
        with contextlib.suppress(Exception):
            kb_docs = len(list(s.corpus_path.glob("*.md")))
        with contextlib.suppress(Exception):
            vectors = int(agent.retriever.vectorstore.index.ntotal)
        return {
            **s.provider_summary(),
            "kb_docs": kb_docs,
            "vectors": vectors,
            "retriever_k": s.retriever_k,
            "chunk_size": s.chunk_size,
            "chunk_overlap": s.chunk_overlap,
            "max_retries": s.max_retries,
            "web_search_approval": str(s.require_web_search_approval),
        }

    @app.get("/prompts", tags=["meta"])
    def prompts_catalog() -> dict:
        """The agent's real system prompts, grouped by reasoning step.

        Powers the in-app transparency viewer — the persona and the anti-
        hallucination grounding rules are inspectable artifacts, not hidden
        strings.
        """
        from ..prompts import prompt_catalog

        return {"prompts": prompt_catalog()}

    @app.post("/ask", response_model=AskResponse, tags=["agent"])
    def ask(req: AskRequest, agent: AgenticRAGAgent = Depends(get_agent)) -> dict:
        thread_id = req.thread_id or uuid.uuid4().hex
        try:
            return agent.ask(req.question, thread_id=thread_id)
        except Exception as exc:  # noqa: BLE001
            logger.exception("ask failed")
            raise HTTPException(status_code=500, detail=f"Agent error: {exc}") from exc

    @app.post("/resume", response_model=AskResponse, tags=["agent"])
    def resume(req: ResumeRequest, agent: AgenticRAGAgent = Depends(get_agent)) -> dict:
        try:
            return agent.resume(req.thread_id, req.approve)
        except Exception as exc:  # noqa: BLE001
            logger.exception("resume failed")
            raise HTTPException(status_code=500, detail=f"Agent error: {exc}") from exc

    @app.get(
        "/threads/{thread_id}/history",
        response_model=HistoryResponse,
        tags=["agent"],
    )
    def history(thread_id: str, agent: AgenticRAGAgent = Depends(get_agent)) -> dict:
        return {"thread_id": thread_id, "messages": agent.get_history(thread_id)}

    @app.post("/stream", tags=["agent"])
    def stream(req: AskRequest, agent: AgenticRAGAgent = Depends(get_agent)) -> StreamingResponse:
        """Server-Sent Events: emits one event per graph node as the agent runs,
        then a final 'complete' (or 'interrupt') event. Powers the live 3D UI."""
        thread_id = req.thread_id or uuid.uuid4().hex

        def gen() -> Iterator[str]:
            yield _sse({"type": "start", "thread_id": thread_id})
            try:
                for event in agent.stream(req.question, thread_id=thread_id):
                    yield _sse(event)
            except Exception as exc:  # noqa: BLE001 - surface as an SSE error event
                logger.exception("stream failed")
                yield _sse({"type": "error", "detail": str(exc)})

        return StreamingResponse(gen(), media_type="text/event-stream", headers=_SSE_HEADERS)

    @app.post("/resume/stream", tags=["agent"])
    def resume_stream(
        req: ResumeRequest, agent: AgenticRAGAgent = Depends(get_agent)
    ) -> StreamingResponse:
        """SSE variant of /resume: streams the remaining traversal after approval."""

        def gen() -> Iterator[str]:
            yield _sse({"type": "start", "thread_id": req.thread_id})
            try:
                for event in agent.stream_resume(req.thread_id, req.approve):
                    yield _sse(event)
            except Exception as exc:  # noqa: BLE001
                logger.exception("resume stream failed")
                yield _sse({"type": "error", "detail": str(exc)})

        return StreamingResponse(gen(), media_type="text/event-stream", headers=_SSE_HEADERS)

    return app


_SSE_HEADERS = {"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"}


def _sse(event: dict) -> str:
    """Format a dict as a Server-Sent Event frame."""
    return f"data: {json.dumps(event)}\n\n"


app = create_app()

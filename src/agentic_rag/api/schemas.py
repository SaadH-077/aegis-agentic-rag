"""Pydantic request/response models for the HTTP API (the OpenAPI contract)."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, examples=["What is corrective RAG?"])
    thread_id: str | None = Field(
        default=None,
        description="Conversation id. Omit to start a new conversation.",
    )


class ResumeRequest(BaseModel):
    thread_id: str = Field(..., description="The paused conversation to resume.")
    approve: bool = Field(..., description="Human decision for the pending action.")


class Citation(BaseModel):
    source: str
    snippet: str
    origin: str = "vectorstore"


class AskResponse(BaseModel):
    status: Literal["complete", "needs_approval"]
    thread_id: str
    answer: str | None = None
    route: str | None = None
    web_search_used: bool = False
    citations: list[Citation] = Field(default_factory=list)
    steps: list[str] = Field(default_factory=list)
    # Present only when status == "needs_approval": the interrupt payload to show
    # the user before they approve/deny via /resume.
    interrupt: dict[str, Any] | None = None


class HistoryMessage(BaseModel):
    role: str
    content: str


class HistoryResponse(BaseModel):
    thread_id: str
    messages: list[HistoryMessage]


class HealthResponse(BaseModel):
    status: str
    version: str
    config: dict[str, str]

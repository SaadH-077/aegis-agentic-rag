"""Pydantic schemas for the LLM's *structured* reasoning steps.

These models are the contract for each grading / routing decision in the graph.
We parse them with ``PydanticOutputParser`` (prompt-engineered JSON) rather than
native function-calling, because open-weight models served over free inference
do not reliably support OpenAI-style tool-calling. The nodes always wrap parsing
in a try/except with a safe default, so a malformed response never crashes the
graph.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class RouteQuery(BaseModel):
    """Route a user question to the most relevant datasource."""

    datasource: Literal["vectorstore", "web_search", "general"] = Field(
        description=(
            "Choose 'vectorstore' for core AI/ML engineering topics; "
            "'web_search' for recent events, news, or anything outside the "
            "knowledge base; or 'general' for greetings, small talk, or "
            "questions about the assistant itself (what it is / what it can do)."
        )
    )
    reasoning: str = Field(
        default="",
        description="One short sentence explaining the routing choice.",
    )


class GradeDocuments(BaseModel):
    """Binary relevance score for a single retrieved document."""

    binary_score: Literal["yes", "no"] = Field(
        description="'yes' if the document is relevant to the question, else 'no'."
    )


class GradeHallucinations(BaseModel):
    """Binary score for whether a generation is grounded in the facts."""

    binary_score: Literal["yes", "no"] = Field(
        description="'yes' if the answer is supported by the given facts, else 'no'."
    )


class GradeAnswer(BaseModel):
    """Binary score for whether an answer resolves the question."""

    binary_score: Literal["yes", "no"] = Field(
        description="'yes' if the answer addresses the question, else 'no'."
    )

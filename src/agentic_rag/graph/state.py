"""The graph's shared state.

Every key written by any node MUST be declared here (LangGraph routes updates
through these channels). ``messages`` uses the ``add_messages`` reducer so
conversation history accumulates across turns on the same thread (memory); all
other fields use the default "overwrite" reducer and are reset each new turn by
the values passed into ``ask()``.
"""

from __future__ import annotations

from typing import Annotated, Literal, TypedDict

from langchain_core.documents import Document
from langchain_core.messages import AnyMessage
from langgraph.graph.message import add_messages


class GraphState(TypedDict, total=False):
    # --- Conversation memory (persists across turns via the checkpointer) ----
    messages: Annotated[list[AnyMessage], add_messages]

    # --- Current turn --------------------------------------------------------
    original_question: str  # raw user input this turn
    question: str  # working question (may be contextualised / rewritten)
    generation: str  # the model's answer
    documents: list[Document]  # current working set of context docs

    # --- Control / routing flags --------------------------------------------
    datasource: Literal["vectorstore", "web_search", ""]
    web_search_needed: bool
    web_search_approved: bool | None
    generation_grade: Literal["useful", "not_supported", "not_useful", "give_up", ""]
    retries: int

    # --- Observability -------------------------------------------------------
    steps: list[str]  # ordered trace of visited nodes (shown in UI/API)
    timings: list[dict]  # per-node wall-clock latency: [{"node": str, "ms": float}]

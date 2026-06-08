"""Shared pytest fixtures.

The whole suite runs OFFLINE: no LLM provider, no embeddings, no network. We
construct the real compiled LangGraph agent but swap every chain / retriever /
web-search for a deterministic fake, so we exercise the actual graph wiring,
routing logic, HITL interrupt, and self-correction loop without any API calls.
"""

from __future__ import annotations

import pytest
from langchain_core.documents import Document
from langchain_core.language_models.fake_chat_models import FakeListChatModel
from langchain_core.runnables import RunnableLambda

from agentic_rag import schemas
from agentic_rag.config import Settings
from agentic_rag.graph.build import AgenticRAGAgent


def const_runnable(value):
    """A Runnable that ignores its input and always returns *value*."""
    return RunnableLambda(lambda _input, _v=value: _v)


class FakeWebSearch:
    """Stand-in for WebSearchTool exposing ``.invoke(query) -> list[Document]``."""

    def __init__(self, docs: list[Document] | None = None) -> None:
        self.docs = docs if docs is not None else [
            Document(
                page_content="Web result discussing the topic in question.",
                metadata={"source": "https://example.com/article", "origin": "web_search"},
            )
        ]

    def invoke(self, query: str) -> list[Document]:
        return list(self.docs)


@pytest.fixture
def base_settings() -> Settings:
    return Settings(
        enable_web_search=True,
        require_web_search_approval=True,
        max_retries=1,
        retriever_k=2,
        langsmith_tracing=False,
    )


@pytest.fixture
def make_agent(base_settings):
    """Factory building a fully-deterministic agent for a given scenario."""

    def _make(
        *,
        datasource: str = "vectorstore",
        doc_score: str = "yes",
        grounded: str = "yes",
        answers: str = "yes",
        require_approval: bool = True,
        retriever_docs: list[Document] | None = None,
        web_docs: list[Document] | None = None,
    ) -> AgenticRAGAgent:
        settings = base_settings.model_copy(
            update={"require_web_search_approval": require_approval}
        )
        docs = retriever_docs if retriever_docs is not None else [
            Document(
                page_content="Corrective RAG grades retrieved documents for relevance.",
                metadata={"source": "agentic-rag-patterns.md"},
            )
        ]
        agent = AgenticRAGAgent(
            retriever=const_runnable(docs),
            llm=FakeListChatModel(responses=["unused"]),
            web_search=FakeWebSearch(web_docs),
            settings=settings,
        )
        # Override every reasoning step with a deterministic stub.
        agent.contextualizer = RunnableLambda(lambda x: x["question"])
        agent.router = const_runnable(
            schemas.RouteQuery(datasource=datasource, reasoning="stub")
        )
        agent.doc_grader = const_runnable(schemas.GradeDocuments(binary_score=doc_score))
        agent.generator = const_runnable(
            "This is a grounded answer about corrective RAG [agentic-rag-patterns.md]."
        )
        agent.hallucination_grader = const_runnable(
            schemas.GradeHallucinations(binary_score=grounded)
        )
        agent.answer_grader = const_runnable(schemas.GradeAnswer(binary_score=answers))
        agent.query_rewriter = RunnableLambda(lambda x: "rewritten query")
        agent.direct_answer_chain = RunnableLambda(
            lambda x: "Hi, I'm AEGIS - an agentic RAG assistant."
        )
        return agent

    return _make

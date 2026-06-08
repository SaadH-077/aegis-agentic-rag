"""LCEL chain wiring: prompt | llm | parser produces validated objects.

Uses FakeListChatModel (canned responses) so there are no network calls — we are
testing that the chains parse model output into the right types, not the model.
"""

from __future__ import annotations

from langchain_core.language_models.fake_chat_models import FakeListChatModel

from agentic_rag import chains, schemas


def test_router_chain_parses_structured_output():
    fake = FakeListChatModel(responses=['{"datasource": "web_search", "reasoning": "recent"}'])
    chain = chains.build_router_chain(fake)
    out = chain.invoke({"question": "what happened today?"})
    assert isinstance(out, schemas.RouteQuery)
    assert out.datasource == "web_search"


def test_doc_grader_chain_parses_binary_score():
    fake = FakeListChatModel(responses=['{"binary_score": "no"}'])
    chain = chains.build_doc_grader_chain(fake)
    out = chain.invoke({"document": "irrelevant text", "question": "q"})
    assert isinstance(out, schemas.GradeDocuments)
    assert out.binary_score == "no"


def test_hallucination_chain_parses():
    fake = FakeListChatModel(responses=['{"binary_score": "yes"}'])
    out = chains.build_hallucination_chain(fake).invoke({"documents": "d", "generation": "g"})
    assert out.binary_score == "yes"


def test_generation_chain_returns_text():
    fake = FakeListChatModel(responses=["A concise, grounded answer."])
    chain = chains.build_generation_chain(fake)
    out = chain.invoke({"context": "some context", "question": "explain"})
    assert isinstance(out, str)
    assert "grounded" in out


def test_query_rewriter_returns_text():
    fake = FakeListChatModel(responses=["improved standalone query"])
    out = chains.build_query_rewriter_chain(fake).invoke({"question": "vague q"})
    assert "query" in out

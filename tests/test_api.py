"""FastAPI endpoint tests using a fake agent via dependency_overrides."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from agentic_rag.api.main import app, get_agent


class FakeAgent:
    def __init__(self, mode: str = "complete") -> None:
        self.mode = mode

    def ask(self, question: str, thread_id: str = "default") -> dict:
        if self.mode == "needs_approval":
            return {
                "status": "needs_approval",
                "thread_id": thread_id,
                "interrupt": {
                    "type": "web_search_approval",
                    "message": "Approve a web search?",
                    "question": question,
                },
                "answer": None,
                "route": "web_search",
                "web_search_used": False,
                "citations": [],
                "steps": ["route_question", "web_gate"],
            }
        return {
            "status": "complete",
            "thread_id": thread_id,
            "interrupt": None,
            "answer": f"Answer to: {question}",
            "route": "vectorstore",
            "web_search_used": False,
            "citations": [{"source": "rag.md", "snippet": "snippet", "origin": "vectorstore"}],
            "steps": ["retrieve", "generate", "finalize"],
        }

    def resume(self, thread_id: str, approve: bool) -> dict:
        return {
            "status": "complete",
            "thread_id": thread_id,
            "interrupt": None,
            "answer": "Resumed answer",
            "route": "web_search",
            "web_search_used": bool(approve),
            "citations": [],
            "steps": ["web_search", "generate", "finalize"],
        }

    def get_history(self, thread_id: str) -> list[dict]:
        return [
            {"role": "user", "content": "hi"},
            {"role": "assistant", "content": "hello"},
        ]

    def stream(self, question: str, thread_id: str = "default"):
        if self.mode == "needs_approval":
            yield {"type": "node", "node": "route_question", "steps": ["route_question"]}
            yield {
                "type": "interrupt",
                "thread_id": thread_id,
                "interrupt": {"type": "web_search_approval", "message": "Approve?"},
            }
            return
        yield {"type": "node", "node": "retrieve", "steps": ["retrieve"]}
        yield {"type": "node", "node": "generate", "steps": ["retrieve", "generate"]}
        yield {
            "type": "complete",
            "thread_id": thread_id,
            "answer": f"Answer to: {question}",
            "route": "vectorstore",
            "web_search_used": False,
            "citations": [],
            "steps": ["retrieve", "generate", "finalize"],
        }

    def stream_resume(self, thread_id: str, approve: bool):
        yield {"type": "node", "node": "web_search", "steps": ["web_search"]}
        yield {
            "type": "complete",
            "thread_id": thread_id,
            "answer": "Resumed",
            "web_search_used": bool(approve),
        }


@pytest.fixture(autouse=True)
def _clear_overrides():
    yield
    app.dependency_overrides.clear()


def _override(mode: str):
    app.dependency_overrides[get_agent] = lambda: FakeAgent(mode)


def test_health_ok():
    client = TestClient(app)
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert "llm_provider" in body["config"]


def test_ask_returns_complete_answer():
    _override("complete")
    client = TestClient(app)
    resp = client.post("/ask", json={"question": "What is RAG?"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "complete"
    assert "RAG" in body["answer"]
    assert body["citations"][0]["source"] == "rag.md"


def test_ask_then_resume_flow():
    _override("needs_approval")
    client = TestClient(app)
    resp = client.post("/ask", json={"question": "latest news"})
    body = resp.json()
    assert body["status"] == "needs_approval"
    assert body["interrupt"]["type"] == "web_search_approval"

    resume = client.post(
        "/resume", json={"thread_id": body["thread_id"], "approve": True}
    )
    rbody = resume.json()
    assert rbody["status"] == "complete"
    assert rbody["web_search_used"] is True


def test_ask_validation_error_on_empty_question():
    _override("complete")
    client = TestClient(app)
    resp = client.post("/ask", json={"question": ""})
    assert resp.status_code == 422  # pydantic min_length


def test_history_endpoint():
    _override("complete")
    client = TestClient(app)
    resp = client.get("/threads/abc123/history")
    assert resp.status_code == 200
    body = resp.json()
    assert body["thread_id"] == "abc123"
    assert len(body["messages"]) == 2


def test_stream_endpoint_emits_sse_events():
    _override("complete")
    client = TestClient(app)
    with client.stream("POST", "/stream", json={"question": "What is RAG?"}) as resp:
        assert resp.status_code == 200
        assert "text/event-stream" in resp.headers["content-type"]
        body = "".join(resp.iter_text())
    assert '"type": "start"' in body
    assert '"type": "complete"' in body
    assert "Answer to: What is RAG?" in body

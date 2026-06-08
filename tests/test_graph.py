"""End-to-end graph behaviour with deterministic fakes.

These tests drive the *real* compiled LangGraph agent and assert its control
flow: routing, corrective web fallback, the human-in-the-loop interrupt/resume,
the self-correction retry loop terminating, and conversation memory.
"""

from __future__ import annotations

HAPPY_PATH_NODES = [
    "contextualize",
    "route_question",
    "retrieve",
    "grade_documents",
    "generate",
    "grade_generation",
    "finalize",
]


def test_vectorstore_happy_path(make_agent):
    agent = make_agent()
    result = agent.ask("What is corrective RAG?", thread_id="happy")

    assert result["status"] == "complete"
    assert result["answer"]
    assert result["route"] == "vectorstore"
    assert result["web_search_used"] is False
    for node in HAPPY_PATH_NODES:
        assert node in result["steps"], f"expected {node} in {result['steps']}"
    assert result["citations"][0]["source"] == "agentic-rag-patterns.md"


def test_general_route_answers_directly(make_agent):
    # Greetings / "what can you do" should answer directly, skipping retrieval.
    agent = make_agent(datasource="general")
    result = agent.ask("hi, what can you do?", thread_id="general")

    assert result["status"] == "complete"
    assert result["route"] == "general"
    assert "direct_answer" in result["steps"]
    assert "retrieve" not in result["steps"]
    assert result["answer"]


def test_corrective_fallback_to_web(make_agent):
    # No relevant docs -> rewrite query -> (approval off) -> web search.
    agent = make_agent(doc_score="no", require_approval=False)
    result = agent.ask("an out-of-corpus question", thread_id="crag")

    assert result["status"] == "complete"
    assert "transform_query" in result["steps"]
    assert "web_search" in result["steps"]
    assert result["web_search_used"] is True


def test_hitl_pauses_then_approves(make_agent):
    agent = make_agent(datasource="web_search", require_approval=True)

    paused = agent.ask("breaking news today", thread_id="hitl-yes")
    assert paused["status"] == "needs_approval"
    assert paused["interrupt"]["type"] == "web_search_approval"

    resumed = agent.resume("hitl-yes", approve=True)
    assert resumed["status"] == "complete"
    assert resumed["web_search_used"] is True
    assert "web_search" in resumed["steps"]


def test_hitl_deny_skips_web(make_agent):
    agent = make_agent(datasource="web_search", require_approval=True)

    paused = agent.ask("breaking news today", thread_id="hitl-no")
    assert paused["status"] == "needs_approval"

    resumed = agent.resume("hitl-no", approve=False)
    assert resumed["status"] == "complete"
    assert resumed["web_search_used"] is False
    assert "web_search" not in resumed["steps"]


def test_self_correction_loop_terminates(make_agent):
    # Generation is never grounded -> regenerate -> bounded by max_retries -> give up.
    agent = make_agent(grounded="no")
    result = agent.ask("explain something", thread_id="selfcorrect")

    assert result["status"] == "complete"  # always terminates
    assert result["steps"].count("generate") >= 2  # it actually retried


def test_conversation_memory_accumulates(make_agent):
    agent = make_agent()
    agent.ask("What is RAG?", thread_id="mem")
    agent.ask("How does corrective RAG differ?", thread_id="mem")

    history = agent.get_history("mem")
    assert len(history) == 4
    assert [m["role"] for m in history] == ["user", "assistant", "user", "assistant"]


def test_threads_are_isolated(make_agent):
    agent = make_agent()
    agent.ask("first thread question", thread_id="A")
    agent.ask("second thread question", thread_id="B")

    assert len(agent.get_history("A")) == 2
    assert len(agent.get_history("B")) == 2


def test_stream_emits_nodes_then_complete(make_agent):
    agent = make_agent()
    events = list(agent.stream("What is corrective RAG?", thread_id="stream-ok"))

    assert events[-1]["type"] == "complete"
    assert events[-1]["answer"]
    node_names = [e["node"] for e in events if e["type"] == "node"]
    assert "retrieve" in node_names and "finalize" in node_names


def test_stream_interrupts_then_resumes(make_agent):
    agent = make_agent(datasource="web_search", require_approval=True)

    events = list(agent.stream("breaking news today", thread_id="stream-hitl"))
    assert any(e["type"] == "interrupt" for e in events)
    assert events[-1]["type"] == "interrupt"  # stops at the gate, no 'complete'

    resumed = list(agent.stream_resume("stream-hitl", approve=True))
    assert resumed[-1]["type"] == "complete"
    assert resumed[-1]["web_search_used"] is True
    assert any(e.get("node") == "web_search" for e in resumed)

"""Streamlit chat UI for the Agentic RAG Assistant.

A thin client over the FastAPI backend. It demonstrates the full experience:
streaming-style chat, the routing/citations/step trace for transparency, and the
human-in-the-loop approval flow (Approve / Deny a web search) driven by the
graph's ``interrupt()``.

Run the API first, then:  ``streamlit run app/streamlit_app.py``
"""

from __future__ import annotations

import os
import uuid

import requests
import streamlit as st

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
TIMEOUT = 120

st.set_page_config(page_title="Agentic RAG Assistant", page_icon="🧠", layout="wide")


# --------------------------------------------------------------------------- #
# API helpers                                                                 #
# --------------------------------------------------------------------------- #
def api_get(path: str):
    try:
        resp = requests.get(f"{API_BASE_URL}{path}", timeout=10)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException:
        return None


def api_post(path: str, payload: dict):
    try:
        resp = requests.post(f"{API_BASE_URL}{path}", json=payload, timeout=TIMEOUT)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as exc:
        detail = ""
        if exc.response is not None:
            try:
                detail = exc.response.json().get("detail", "")
            except Exception:  # noqa: BLE001
                detail = exc.response.text
        return {"_error": str(exc), "_detail": detail}


# --------------------------------------------------------------------------- #
# Session state                                                               #
# --------------------------------------------------------------------------- #
if "thread_id" not in st.session_state:
    st.session_state.thread_id = uuid.uuid4().hex
if "messages" not in st.session_state:
    st.session_state.messages = []  # [{role, content, meta?}]
if "pending" not in st.session_state:
    st.session_state.pending = None  # interrupt payload awaiting a decision


def reset_conversation() -> None:
    st.session_state.thread_id = uuid.uuid4().hex
    st.session_state.messages = []
    st.session_state.pending = None


# --------------------------------------------------------------------------- #
# Rendering                                                                   #
# --------------------------------------------------------------------------- #
def render_meta(meta: dict) -> None:
    route = meta.get("route") or "n/a"
    web = "yes" if meta.get("web_search_used") else "no"
    with st.expander(f"How I answered  ·  route: {route}  ·  web search: {web}"):
        steps = meta.get("steps") or []
        if steps:
            st.markdown("**Graph path**")
            st.code(" → ".join(steps), language="text")
        citations = meta.get("citations") or []
        if citations:
            st.markdown("**Sources**")
            for c in citations:
                origin = c.get("origin", "vectorstore")
                tag = "🌐" if origin == "web_search" else "📄"
                st.markdown(f"{tag} **{c.get('source','?')}** — {c.get('snippet','')}")


def handle_response(resp: dict | None) -> None:
    if resp is None or resp.get("_error"):
        detail = (resp or {}).get("_detail") or (resp or {}).get("_error") or "unknown error"
        st.session_state.messages.append(
            {"role": "assistant", "content": f"⚠️ Backend error: {detail}"}
        )
        return

    if resp.get("status") == "needs_approval":
        st.session_state.pending = resp.get("interrupt") or {
            "message": "Approve a web search?"
        }
        return

    st.session_state.messages.append(
        {
            "role": "assistant",
            "content": resp.get("answer") or "_(no answer returned)_",
            "meta": {
                "route": resp.get("route"),
                "web_search_used": resp.get("web_search_used"),
                "steps": resp.get("steps", []),
                "citations": resp.get("citations", []),
            },
        }
    )


# --------------------------------------------------------------------------- #
# Sidebar                                                                      #
# --------------------------------------------------------------------------- #
with st.sidebar:
    st.title("🧠 Agentic RAG")
    st.caption("Adaptive · Corrective · Self-checking")

    health = api_get("/health")
    if health:
        st.success("Backend online")
        cfg = health.get("config", {})
        st.markdown(
            f"**LLM:** `{cfg.get('llm_provider')}` · `{cfg.get('llm_model')}`\n\n"
            f"**Embeddings:** `{cfg.get('embeddings_mode')}`\n\n"
            f"**Web search:** `{cfg.get('web_search')}` · "
            f"**LangSmith:** `{cfg.get('langsmith')}`"
        )
    else:
        st.error(f"Backend offline at {API_BASE_URL}.\nStart it with `make api`.")

    st.divider()
    if st.button("🆕 New conversation", use_container_width=True):
        reset_conversation()
        st.rerun()
    st.caption(f"thread: `{st.session_state.thread_id[:8]}`")

    st.divider()
    st.markdown(
        "**Try asking**\n"
        "- What is corrective RAG?\n"
        "- How does LangGraph handle human-in-the-loop?\n"
        "- Explain multi-head attention.\n"
        "- What metrics evaluate a RAG system?"
    )

# --------------------------------------------------------------------------- #
# Main chat                                                                    #
# --------------------------------------------------------------------------- #
st.title("Agentic RAG Assistant")
st.caption(
    "Ask about transformers, RAG, LangChain, LangGraph, LangSmith, embeddings, "
    "agents, and LLM evaluation. The agent routes, grades, self-corrects — and "
    "asks before searching the web."
)

for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])
        if msg.get("meta"):
            render_meta(msg["meta"])

# Human-in-the-loop approval gate
if st.session_state.pending:
    info = st.session_state.pending
    with st.chat_message("assistant"):
        st.warning(info.get("message", "Approve a web search?"))
        col1, col2 = st.columns(2)
        if col1.button("✅ Approve web search", use_container_width=True):
            resp = api_post(
                "/resume", {"thread_id": st.session_state.thread_id, "approve": True}
            )
            st.session_state.pending = None
            handle_response(resp)
            st.rerun()
        if col2.button("❌ Deny", use_container_width=True):
            resp = api_post(
                "/resume", {"thread_id": st.session_state.thread_id, "approve": False}
            )
            st.session_state.pending = None
            handle_response(resp)
            st.rerun()

prompt = st.chat_input(
    "Ask a question…", disabled=st.session_state.pending is not None
)
if prompt:
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.spinner("Thinking — routing, retrieving, grading, generating…"):
        resp = api_post(
            "/ask", {"question": prompt, "thread_id": st.session_state.thread_id}
        )
    handle_response(resp)
    st.rerun()

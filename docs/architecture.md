# Architecture & Design

This document explains *how* the Agentic RAG Assistant works and *why* it is
built the way it is. The README has the quickstart; this is the engineering
deep-dive.

## 1. The big picture

```
Browser ──► Next.js 3D UI ──► Node.js BFF ──SSE──► FastAPI ──► LangGraph agent
                                                                   │
                            ┌──────────────────────────────────────┼───────────────┐
                            ▼                  ▼                     ▼               ▼
                        FAISS store     Hugging Face LLM       DuckDuckGo       LangSmith
                        (retrieval)     + embeddings           (web fallback)   (trace/eval)
```

Two front-ends share one backend:
- **`web/`** — the flagship Next.js + Node.js app that renders the agent graph
  in 3D and animates it live via Server-Sent Events.
- **`app/streamlit_app.py`** — a zero-build Streamlit UI for instant demos.

The backend ([`src/agentic_rag/`](../src/agentic_rag)) is a single Python package
exposing the agent over a FastAPI REST + SSE API.

## 2. The agent: Adaptive + Corrective + Self-RAG

The agent is a LangGraph `StateGraph` ([`graph/build.py`](../src/agentic_rag/graph/build.py)).
Nodes are methods on `AgenticRAGAgent`, which makes the whole thing injectable
and testable. The flow combines three published patterns:

| Pattern | Where it lives | What it buys |
| --- | --- | --- |
| **Adaptive RAG** | `route_question` + `_route_decider` | Sends in-corpus questions to the vector store, out-of-scope ones to the web |
| **Corrective RAG** | `grade_documents` → `transform_query` → `web_search` | Discards irrelevant retrievals; rewrites the query and falls back to web search when the KB is weak |
| **Self-RAG** | `grade_generation` (hallucination + answer graders) | Verifies the answer is grounded *and* on-topic; loops to regenerate or re-retrieve |

### State

`GraphState` ([`graph/state.py`](../src/agentic_rag/graph/state.py)) is a `TypedDict`.
The key design point is the **reducers**:
- `messages` uses `add_messages` → conversation history **accumulates** across
  turns on the same `thread_id` (memory).
- Everything else uses the default overwrite reducer and is **reset** each turn
  by the fresh input dict, so a new question starts clean while memory persists.

### Node-by-node

| Node | Responsibility |
| --- | --- |
| `contextualize` | If there's prior history, rewrite the latest question into a standalone one (history-aware retrieval). Skipped on the first turn to save a call. |
| `route_question` | LLM router → `vectorstore` or `web_search`. |
| `retrieve` | Similarity search against FAISS. |
| `grade_documents` | Per-doc binary relevance grade; keep relevant. If none survive, flag a web fallback. |
| `transform_query` | Rewrite the query for better retrieval / search. |
| `web_gate` | **Human-in-the-loop**: `interrupt()` to ask for approval before searching the web. Skipped if approval isn't required or already granted. |
| `web_search` | Keyless DuckDuckGo search; results join the context as `Document`s. |
| `generate` | LCEL RAG generation, context-only, with inline citations. |
| `grade_generation` | Hallucination grader (grounded in docs?) + answer grader (resolves the question?). Increments the retry counter; decides `useful` / `not_supported` / `not_useful` / `give_up`. |
| `finalize` | Commit the answer to memory (one AI message per turn) and end. |

### Loops & termination

`grade_generation` can route back to `generate` (regenerate when ungrounded) or
`transform_query` (re-retrieve when off-topic). A retry counter bounded by
`MAX_RETRIES` flips the decision to `give_up → finalize`, guaranteeing
termination. A LangGraph `recursion_limit` is a second safety net.

### Human-in-the-loop

`web_gate` calls `interrupt({...})`. The graph pauses (state persisted by the
`MemorySaver` checkpointer) and `invoke`/`stream` surfaces an `__interrupt__`.
The caller collects an approve/deny decision and resumes with
`Command(resume=bool)`, which becomes the return value of `interrupt()` inside
the node. This is why a checkpointer is mandatory and why every request carries
a `thread_id`.

## 3. Streaming (how the web lights up live)

`agent.stream()` wraps `graph.stream(..., stream_mode="updates")` and yields one
event per node as it executes, then a final `complete` (or `interrupt`) event.
The FastAPI `/stream` endpoint serializes these as SSE frames. The Node.js BFF
([`web/app/api/stream/route.ts`](../web/app/api/stream/route.ts)) pipes the SSE
straight through to the browser, where [`useAgent.ts`](../web/lib/useAgent.ts)
parses frames and updates `activeNode` / `visited`. Because node ids match the
3D topology in [`graphTopology.ts`](../web/lib/graphTopology.ts), the right web
node glows at the right moment.

## 4. Why these implementation choices

- **Prompt-engineered JSON, not native tool-calling.** `ChatHuggingFace` exposes
  `bind_tools`/`with_structured_output`, but they assume OpenAI-style
  tool-calling, which open-weight models on free inference implement
  inconsistently. So structured steps are `prompt | llm | PydanticOutputParser`,
  and every grading node defaults to a safe value on a parse error — a malformed
  response degrades gracefully instead of crashing the graph.
- **API embeddings by default (no torch).** `HuggingFaceEndpointEmbeddings` runs
  on HF's servers, so the base install has no `torch` and downloads no models —
  a direct answer to a real disk constraint. `EMBEDDINGS_MODE=local` is a
  documented opt-in.
- **Provider abstraction.** [`llm.py`](../src/agentic_rag/llm.py) returns a
  `BaseChatModel` for HF / Groq / Ollama. Everything downstream is
  provider-agnostic; switching is one env var. This also makes the free-tier
  cost trade-off explicit and adjustable.
- **In-memory LLM cache.** Identical calls are cached in-process to conserve
  free-tier credits.
- **Injectable agent.** Chains, retriever, and web search are constructor args /
  swappable attributes, so the offline test suite drives the *real* compiled
  graph with deterministic fakes.

## 5. Request lifecycle (a worked example)

A question that isn't in the knowledge base, with HITL on:

1. `contextualize` → `route_question` decides `vectorstore`.
2. `retrieve` returns chunks; `grade_documents` finds none relevant → flags web.
3. `transform_query` rewrites the query → `web_gate` **interrupts**.
4. UI shows *Approve / Deny*. User approves → `Command(resume=true)`.
5. `web_search` fetches results → `generate` answers from them.
6. `grade_generation`: grounded ✔ + answers ✔ → `finalize` → `END`.
7. The 3D web has lit up `route → retrieve → grade_documents → transform_query →
   web_gate → web_search → generate → grade_generation → finalize` in sequence.

## 6. Testing strategy

The suite ([`tests/`](../tests)) is fully offline. It builds `AgenticRAGAgent`
with a fake chat model and `RunnableLambda` stubs for each chain, then asserts
the compiled graph's behavior: happy path, corrective fallback, HITL
approve/deny, self-correction termination, memory accumulation, thread
isolation, streaming, and every API endpoint (via FastAPI `TestClient` +
`dependency_overrides`). No network, no keys — ideal for CI.

## 7. Evaluation strategy

Offline evaluation ([`eval/`](../eval)) treats quality as measurable: a curated
LangSmith dataset + three LLM-as-judge evaluators (correctness, groundedness,
relevance). Each run is a comparable experiment, so a prompt or model change can
be checked for regressions before shipping.

"""The Agentic RAG state machine (Adaptive + Corrective RAG, with HITL).

Graph shape::

    START
      v
    contextualize        # make the question standalone using chat history (memory)
      v
    route_question  --(web)-->  web_gate ...                # router: KB vs web
      |(vectorstore)
      v
    retrieve
      v
    grade_documents --(need web)--> transform_query --> web_gate
      |(docs ok)                                            |(approved)
      v                                                     v
    generate  <----------------------------------------- web_search
      v                                                     |(denied)
    grade_generation --(useful/give_up)--> finalize --> END |
      |  ^ (not_supported -> regenerate)                    |
      |  ` (not_useful -> transform_query)                  |
      `----------------------------------------------------`

* **Adaptive** — a router sends KB questions to the vector store and out-of-scope
  questions to the web.
* **Corrective** — retrieved docs are graded; if none are relevant the agent
  rewrites the query and (with human approval) falls back to web search.
* **Self-correcting** — the answer is graded for *groundedness* (no hallucination)
  and for *whether it actually answers the question*; failures trigger a bounded
  retry loop.
* **Human-in-the-loop** — ``web_gate`` calls ``interrupt()`` to pause for approval
  before touching the web; the caller resumes with ``Command(resume=...)``.

The nodes are methods on :class:`AgenticRAGAgent`, which makes the whole thing
trivially testable: inject a fake retriever / fake chains and drive the compiled
graph with zero network calls.
"""

from __future__ import annotations

import contextlib
import logging
import time
from collections.abc import Callable

from langchain_core.caches import InMemoryCache
from langchain_core.documents import Document
from langchain_core.globals import set_llm_cache
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.runnables import Runnable
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt

from ..chains import (
    build_answer_grader_chain,
    build_contextualize_chain,
    build_direct_answer_chain,
    build_doc_grader_chain,
    build_fallback_answer_chain,
    build_generation_chain,
    build_hallucination_chain,
    build_query_rewriter_chain,
    build_router_chain,
)
from ..config import Settings, get_settings
from ..embeddings import get_embeddings
from ..llm import get_llm
from ..tools import WebSearchTool
from ..tracing import setup_tracing
from ..vectorstore import load_vectorstore
from .state import GraphState

logger = logging.getLogger(__name__)

_MAX_SNIPPET = 240


class AgenticRAGAgent:
    """Compiles and drives the adaptive/corrective RAG graph."""

    def __init__(
        self,
        retriever: Runnable,
        *,
        llm: BaseChatModel | None = None,
        web_search: object | None = None,
        settings: Settings | None = None,
        checkpointer: object | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self.retriever = retriever
        self.llm = llm or get_llm(self.settings)
        self.web_search = web_search or WebSearchTool(
            max_results=self.settings.web_search_results,
            tavily_api_key=self.settings.tavily_api_key,
        )

        # LCEL chains (attributes so tests can swap any single step) ----------
        self.router = build_router_chain(self.llm)
        self.doc_grader = build_doc_grader_chain(self.llm)
        self.generator = build_generation_chain(self.llm)
        self.hallucination_grader = build_hallucination_chain(self.llm)
        self.answer_grader = build_answer_grader_chain(self.llm)
        self.query_rewriter = build_query_rewriter_chain(self.llm)
        self.contextualizer = build_contextualize_chain(self.llm)
        self.direct_answer_chain = build_direct_answer_chain(self.llm)
        self.fallback_answer_chain = build_fallback_answer_chain(self.llm)

        self.checkpointer = checkpointer or MemorySaver()
        self.graph = self._build_graph()

    # ====================================================================== #
    #  Public interface                                                      #
    # ====================================================================== #
    def ask(self, question: str, thread_id: str = "default") -> dict:
        """Run one turn. Returns a payload dict (see ``_result_payload``)."""
        result = self.graph.invoke(self._fresh_inputs(question), self._config(thread_id))
        return self._result_payload(result, thread_id)

    def resume(self, thread_id: str, approve: bool) -> dict:
        """Resume a graph paused at the human-approval interrupt."""
        result = self.graph.invoke(Command(resume=bool(approve)), self._config(thread_id))
        return self._result_payload(result, thread_id)

    def stream(self, question: str, thread_id: str = "default"):
        """Yield events as the graph executes, node-by-node (for live UIs/SSE).

        Event shapes:
          {"type": "node", "node": <name>, "steps": [...]}
          {"type": "interrupt", "thread_id": ..., "interrupt": {...}}
          {"type": "complete", ...full result payload...}
        """
        yield from self._run_stream(self._fresh_inputs(question), thread_id)

    def stream_resume(self, thread_id: str, approve: bool):
        """Resume a paused turn, streaming the remaining node traversal."""
        yield from self._run_stream(Command(resume=bool(approve)), thread_id)

    def get_history(self, thread_id: str) -> list[dict]:
        """Return the conversation history persisted for *thread_id*."""
        snapshot = self.graph.get_state(self._config(thread_id))
        messages = snapshot.values.get("messages", []) if snapshot else []
        return [
            {"role": "user" if m.type == "human" else "assistant", "content": m.content}
            for m in messages
        ]

    @staticmethod
    def _config(thread_id: str) -> dict:
        return {"configurable": {"thread_id": thread_id}, "recursion_limit": 50}

    @staticmethod
    def _fresh_inputs(question: str) -> dict:
        """Initial state for a new turn (transient fields reset; messages append)."""
        return {
            "messages": [HumanMessage(content=question)],
            "question": question,
            "original_question": question,
            "documents": [],
            "generation": "",
            "datasource": "",
            "web_search_needed": False,
            "web_search_approved": None,
            "generation_grade": "",
            "retries": 0,
            "steps": [],
            "timings": [],
        }

    def _timed(self, name: str, fn: Callable[[GraphState], dict]) -> Callable[[GraphState], dict]:
        """Wrap a node so every execution records its wall-clock latency.

        Timings accumulate on the ``timings`` channel using the same
        read-prev-and-append pattern as ``steps`` — so the final state carries an
        ordered, per-node latency trace (including the all-important retrieval and
        generation times) that the UI renders as a performance breakdown.
        """

        def wrapped(state: GraphState) -> dict:
            start = time.perf_counter()
            result = fn(state)  # GraphInterrupt (HITL) propagates without a timing
            elapsed_ms = round((time.perf_counter() - start) * 1000, 1)
            prior = state.get("timings", [])
            if isinstance(result, dict):
                return {**result, "timings": [*prior, {"node": name, "ms": elapsed_ms}]}
            return result

        return wrapped

    def _run_stream(self, graph_input, thread_id: str):
        config = self._config(thread_id)
        interrupted = False
        for chunk in self.graph.stream(graph_input, config, stream_mode="updates"):
            if not isinstance(chunk, dict):
                continue
            if "__interrupt__" in chunk:
                interrupted = True
                payload = chunk["__interrupt__"]
                first = payload[0] if isinstance(payload, list | tuple) else payload
                yield {
                    "type": "interrupt",
                    "thread_id": thread_id,
                    "interrupt": getattr(first, "value", first),
                }
                continue
            for node, update in chunk.items():
                steps = update.get("steps", []) if isinstance(update, dict) else []
                yield {"type": "node", "node": node, "steps": steps}
        if not interrupted:
            yield self._final_event_from_state(thread_id)

    def _final_event_from_state(self, thread_id: str) -> dict:
        snapshot = self.graph.get_state(self._config(thread_id))
        values = dict(snapshot.values) if snapshot else {}
        payload = self._result_payload(values, thread_id)
        payload["type"] = "complete"
        return payload

    # ====================================================================== #
    #  Nodes                                                                 #
    # ====================================================================== #
    def contextualize(self, state: GraphState) -> dict:
        """Rewrite the latest question as standalone using prior turns (memory)."""
        steps = self._trace(state, "contextualize")
        messages = state.get("messages", [])
        question = state.get("question") or (messages[-1].content if messages else "")
        prior = messages[:-1]  # everything before the just-added human message
        if not prior:
            return {"question": question, "original_question": question, "steps": steps}
        try:
            standalone = self.contextualizer.invoke(
                {"chat_history": self._format_history(prior), "question": question}
            ).strip()
            if standalone:
                question = standalone
        except Exception as exc:  # noqa: BLE001 - never let memory rewriting break a turn
            logger.warning("contextualize failed: %s", exc)
        return {"question": question, "steps": steps}

    def route_question(self, state: GraphState) -> dict:
        steps = self._trace(state, "route_question")
        datasource = "vectorstore"
        try:
            datasource = self.router.invoke({"question": state["question"]}).datasource
        except Exception as exc:  # noqa: BLE001
            logger.warning("router failed, defaulting to vectorstore: %s", exc)
        return {"datasource": datasource, "steps": steps}

    def direct_answer(self, state: GraphState) -> dict:
        """Answer greetings / identity / capability questions without retrieval."""
        steps = self._trace(state, "direct_answer")
        try:
            text = self.direct_answer_chain.invoke({"question": state["question"]})
        except Exception as exc:  # noqa: BLE001
            logger.warning("direct answer failed: %s", exc)
            text = (
                "Hi, I'm AEGIS - an agentic RAG assistant. I can answer questions "
                "about AI/ML engineering from my knowledge base, or search the live "
                "web for current information (with your approval). Try asking 'What "
                "is corrective RAG?' or 'What are the latest LLM releases this month?'"
            )
        generation = text if isinstance(text, str) else str(text)
        return {"generation": generation.strip(), "datasource": "general", "steps": steps}

    def retrieve(self, state: GraphState) -> dict:
        steps = self._trace(state, "retrieve")
        documents = list(self.retriever.invoke(state["question"]))
        return {"documents": documents, "datasource": "vectorstore", "steps": steps}

    def grade_documents(self, state: GraphState) -> dict:
        """Keep only relevant docs; flag a web fallback if none survive."""
        steps = self._trace(state, "grade_documents")
        question = state["question"]
        relevant: list[Document] = []
        for doc in state.get("documents", []):
            try:
                score = self.doc_grader.invoke(
                    {"document": doc.page_content, "question": question}
                ).binary_score
                if score.lower() == "yes":
                    relevant.append(doc)
            except Exception as exc:  # noqa: BLE001 - on parse error, keep the doc (lenient)
                logger.warning("doc grader failed, keeping doc: %s", exc)
                relevant.append(doc)
        web_needed = len(relevant) == 0 and self.settings.enable_web_search
        return {"documents": relevant, "web_search_needed": web_needed, "steps": steps}

    def transform_query(self, state: GraphState) -> dict:
        steps = self._trace(state, "transform_query")
        question = state["question"]
        try:
            rewritten = self.query_rewriter.invoke({"question": question}).strip()
            if rewritten:
                question = rewritten
        except Exception as exc:  # noqa: BLE001
            logger.warning("query rewriter failed: %s", exc)
        return {"question": question, "steps": steps}

    def web_gate(self, state: GraphState) -> dict:
        """Human-in-the-loop approval gate before any web search."""
        steps = self._trace(state, "web_gate")
        if not self.settings.require_web_search_approval or state.get("web_search_approved"):
            return {"web_search_approved": True, "steps": steps}
        # Pause the graph and surface a decision request to the caller.
        decision = interrupt(
            {
                "type": "web_search_approval",
                "question": state.get("question", ""),
                "message": (
                    "I couldn't find a confident answer in the knowledge base. "
                    "Approve a web search?"
                ),
            }
        )
        approved = bool(decision.get("approve", True)) if isinstance(decision, dict) else bool(decision)
        return {"web_search_approved": approved, "steps": steps}

    def do_web_search(self, state: GraphState) -> dict:
        steps = self._trace(state, "web_search")
        results = self.web_search.invoke(state["question"])
        documents = list(state.get("documents", [])) + list(results)
        return {"documents": documents, "datasource": "web_search", "steps": steps}

    def answer_from_knowledge(self, state: GraphState) -> dict:
        """Web search was declined and nothing was retrieved — answer from the
        model's own training knowledge (with a disclaimer) instead of dead-ending."""
        steps = self._trace(state, "answer_from_knowledge")
        try:
            text = self.fallback_answer_chain.invoke({"question": state["question"]})
        except Exception as exc:  # noqa: BLE001
            logger.warning("fallback answer failed: %s", exc)
            text = (
                "I couldn't search the web (you declined) and this isn't covered by my "
                "knowledge base, so I can't answer confidently right now. If you approve "
                "a web search, I can look it up for you."
            )
        generation = text if isinstance(text, str) else str(text)
        return {"generation": generation.strip(), "datasource": "model_knowledge", "steps": steps}

    def generate(self, state: GraphState) -> dict:
        steps = self._trace(state, "generate")
        context = self._format_context(state.get("documents", []))
        try:
            generation = self.generator.invoke(
                {"context": context, "question": state["question"]}
            )
        except Exception as exc:  # noqa: BLE001
            logger.error("generation failed: %s", exc)
            generation = "I ran into an error while generating an answer."
        text = generation if isinstance(generation, str) else str(generation)
        return {"generation": text.strip(), "steps": steps}

    def grade_generation(self, state: GraphState) -> dict:
        """Grade groundedness + answer relevance, with a bounded retry counter."""
        steps = self._trace(state, "grade_generation")
        documents = state.get("documents", [])
        generation = state.get("generation", "")
        question = state.get("question", "")
        retries = state.get("retries", 0)

        grounded = True
        if documents:
            try:
                grounded = (
                    self.hallucination_grader.invoke(
                        {
                            "documents": self._format_context(documents),
                            "generation": generation,
                        }
                    ).binary_score.lower()
                    == "yes"
                )
            except Exception as exc:  # noqa: BLE001 - default to grounded to avoid loops
                logger.warning("hallucination grader failed: %s", exc)

        answers = True
        try:
            answers = (
                self.answer_grader.invoke(
                    {"question": question, "generation": generation}
                ).binary_score.lower()
                == "yes"
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("answer grader failed: %s", exc)

        if grounded and answers:
            decision = "useful"
        elif not grounded:
            decision = "not_supported"
        else:
            decision = "not_useful"

        if decision != "useful":
            if retries >= self.settings.max_retries:
                decision = "give_up"
            else:
                retries += 1

        return {"generation_grade": decision, "retries": retries, "steps": steps}

    def finalize(self, state: GraphState) -> dict:
        """Commit the answer to conversation memory (one AI message per turn)."""
        steps = self._trace(state, "finalize")
        return {
            "messages": [AIMessage(content=state.get("generation", ""))],
            "steps": steps,
        }

    # ====================================================================== #
    #  Conditional edges (pure, read-only routers)                           #
    # ====================================================================== #
    def _route_decider(self, state: GraphState) -> str:
        datasource = state.get("datasource")
        if datasource == "general":
            return "direct_answer"
        if datasource == "web_search" and self.settings.enable_web_search:
            return "web_gate"
        return "retrieve"

    def _decide_to_generate(self, state: GraphState) -> str:
        if state.get("web_search_needed") and self.settings.enable_web_search:
            return "transform_query"
        return "generate"

    def _after_gate(self, state: GraphState) -> str:
        # Approved -> search the web; declined -> answer from the model's own
        # knowledge (rather than generating from empty context and dead-ending).
        return "web_search" if state.get("web_search_approved") else "answer_from_knowledge"

    def _route_after_grade(self, state: GraphState) -> str:
        decision = state.get("generation_grade", "useful")
        if decision in ("useful", "give_up"):
            return "finalize"
        if decision == "not_supported":
            return "generate"
        # not_useful -> try to improve retrieval (web search) if allowed
        return "transform_query" if self.settings.enable_web_search else "finalize"

    # ====================================================================== #
    #  Graph wiring                                                          #
    # ====================================================================== #
    def _build_graph(self):
        g = StateGraph(GraphState)

        g.add_node("contextualize", self._timed("contextualize", self.contextualize))
        g.add_node("route_question", self._timed("route_question", self.route_question))
        g.add_node("direct_answer", self._timed("direct_answer", self.direct_answer))
        g.add_node("retrieve", self._timed("retrieve", self.retrieve))
        g.add_node("grade_documents", self._timed("grade_documents", self.grade_documents))
        g.add_node("transform_query", self._timed("transform_query", self.transform_query))
        g.add_node("web_gate", self._timed("web_gate", self.web_gate))
        g.add_node("web_search", self._timed("web_search", self.do_web_search))
        g.add_node("answer_from_knowledge", self._timed("answer_from_knowledge", self.answer_from_knowledge))
        g.add_node("generate", self._timed("generate", self.generate))
        g.add_node("grade_generation", self._timed("grade_generation", self.grade_generation))
        g.add_node("finalize", self._timed("finalize", self.finalize))

        g.add_edge(START, "contextualize")
        g.add_edge("contextualize", "route_question")
        g.add_conditional_edges(
            "route_question",
            self._route_decider,
            {"retrieve": "retrieve", "web_gate": "web_gate", "direct_answer": "direct_answer"},
        )
        g.add_edge("direct_answer", "finalize")
        g.add_edge("retrieve", "grade_documents")
        g.add_conditional_edges(
            "grade_documents",
            self._decide_to_generate,
            {"generate": "generate", "transform_query": "transform_query"},
        )
        g.add_edge("transform_query", "web_gate")
        g.add_conditional_edges(
            "web_gate",
            self._after_gate,
            {"web_search": "web_search", "answer_from_knowledge": "answer_from_knowledge"},
        )
        g.add_edge("web_search", "generate")
        g.add_edge("answer_from_knowledge", "finalize")
        g.add_edge("generate", "grade_generation")
        g.add_conditional_edges(
            "grade_generation",
            self._route_after_grade,
            {
                "finalize": "finalize",
                "generate": "generate",
                "transform_query": "transform_query",
            },
        )
        g.add_edge("finalize", END)

        return g.compile(checkpointer=self.checkpointer)

    # ====================================================================== #
    #  Helpers                                                               #
    # ====================================================================== #
    @staticmethod
    def _trace(state: GraphState, node: str) -> list[str]:
        return [*state.get("steps", []), node]

    @staticmethod
    def _format_history(messages, max_turns: int = 6) -> str:
        lines = []
        for m in messages[-max_turns * 2 :]:
            role = "User" if m.type == "human" else "Assistant"
            lines.append(f"{role}: {m.content}")
        return "\n".join(lines)

    @staticmethod
    def _format_context(documents: list[Document]) -> str:
        if not documents:
            return "(no documents retrieved)"
        blocks = []
        for doc in documents:
            source = doc.metadata.get("source") or doc.metadata.get("title") or "unknown"
            blocks.append(f"[{source}]\n{doc.page_content}")
        return "\n\n".join(blocks)

    @staticmethod
    def _build_citations(documents: list[Document]) -> list[dict]:
        citations, seen = [], set()
        for doc in documents:
            source = doc.metadata.get("source") or doc.metadata.get("title") or "unknown"
            if source in seen:
                continue
            seen.add(source)
            snippet = " ".join(doc.page_content.split())
            if len(snippet) > _MAX_SNIPPET:
                snippet = snippet[:_MAX_SNIPPET] + "..."
            citations.append(
                {
                    "source": source,
                    "snippet": snippet,
                    "origin": doc.metadata.get("origin", "vectorstore"),
                }
            )
        return citations

    def _result_payload(self, result: dict, thread_id: str) -> dict:
        interrupts = result.get("__interrupt__") if isinstance(result, dict) else None
        if interrupts:
            first = interrupts[0]
            payload = getattr(first, "value", first)
            return {
                "status": "needs_approval",
                "thread_id": thread_id,
                "interrupt": payload,
                "answer": None,
                "route": result.get("datasource", ""),
                "web_search_used": False,
                "citations": [],
                "steps": result.get("steps", []),
                "timings": result.get("timings", []),
                "retries": result.get("retries", 0),
            }

        documents = result.get("documents", [])
        # "Used" means web content actually made it into the context — a denied
        # or unrouted web search must not report as used.
        web_used = any(d.metadata.get("origin") == "web_search" for d in documents)
        return {
            "status": "complete",
            "thread_id": thread_id,
            "interrupt": None,
            "answer": result.get("generation", ""),
            "route": result.get("datasource", ""),
            "web_search_used": web_used,
            "citations": self._build_citations(documents),
            "steps": result.get("steps", []),
            "timings": result.get("timings", []),
            "retries": result.get("retries", 0),
        }


# ========================================================================== #
#  Factory                                                                   #
# ========================================================================== #
def build_agent(settings: Settings | None = None, *, checkpointer: object | None = None) -> AgenticRAGAgent:
    """Construct the production agent: tracing + embeddings + FAISS + graph."""
    settings = settings or get_settings()
    setup_tracing(settings)
    # Cache identical LLM calls in-process to save free-tier inference credits.
    set_llm_cache(InMemoryCache())

    embeddings = get_embeddings(settings)
    vectorstore = load_vectorstore(settings.vectorstore_path, embeddings)
    retriever = vectorstore.as_retriever(search_kwargs={"k": settings.retriever_k})
    checkpointer = checkpointer or _build_checkpointer(settings)
    return AgenticRAGAgent(retriever=retriever, settings=settings, checkpointer=checkpointer)


def _build_checkpointer(settings: Settings) -> object:
    """Persistent per-thread memory via SQLite so conversations survive restarts.

    Each browser/user holds a stable ``thread_id`` (client-side), and LangGraph
    checkpoints that thread's full state — messages, retrieved docs, retry
    counters — here. On reconnect the agent rehydrates the exact conversation.
    Falls back to in-memory if the optional sqlite saver isn't installed.
    """
    try:
        import sqlite3

        from langgraph.checkpoint.sqlite import SqliteSaver

        db_path = settings.storage_path / "checkpoints.sqlite"
        db_path.parent.mkdir(parents=True, exist_ok=True)
        # check_same_thread=False: FastAPI may touch the saver from worker threads.
        conn = sqlite3.connect(str(db_path), check_same_thread=False)
        saver = SqliteSaver(conn)
        with contextlib.suppress(Exception):  # pragma: no cover - already set up
            saver.setup()  # create checkpoint tables on first run
        logger.info("Persistent memory: SqliteSaver at %s", db_path)
        return saver
    except Exception as exc:  # pragma: no cover - optional dep / FS issues
        logger.warning("Persistent checkpointer unavailable (%s); using in-memory memory.", exc)
        return MemorySaver()

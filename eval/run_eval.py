"""Run a LangSmith evaluation experiment against the agent.

Prerequisites:
  * A built FAISS index (`python -m agentic_rag.ingest`)
  * `LANGSMITH_TRACING=true` and `LANGSMITH_API_KEY=...` in your `.env`
  * The package importable (`pip install -e .`)

Usage (from the repo root):
    python eval/run_eval.py

It creates/updates the LangSmith dataset, runs the agent over every example,
and scores each output with the correctness / groundedness / relevance judges.
Results (and a link to the experiment) are printed and visible in LangSmith.
"""

from __future__ import annotations

import contextlib
import sys
import uuid
from pathlib import Path

# Allow running both `python eval/run_eval.py` and `python -m eval.run_eval`.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from agentic_rag.config import get_settings  # noqa: E402
from agentic_rag.graph.build import build_agent  # noqa: E402
from agentic_rag.llm import get_llm  # noqa: E402
from agentic_rag.tracing import setup_tracing  # noqa: E402
from dataset import DATASET_NAME, ensure_dataset  # noqa: E402
from evaluators import build_evaluators  # noqa: E402

try:  # the import path moved across langsmith versions
    from langsmith.evaluation import evaluate
except ImportError:  # pragma: no cover
    from langsmith import evaluate  # type: ignore


def make_target(agent):
    """Wrap the agent as a LangSmith target: inputs dict -> outputs dict."""

    def target(inputs: dict) -> dict:
        question = inputs["question"]
        payload = agent.ask(question, thread_id=uuid.uuid4().hex)
        return {
            "answer": payload.get("answer", ""),
            "contexts": [c["snippet"] for c in payload.get("citations", [])],
            "route": payload.get("route"),
            "steps": payload.get("steps", []),
        }

    return target


def main() -> None:
    settings = get_settings()

    if not settings.langsmith_api_key:
        raise SystemExit(
            "LANGSMITH_API_KEY is not set. Add it to your .env (free account at "
            "https://smith.langchain.com) and set LANGSMITH_TRACING=true."
        )

    setup_tracing(settings)

    from langsmith import Client

    client = Client()

    print(f"Ensuring dataset '{DATASET_NAME}'...")
    ensure_dataset(client)

    print("Building agent and judges...")
    agent = build_agent(settings)
    target = make_target(agent)
    # Deterministic judge; reuses the same provider as the app.
    judge_llm = get_llm(settings, temperature=0.0)
    evaluators = build_evaluators(judge_llm)

    print("Running evaluation (this calls the LLM several times per example)...")
    results = evaluate(
        target,
        data=DATASET_NAME,
        evaluators=evaluators,
        experiment_prefix="agentic-rag",
        metadata=settings.provider_summary(),
        client=client,
    )

    print("\nDone. View detailed results in LangSmith.")
    # Newer SDKs expose a summary/URL; print it if available.
    with contextlib.suppress(Exception):
        print(results)


if __name__ == "__main__":
    main()

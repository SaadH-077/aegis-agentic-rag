"""LLM-as-judge evaluators for LangSmith experiments.

Three complementary judges, mirroring how you'd grade a RAG system:

* **correctness**  - is the answer factually consistent with the reference?
* **groundedness** - is every claim supported by the retrieved context
                     (i.e., no hallucination)?
* **relevance**    - does the answer actually address the question?

Each evaluator follows LangSmith's ``(run, example) -> {key, score, comment}``
contract and uses a low-temperature judge model.
"""

from __future__ import annotations


def _verdict(judge_llm, prompt: str) -> int:
    """Return 1 if the judge answers 'yes', else 0 (robust to chatty output)."""
    try:
        out = judge_llm.invoke(prompt)
        text = out.content if hasattr(out, "content") else str(out)
        return 1 if text.strip().lower().startswith("yes") else 0
    except Exception:  # noqa: BLE001 - a judge failure scores 0, never crashes the run
        return 0


def build_evaluators(judge_llm):
    """Return a list of evaluator callables bound to *judge_llm*."""

    def correctness(run, example) -> dict:
        question = (example.inputs or {}).get("question", "")
        answer = (run.outputs or {}).get("answer", "")
        reference = (example.outputs or {}).get("answer", "")
        prompt = (
            "You are grading a candidate answer against a reference answer.\n"
            f"Question: {question}\n"
            f"Reference answer: {reference}\n"
            f"Candidate answer: {answer}\n\n"
            "Is the candidate answer factually consistent with the reference and "
            "does it correctly address the question? "
            "Respond with a single word: yes or no."
        )
        return {"key": "correctness", "score": _verdict(judge_llm, prompt)}

    def groundedness(run, example) -> dict:
        answer = (run.outputs or {}).get("answer", "")
        contexts = (run.outputs or {}).get("contexts", []) or []
        if not contexts:
            return {
                "key": "groundedness",
                "score": 0,
                "comment": "No context retrieved to ground the answer.",
            }
        context = "\n---\n".join(contexts)
        prompt = (
            "Judge whether the answer is fully supported by the context.\n"
            f"Context:\n{context}\n\n"
            f"Answer:\n{answer}\n\n"
            "Is every claim in the answer supported by the context? "
            "Respond with a single word: yes or no."
        )
        return {"key": "groundedness", "score": _verdict(judge_llm, prompt)}

    def relevance(run, example) -> dict:
        question = (example.inputs or {}).get("question", "")
        answer = (run.outputs or {}).get("answer", "")
        prompt = (
            "Judge whether the answer addresses the question.\n"
            f"Question: {question}\n"
            f"Answer: {answer}\n\n"
            "Does the answer address and resolve the question? "
            "Respond with a single word: yes or no."
        )
        return {"key": "relevance", "score": _verdict(judge_llm, prompt)}

    return [correctness, groundedness, relevance]

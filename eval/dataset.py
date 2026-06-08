"""Evaluation dataset for the Agentic RAG Assistant.

Defines a small, hand-curated set of question/reference-answer pairs grounded in
the knowledge base, and a helper to create-or-update the corresponding LangSmith
dataset. Grow this over time with hard cases harvested from real traces.
"""

from __future__ import annotations

DATASET_NAME = "agentic-rag-assistant-eval"

# Each example: a question plus a concise reference answer used by the
# correctness judge. References are intentionally short — the judge checks
# factual consistency, not verbatim wording.
EXAMPLES: list[dict[str, str]] = [
    {
        "question": "What is corrective RAG (CRAG)?",
        "answer": (
            "Corrective RAG grades retrieved documents for relevance and, when the "
            "context is weak or empty, takes a corrective action such as rewriting "
            "the query or falling back to web search instead of answering from poor "
            "context."
        ),
    },
    {
        "question": "How does LangGraph support human-in-the-loop?",
        "answer": (
            "By calling the interrupt() function inside a node to pause the graph "
            "and surface a payload to the caller, then resuming with "
            "Command(resume=value), which becomes the return value of interrupt(). "
            "It requires a checkpointer."
        ),
    },
    {
        "question": "What is the scaled dot-product attention formula?",
        "answer": (
            "Attention(Q, K, V) = softmax(Q·Kᵀ / sqrt(d_k)) · V, where the sqrt(d_k) "
            "term scales the dot products to stabilise the softmax."
        ),
    },
    {
        "question": "What does the add_messages reducer do in LangGraph?",
        "answer": (
            "It appends new messages to the existing message list in state, which is "
            "how conversation memory accumulates across turns, rather than "
            "overwriting the list."
        ),
    },
    {
        "question": "Why use cosine similarity for text embeddings?",
        "answer": (
            "Because it measures the angle between vectors and is magnitude-"
            "invariant, which suits text embeddings; for normalised vectors it is "
            "equivalent to the dot product."
        ),
    },
    {
        "question": "What are the main types of evaluators for LLM apps?",
        "answer": (
            "Heuristic/rule-based (exact match, regex, JSON validity, embedding "
            "distance), LLM-as-judge (a model scores against a rubric or reference), "
            "and human evaluation."
        ),
    },
    {
        "question": "What is the difference between LangChain LCEL chains and LangGraph?",
        "answer": (
            "LCEL chains are directed and acyclic (linear pipelines), while LangGraph "
            "models stateful applications as graphs with branching, cycles, shared "
            "state, persistence, and human-in-the-loop."
        ),
    },
    {
        "question": "What RAG-specific metrics should I track?",
        "answer": (
            "Context relevance/precision, faithfulness/groundedness, answer "
            "relevance, and context recall."
        ),
    },
    {
        "question": "What is the KV-cache and why does it matter?",
        "answer": (
            "It caches the keys and values of previously generated tokens so the "
            "model does not recompute attention over the whole prefix each step, "
            "making generation roughly linear in output length at the cost of memory "
            "that grows with context length."
        ),
    },
    {
        "question": "Why might prompt-engineered JSON be preferred over native tool-calling on open models?",
        "answer": (
            "Because many open-weight models served over free inference do not "
            "reliably implement OpenAI-style tool-calling, so embedding the JSON "
            "schema in the prompt and validating the output (with a safe fallback) is "
            "more portable."
        ),
    },
]


def ensure_dataset(client):
    """Create the LangSmith dataset if missing, then return it.

    Uses ``client`` (a ``langsmith.Client``). Idempotent: safe to call repeatedly.
    """
    if client.has_dataset(dataset_name=DATASET_NAME):
        return client.read_dataset(dataset_name=DATASET_NAME)

    dataset = client.create_dataset(
        dataset_name=DATASET_NAME,
        description="Curated QA pairs grounded in the AI/ML knowledge base.",
    )
    client.create_examples(
        inputs=[{"question": e["question"]} for e in EXAMPLES],
        outputs=[{"answer": e["answer"]} for e in EXAMPLES],
        dataset_id=dataset.id,
    )
    return dataset

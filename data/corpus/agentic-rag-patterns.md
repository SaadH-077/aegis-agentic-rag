# Agentic RAG Patterns: Adaptive, Corrective, and Self-RAG

## Motivation
Naive RAG retrieves once and answers once. It fails when the question is out of
scope, when retrieval returns irrelevant chunks, or when the model hallucinates
beyond its context. **Agentic RAG** adds control flow — routing, grading,
rewriting, and self-checking — so the system can adapt to each query. These
patterns are typically implemented as a state graph with conditional edges and
loops.

## Adaptive RAG
Adaptive RAG **routes** each question to the best strategy before retrieving. A
router (often an LLM producing a structured decision) sends in-scope questions to
the vector store and out-of-scope or time-sensitive questions to web search or a
direct answer. This avoids wasting retrieval on questions the knowledge base
cannot answer.

## Corrective RAG (CRAG)
Corrective RAG **grades retrieved documents** for relevance. If the retrieved
context is weak or empty, instead of answering from poor context the agent takes
a corrective action: rewrite the query and retrieve again, or fall back to an
external source such as web search. This directly attacks the "garbage context
in, garbage answer out" failure mode.

## Self-RAG
Self-RAG adds **self-reflection on the generation**. After producing an answer
the model grades it against two questions:
1. *Is it grounded?* — every claim is supported by the retrieved facts
   (a hallucination check).
2. *Does it answer the question?* — the response actually resolves the user's
   intent.
If either check fails, the agent loops: regenerate when ungrounded, or rewrite
the query and retrieve more when the answer is off-target. A retry counter bounds
the loop so it always terminates.

## Combining Them
A robust assistant combines all three: route (Adaptive), grade-and-fallback
(Corrective), and self-check (Self-RAG). The resulting graph looks like:
route → retrieve → grade documents → (rewrite / web search if weak) → generate →
grade for hallucination and answer quality → finish or loop.

## Human-in-the-Loop
Because some corrective actions have side effects or cost (e.g., calling the web,
spending API credits, or taking an irreversible action), inserting a human
approval gate before them is good practice. With LangGraph's `interrupt()`, the
graph pauses, asks for approval, and resumes based on the human's decision.

## Why This Matters
These patterns are the difference between a demo chatbot and a dependable
assistant. They show an engineer thinking about failure modes — irrelevant
retrieval, hallucination, and scope — and building explicit guardrails rather
than hoping the model gets it right.

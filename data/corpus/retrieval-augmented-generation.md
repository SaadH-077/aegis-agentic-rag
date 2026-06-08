# Retrieval-Augmented Generation (RAG)

## What RAG Is
Retrieval-Augmented Generation grounds an LLM's answers in external knowledge
that is fetched at query time, instead of relying solely on parameters learned
during training. A retriever finds relevant documents and injects them into the
prompt as context, so the model can cite up-to-date or domain-specific facts it
never memorised. RAG reduces hallucination, allows knowledge to be updated
without retraining, and makes answers attributable to sources.

## The Core Pipeline
1. **Ingestion (offline):** load source documents, split them into chunks,
   embed each chunk into a vector, and store the vectors in a vector database.
2. **Retrieval (online):** embed the user's query, run a similarity search to
   find the top-k most relevant chunks.
3. **Augmentation:** insert the retrieved chunks into the prompt as context.
4. **Generation:** the LLM answers using the provided context, ideally citing
   the chunks it relied on.

## Chunking
Chunk size and overlap materially affect quality. Chunks that are too large
dilute relevance and waste context; chunks that are too small lose meaning.
Recursive, structure-aware splitting (e.g., on Markdown headings, then
paragraphs, then sentences) preserves semantic boundaries. A small overlap
keeps context continuous across chunk borders.

## Retrieval Strategies
- **Dense retrieval** uses embedding similarity (semantic match).
- **Sparse retrieval** (BM25/keyword) excels at exact terms and rare tokens.
- **Hybrid search** combines both and often wins in practice.
- **Re-ranking** with a cross-encoder reorders candidates for precision.
- **MMR (Maximal Marginal Relevance)** balances relevance with diversity to
  reduce redundant chunks.

## Advanced / Agentic RAG
Naive RAG retrieves once and generates once. More robust systems add control
flow: **query rewriting** to improve retrieval, **document grading** to discard
irrelevant hits, **corrective fallback** to web search when the knowledge base
is insufficient, and **self-checks** that verify the answer is grounded in the
retrieved context before returning it. These patterns are naturally expressed as
a graph of steps with loops — which is exactly what LangGraph is built for.

## Common Failure Modes
Poor chunking, embedding/query mismatch, retrieving too few or too many chunks,
"lost in the middle" (models under-using context in the middle of long prompts),
and answering confidently when no relevant context was found. Good RAG systems
measure and guard against each of these.

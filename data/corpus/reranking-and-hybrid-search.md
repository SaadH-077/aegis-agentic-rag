# Reranking and Hybrid Search

Dense vector search is powerful but imperfect: it can miss exact keyword matches
(names, error codes, rare terms) and it returns results in similarity order,
which is not always relevance order. Two techniques fix this.

## Hybrid search (dense + sparse)

- **Dense retrieval** uses embeddings and captures semantic meaning ("car" ≈
  "automobile").
- **Sparse retrieval** (e.g. **BM25**, a TF-IDF-style lexical score) captures
  exact term overlap and rare keywords.
- **Hybrid search** runs both and fuses the result lists. A popular fusion method
  is **Reciprocal Rank Fusion (RRF)**, which scores each document by the sum of
  `1 / (k + rank)` across the lists — robust because it uses ranks, not raw
  scores from different scales.

Hybrid search consistently beats either method alone on heterogeneous corpora.

## Reranking (cross-encoders)

First-stage retrieval (vector or hybrid) is a **bi-encoder**: queries and
documents are embedded independently, so it is fast but coarse. A **reranker** is
a **cross-encoder** that reads the query and a candidate document *together* and
outputs a precise relevance score.

Typical pipeline:

1. Retrieve a generous candidate set (e.g. top 50) cheaply with vector/hybrid
   search.
2. **Rerank** those candidates with a cross-encoder (e.g. a Cohere/BGE reranker).
3. Keep the top 3–5 for the LLM context.

Cross-encoders are far more accurate per pair but too slow to run over the whole
corpus — hence the two-stage retrieve-then-rerank design.

## Why it matters for RAG

Better-ordered, higher-precision context means the generator sees fewer
distractors, which reduces hallucination and improves answer quality without
changing the LLM at all. Reranking is one of the highest-leverage upgrades to a
basic RAG pipeline.

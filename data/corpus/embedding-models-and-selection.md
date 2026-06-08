# Embedding Models and How to Choose One

An **embedding model** maps text to a fixed-length vector so that semantically
similar texts land close together. It is the single most important component of
retrieval quality in a RAG system — a better embedding model improves every
downstream answer.

## What makes a good embedding

- **Semantic fidelity** — paraphrases are close; unrelated texts are far.
- **Dimensionality** — common sizes are 384, 768, or 1536. Larger vectors can
  capture more nuance but cost more memory and compute; smaller models like
  `all-MiniLM-L6-v2` (384-d) are fast and surprisingly strong.
- **Max sequence length** — how much text fits in one embedding; must comfortably
  cover your chunk size.

## Bi-encoders vs cross-encoders

- **Bi-encoders** embed queries and documents *independently*, so document
  vectors can be precomputed and searched fast. This is what vector databases
  use for first-stage retrieval.
- **Cross-encoders** read query and document *together* for a precise score, used
  for **reranking** (see hybrid search / reranking). Too slow to embed a whole
  corpus.

## Symmetric vs asymmetric search

Some models are tuned for **asymmetric** retrieval (short query → long passage)
and provide instruction prefixes like `"query:"` and `"passage:"`. Using the
prescribed prefixes matters for quality.

## Choosing a model

- Consult the **MTEB** (Massive Text Embedding Benchmark) leaderboard for
  retrieval performance across tasks.
- Weigh **quality vs cost/latency**: API models (e.g. OpenAI, Cohere) vs local
  open models (e.g. BGE, E5, GTE, MiniLM via sentence-transformers).
- Consider **domain fit** — a general model may underperform on legal/medical
  jargon; domain-tuned models or fine-tuning can help.

## Critical rule

**Embed your queries and your documents with the same model**, and re-index if
you ever switch models — vectors from different models are not comparable. The
embedding model used at query time must match the one used at indexing time.

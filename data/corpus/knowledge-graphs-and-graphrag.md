# Knowledge Graphs and GraphRAG

Standard RAG retrieves independent text chunks by vector similarity. This works
well for "look up a fact" questions but struggles with questions that require
**connecting information across many documents** — "how do these entities relate?"
or "summarise the themes across the whole corpus." **GraphRAG** addresses this by
adding a knowledge graph.

## Knowledge graphs

A **knowledge graph** represents information as **entities** (nodes) and
**relationships** (edges): `(Marie Curie) —[discovered]→ (Radium)`. It captures
explicit structure that flat text and embeddings do not.

## How GraphRAG works

1. **Extraction** — an LLM reads the source documents and extracts entities and
   relationships, building a graph.
2. **Community detection** — graph algorithms cluster related entities into
   communities, and the LLM writes a summary for each community.
3. **Retrieval/answering** —
   - *Local* questions traverse the neighbourhood of relevant entities.
   - *Global* questions ("what are the main themes?") aggregate the
     community summaries instead of scanning every chunk.

## Strengths and costs

- **Strengths** — multi-hop reasoning, whole-corpus synthesis, and explainable
  paths (you can see which relationships supported an answer).
- **Costs** — building the graph is LLM-intensive (and so slower and pricier than
  plain chunk indexing), and extraction quality bounds the result.

## When to use it

Reach for GraphRAG when answers require **synthesis across documents** or
relationship reasoning. For simple fact lookup, vector RAG (optionally with
reranking) is cheaper and usually sufficient. Hybrid designs use vector retrieval
for specifics and the graph for connections.

# Vector Databases: A Deeper Look

A vector database stores high-dimensional embedding vectors and answers
**approximate nearest-neighbour (ANN)** queries: "given this query vector, return
the k most similar stored vectors." They are the retrieval backbone of RAG.

## Similarity metrics

- **Cosine similarity** — measures the angle between vectors; insensitive to
  magnitude. The most common choice for text embeddings.
- **Dot product (inner product)** — used when embeddings are not normalised, or
  when magnitude carries meaning. For unit-normalised vectors, dot product and
  cosine rank identically.
- **Euclidean (L2) distance** — straight-line distance; smaller is closer.

## ANN index types

Exact nearest-neighbour search is O(N) per query and does not scale, so vector
databases use approximate indexes that trade a little recall for large speedups:

- **Flat (brute force)** — compares the query against every vector. Exact and
  simple; fine for small corpora (thousands of vectors).
- **IVF (inverted file)** — clusters vectors with k-means into cells; a query
  only searches the closest cells (`nprobe` controls how many). Faster, with a
  small recall cost.
- **HNSW (Hierarchical Navigable Small World)** — a multi-layer proximity graph
  giving excellent recall/latency, at the cost of higher memory. The default in
  many systems.
- **PQ (Product Quantization)** — compresses vectors into compact codes to cut
  memory dramatically; often combined with IVF (`IVF-PQ`).

## Common engines

- **FAISS** — Facebook AI Similarity Search; a fast in-process library (not a
  server). Great for local/offline RAG; supports Flat, IVF, HNSW, PQ.
- **Chroma** — developer-friendly embedded vector store with metadata filtering.
- **pgvector** — a PostgreSQL extension; keeps vectors next to relational data.
- **Pinecone / Weaviate / Qdrant / Milvus** — managed or self-hosted vector
  databases with horizontal scaling, hybrid search, and metadata filters.

## Practical notes

- **Metadata filtering** lets you combine semantic search with structured
  predicates (e.g. `source = "manual" AND year >= 2023`).
- **Normalise embeddings** if your metric assumes unit vectors.
- The index is only as good as the embeddings; retrieval quality is dominated by
  the embedding model and the chunking strategy, not the index type.

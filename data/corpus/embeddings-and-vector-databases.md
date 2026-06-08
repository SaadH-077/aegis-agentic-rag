# Embeddings and Vector Databases

## Embeddings
An embedding is a dense vector that represents the meaning of a piece of text
(or an image, audio clip, etc.) as a point in high-dimensional space. Texts with
similar meaning land close together, so semantic similarity becomes geometric
proximity. Embedding models such as `sentence-transformers/all-MiniLM-L6-v2`
(384 dimensions) or the BGE family are small, fast, and good enough for most
retrieval tasks. The same model must be used to embed both documents and
queries so they share a vector space.

## Similarity Metrics
- **Cosine similarity** measures the angle between vectors and is the most
  common choice for text embeddings (magnitude-invariant).
- **Dot product** is used when vectors are normalised.
- **Euclidean (L2) distance** measures straight-line distance.
For normalised embeddings, cosine similarity and dot product are equivalent.

## Vector Databases
A vector database stores embeddings and performs fast nearest-neighbour search
over them. Options range from in-process libraries to managed services:
- **FAISS** — a high-performance in-process library from Meta; ideal for local
  and embedded use, persisted to disk.
- **Chroma** — a developer-friendly local/embedded store.
- **Qdrant, Weaviate, Milvus** — full-featured standalone vector databases.
- **pgvector** — vector search inside PostgreSQL.
- **Pinecone** — a managed cloud vector service.

## Approximate Nearest Neighbours (ANN)
Exact search is O(n) per query, which does not scale. ANN indexes trade a little
recall for large speed gains. Common algorithms include **HNSW** (a navigable
small-world graph, excellent recall/latency balance) and **IVF** (inverted file
with clustering). Tuning index parameters trades off build time, memory, query
latency, and recall.

## Practical Tips
- Normalise embeddings if your metric assumes it.
- Keep the embedding model fixed between ingestion and query time; re-embed the
  whole corpus if you change models.
- Store useful metadata (source, title, section) alongside each vector to enable
  filtering and to produce citations.
- For small corpora, an in-process store like FAISS is simpler and faster than
  running a separate database service.

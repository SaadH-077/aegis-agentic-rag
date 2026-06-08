# Chunking and Document Processing for RAG

Before documents can be retrieved, they must be split into **chunks** that are
embedded and indexed. Chunking quality has an outsized effect on RAG accuracy:
chunks that are too large dilute the embedding and waste context; chunks that are
too small lose the surrounding meaning.

## Why chunk at all?

- Embedding models have a maximum input length, and their quality degrades on
  very long inputs.
- Retrieval returns whole chunks, so the chunk is the unit of context handed to
  the LLM. You want each chunk to be a self-contained, topically coherent piece.

## Common strategies

- **Fixed-size chunking** — split every N characters or tokens (e.g. 1000
  characters) with an **overlap** (e.g. 100–200) so a sentence cut at a boundary
  still appears intact in a neighbouring chunk. Simple and robust.
- **Recursive character splitting** — split on a priority list of separators
  (paragraphs → lines → sentences → words), keeping chunks under a size budget.
  This respects natural structure better than blind fixed-size cuts.
- **Semantic chunking** — embed sentences and start a new chunk where the
  semantic distance between consecutive sentences spikes (a topic shift).
- **Document-structure-aware** — split on Markdown headings, HTML tags, code
  blocks, or PDF layout, attaching the heading path as metadata.

## Key parameters

- **chunk_size** — target length per chunk (characters or tokens). 500–1500
  characters is a common range for prose.
- **chunk_overlap** — how much consecutive chunks share (often 10–20% of size).
  Overlap reduces the chance of splitting an answer across a boundary.

## Good practice

- Attach **metadata** to each chunk (source filename, section, page) so answers
  can be cited and results can be filtered.
- Strip boilerplate (nav bars, repeated headers) before chunking.
- Keep tables and code blocks intact where possible — splitting them mid-row or
  mid-function destroys their meaning.
- Evaluate chunking empirically: the "best" size depends on your documents and
  your embedding model.

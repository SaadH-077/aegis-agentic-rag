"""Ingestion pipeline: load corpus -> split -> embed -> persist FAISS index.

Run it as a module::

    python -m agentic_rag.ingest
    python -m agentic_rag.ingest --corpus data/corpus --out storage/faiss_index
"""

from __future__ import annotations

import argparse
import logging
from pathlib import Path

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from .config import Settings, get_settings
from .embeddings import get_embeddings
from .vectorstore import build_vectorstore

logger = logging.getLogger(__name__)


def load_corpus(corpus_dir: Path) -> list[Document]:
    """Read every Markdown file under *corpus_dir* into a Document."""
    corpus_dir = Path(corpus_dir)
    paths = sorted(corpus_dir.rglob("*.md"))
    documents: list[Document] = []
    for path in paths:
        text = path.read_text(encoding="utf-8")
        if not text.strip():
            continue
        documents.append(
            Document(
                page_content=text,
                metadata={"source": path.name, "path": str(path)},
            )
        )
    logger.info("Loaded %d documents from %s", len(documents), corpus_dir)
    return documents


def split_documents(
    documents: list[Document], chunk_size: int, chunk_overlap: int
) -> list[Document]:
    """Markdown-aware recursive splitting that prefers heading boundaries."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n## ", "\n### ", "\n#### ", "\n\n", "\n", " ", ""],
    )
    chunks = splitter.split_documents(documents)
    logger.info("Split into %d chunks", len(chunks))
    return chunks


def ingest(settings: Settings | None = None) -> tuple[int, int, Path]:
    """Build and persist the vector store. Returns (n_docs, n_chunks, index_dir)."""
    settings = settings or get_settings()

    documents = load_corpus(settings.corpus_path)
    if not documents:
        raise SystemExit(
            f"No .md files found in {settings.corpus_path}. "
            "Add documents to the corpus and try again."
        )

    chunks = split_documents(documents, settings.chunk_size, settings.chunk_overlap)
    embeddings = get_embeddings(settings)
    build_vectorstore(chunks, embeddings, settings.vectorstore_path)
    return len(documents), len(chunks), settings.vectorstore_path


def main() -> None:
    logging.basicConfig(
        level=logging.INFO, format="%(levelname)s %(name)s: %(message)s"
    )
    parser = argparse.ArgumentParser(description="Build the FAISS knowledge base.")
    parser.add_argument("--corpus", type=str, default=None, help="Corpus directory.")
    parser.add_argument("--out", type=str, default=None, help="Index output directory.")
    args = parser.parse_args()

    settings = get_settings()
    if args.corpus:
        settings.corpus_dir = Path(args.corpus)
    if args.out:
        settings.vectorstore_dir = Path(args.out)

    n_docs, n_chunks, index_dir = ingest(settings)
    print(f"\n[OK] Ingested {n_docs} documents -> {n_chunks} chunks -> {index_dir}\n")


if __name__ == "__main__":
    main()

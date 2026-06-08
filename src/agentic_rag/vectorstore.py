"""FAISS vector store helpers (build / load / existence check).

FAISS is local, fast, and has no service to run — ideal for a self-contained
portfolio demo. The persisted index lives under ``storage/`` and is tiny (it is
*not* a model, so it does not strain disk).
"""

from __future__ import annotations

import logging
from pathlib import Path

from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings

logger = logging.getLogger(__name__)


def build_vectorstore(
    documents: list[Document], embeddings: Embeddings, persist_dir: Path
) -> FAISS:
    """Embed *documents* and persist a FAISS index to *persist_dir*."""
    if not documents:
        raise ValueError("Cannot build a vector store from an empty document list.")
    logger.info("Embedding %d chunks into FAISS...", len(documents))
    vs = FAISS.from_documents(documents, embeddings)
    persist_dir.mkdir(parents=True, exist_ok=True)
    vs.save_local(str(persist_dir))
    logger.info("Saved FAISS index to %s", persist_dir)
    return vs


def load_vectorstore(persist_dir: Path, embeddings: Embeddings) -> FAISS:
    """Load a previously persisted FAISS index."""
    if not vectorstore_exists(persist_dir):
        raise FileNotFoundError(
            f"No FAISS index found at {persist_dir}. Run ingestion first: "
            "`python -m agentic_rag.ingest`."
        )
    # allow_dangerous_deserialization is required for FAISS pickle metadata; the
    # index here is created by us locally, so it is safe to load.
    return FAISS.load_local(
        str(persist_dir), embeddings, allow_dangerous_deserialization=True
    )


def vectorstore_exists(persist_dir: Path) -> bool:
    return (Path(persist_dir) / "index.faiss").exists()

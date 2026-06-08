"""Embeddings factory.

Default mode is **api** (``HuggingFaceEndpointEmbeddings``): embeddings are
computed by Hugging Face's servers, so nothing is downloaded locally and the
heavy ``torch`` dependency is avoided entirely.

Set ``EMBEDDINGS_MODE=local`` (and ``pip install -r requirements-local.txt``) to
run a small sentence-transformers model on your own machine — free of API
credits, at the cost of ~90 MB of disk plus torch.
"""

from __future__ import annotations

import logging

from langchain_core.embeddings import Embeddings

from .config import Settings, get_settings

logger = logging.getLogger(__name__)


def get_embeddings(settings: Settings | None = None) -> Embeddings:
    settings = settings or get_settings()
    mode = settings.embeddings_mode.lower().strip()

    if mode == "local":
        try:
            from langchain_huggingface import HuggingFaceEmbeddings
        except ImportError as exc:  # pragma: no cover
            raise ImportError(
                "EMBEDDINGS_MODE=local requires sentence-transformers. "
                "Run: pip install -r requirements-local.txt"
            ) from exc
        logger.info("Using LOCAL embeddings: %s", settings.embeddings_model)
        return HuggingFaceEmbeddings(model_name=settings.embeddings_model)

    # Default: hosted inference, no local download.
    from langchain_huggingface import HuggingFaceEndpointEmbeddings

    if not settings.hf_token:
        logger.warning("HF_TOKEN is empty - API embeddings will likely fail with 401.")
    logger.info("Using API embeddings: %s", settings.embeddings_model)
    return HuggingFaceEndpointEmbeddings(
        model=settings.embeddings_model,
        huggingfacehub_api_token=settings.hf_token,
    )

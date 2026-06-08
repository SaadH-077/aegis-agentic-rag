"""Agentic RAG Assistant.

An adaptive, self-correcting Retrieval-Augmented Generation assistant built on
LangChain (LCEL chains, retrievers, parsers), LangGraph (a stateful, cyclic
agent with human-in-the-loop), and LangSmith (tracing + evaluation).

Public entry points:
    >>> from agentic_rag import build_agent
    >>> agent = build_agent()
    >>> result = agent.ask("What is corrective RAG?", thread_id="demo")
"""

from __future__ import annotations

import os

# On Windows, FAISS (libomp) and NumPy/MKL (libiomp5) can each load a copy of the
# OpenMP runtime, which aborts the process with "OMP Error #15". Allowing the
# duplicate before FAISS is imported avoids the crash. Must run before any faiss
# import, so it lives at the top of the package __init__.
os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")

__version__ = "0.1.0"

from .config import Settings, get_settings

__all__ = ["Settings", "get_settings", "build_agent", "__version__"]


def build_agent(*args, **kwargs):
    """Lazily construct the default :class:`AgenticRAGAgent`.

    Imported lazily so that simply importing the package (e.g. for ``__version__``)
    does not pull in the whole LangGraph/LangChain stack.
    """
    from .graph.build import build_agent as _build_agent

    return _build_agent(*args, **kwargs)

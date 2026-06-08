"""Centralised, environment-driven configuration.

Uses ``pydantic-settings`` so every value can be overridden via a ``.env`` file
or real environment variables (env vars win). Importing :func:`get_settings`
anywhere returns a cached singleton.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Repo root = two levels up from this file (src/agentic_rag/config.py).
PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Typed application settings. Field names map to UPPER_SNAKE env vars."""

    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ---- LLM provider -------------------------------------------------------
    llm_provider: str = "huggingface"  # huggingface | groq | ollama
    llm_temperature: float = 0.1
    llm_max_new_tokens: int = 512

    # Hugging Face (default)
    hf_token: str | None = None
    llm_model: str = "meta-llama/Llama-3.1-8B-Instruct"
    hf_provider: str = "auto"

    # Groq (optional)
    groq_api_key: str | None = None
    groq_model: str = "llama-3.3-70b-versatile"

    # Ollama (optional, local)
    ollama_model: str = "llama3.1"
    ollama_base_url: str = "http://localhost:11434"

    # ---- Embeddings ---------------------------------------------------------
    embeddings_mode: str = "api"  # api | local
    embeddings_model: str = "sentence-transformers/all-MiniLM-L6-v2"

    # ---- Retrieval / vector store ------------------------------------------
    corpus_dir: Path = Path("data/corpus")
    vectorstore_dir: Path = Path("storage/faiss_index")
    chunk_size: int = 1000
    chunk_overlap: int = 150
    retriever_k: int = 3

    # ---- Graph behaviour ----------------------------------------------------
    max_retries: int = 2
    enable_web_search: bool = True
    require_web_search_approval: bool = True

    # ---- Web search ---------------------------------------------------------
    web_search_results: int = 4
    # Optional: a free Tavily key (https://tavily.com) gives more reliable
    # results than keyless DuckDuckGo, which is used as the fallback.
    tavily_api_key: str | None = None

    # ---- LangSmith ----------------------------------------------------------
    langsmith_tracing: bool = False
    langsmith_api_key: str | None = None
    langsmith_project: str = "agentic-rag-assistant"
    langsmith_endpoint: str = "https://api.smith.langchain.com"

    # ---- API / UI -----------------------------------------------------------
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_base_url: str = "http://localhost:8000"

    # ---- Helpers ------------------------------------------------------------
    def _resolve(self, p: Path | str) -> Path:
        p = Path(p)
        return p if p.is_absolute() else (PROJECT_ROOT / p)

    @property
    def corpus_path(self) -> Path:
        return self._resolve(self.corpus_dir)

    @property
    def vectorstore_path(self) -> Path:
        return self._resolve(self.vectorstore_dir)

    @property
    def storage_path(self) -> Path:
        return self.vectorstore_path.parent

    def provider_summary(self) -> dict[str, str]:
        """Small, secrets-free summary handy for /health and the UI sidebar."""
        if self.llm_provider == "huggingface":
            model = self.llm_model
        elif self.llm_provider == "groq":
            model = self.groq_model
        else:
            model = self.ollama_model
        return {
            "llm_provider": self.llm_provider,
            "llm_model": model,
            "embeddings_mode": self.embeddings_mode,
            "embeddings_model": self.embeddings_model,
            "web_search": str(self.enable_web_search),
            "langsmith": str(self.langsmith_tracing),
        }


@lru_cache
def get_settings() -> Settings:
    """Return a cached :class:`Settings` instance."""
    return Settings()

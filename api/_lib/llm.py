"""LLM and embedding factories (Google Gemini).

Everything talks to models through this module so the rest of the code never
imports a provider SDK directly. Generation uses Gemini via LangChain
(`langchain-google-genai`); embeddings use Google's embedding model.

Design goal: the app runs end-to-end with **only** a GEMINI_API_KEY. Dense
hybrid retrieval uses Google embeddings from that same key (on by default, with
a graceful BM25-only fallback if embeddings are unavailable), so there is no
second provider to sign up for.

All Gemini/LangChain imports are lazy (inside functions) so the FastAPI app —
and its non-LLM endpoints — import and run even before the deps or key exist.
"""
import os
from functools import lru_cache
from typing import List, Optional

# Model roles are env-configurable so the demo is easy to retune.
# Strong+fast model for answers + plans; lighter model for the mechanical
# rewrite/grade steps. Any Gemini id works (e.g. gemini-2.5-pro, gemini-3.5-flash).
GEN_MODEL = os.getenv("GEN_MODEL", "gemini-3-flash-preview")
FAST_MODEL = os.getenv("FAST_MODEL", "gemini-3-flash-preview")
EMBED_MODEL = os.getenv("EMBED_MODEL", "models/gemini-embedding-001")

# "auto" = use Google dense embeddings when a key is present. Set to "none" to
# force BM25-only retrieval (skips the cold-start embedding call).
EMBEDDINGS_PROVIDER = os.getenv("EMBEDDINGS_PROVIDER", "auto").lower()


def _api_key() -> Optional[str]:
    # Accept either name — Google AI Studio calls it GEMINI_API_KEY;
    # LangChain's default env var is GOOGLE_API_KEY.
    return os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")


def has_key() -> bool:
    return bool(_api_key())


def _supports_thinking(model: str) -> bool:
    # 2.5+ and 3.x are "thinking" models; 2.0/1.5/1.0 are not and reject the param.
    m = model.lower()
    return not any(tag in m for tag in ("2.0", "1.5", "1.0"))


@lru_cache(maxsize=4)
def chat(model: str, max_tokens: int = 1024):
    """Return a cached LangChain ChatGoogleGenerativeAI client for a given model.

    For thinking models (2.5+/3.x) we set thinking_budget=0: this RAG pipeline
    doesn't need internal "thinking", and leaving it on makes short-budget calls
    return empty content (thinking eats the token budget) and burns quota faster.
    Non-thinking models (2.0-family) reject the param, so we omit it there.
    """
    from langchain_google_genai import ChatGoogleGenerativeAI

    kwargs = dict(model=model, max_output_tokens=max_tokens, google_api_key=_api_key())
    if _supports_thinking(model):
        kwargs["thinking_budget"] = 0
    return ChatGoogleGenerativeAI(**kwargs)


def gen_llm(max_tokens: int = 2048):
    return chat(GEN_MODEL, max_tokens)


def fast_llm(max_tokens: int = 1024):
    return chat(FAST_MODEL, max_tokens)


# ─── Embeddings (Google, on by default) ───────────────────────────────────────
def _embed_enabled() -> bool:
    if EMBEDDINGS_PROVIDER in ("none", "off", "bm25"):
        return False
    return has_key()


def embeddings_enabled() -> bool:
    return _embed_enabled()


@lru_cache(maxsize=1)
def _embedder():
    from langchain_google_genai import GoogleGenerativeAIEmbeddings

    return GoogleGenerativeAIEmbeddings(model=EMBED_MODEL, google_api_key=_api_key())


def _normalize(arr):
    import numpy as np

    a = np.array(arr, dtype="float32")
    if a.ndim == 1:
        n = np.linalg.norm(a)
        return a / (n if n else 1.0)
    norms = np.linalg.norm(a, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return a / norms  # L2-normalized so dot product == cosine


def embed_documents(texts: List[str]):
    """Return an (n, d) L2-normalized numpy array, or None if disabled/failed."""
    if not _embed_enabled():
        return None
    try:
        return _normalize(_embedder().embed_documents(list(texts)))
    except Exception as exc:  # pragma: no cover - best effort
        print(f"[embeddings] disabled: {exc}")
        return None


def embed_query(text: str):
    if not _embed_enabled():
        return None
    try:
        return _normalize(_embedder().embed_query(text))
    except Exception as exc:  # pragma: no cover - best effort
        print(f"[embeddings] disabled: {exc}")
        return None

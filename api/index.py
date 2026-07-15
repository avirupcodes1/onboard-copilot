"""Vercel serverless entry point (and local uvicorn target).

Vercel's Python runtime serves the exported ASGI `app`. We add this file's
directory to sys.path so the `_lib` package resolves both on Vercel and when
run locally as `uvicorn api.index:app`.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from _lib.server import app  # noqa: E402  (path set above)

__all__ = ["app"]

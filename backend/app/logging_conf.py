"""
Configuration du logging JSON structuré.
Les paramètres d'appel sont hachés (SHA-256 tronqué) pour éviter de persister
des données personnelles (salaires, matricules) dans les logs.
"""
from __future__ import annotations

import hashlib
import json
import logging
import sys
from typing import Any

from pythonjsonlogger import jsonlogger

import app.config as config


def _hash_params(params: Any) -> str:
    """SHA-256 tronqué (16 hex) — empreinte pour corrélation sans exposer les données."""
    raw = json.dumps(params, sort_keys=True, default=str).encode()
    return hashlib.sha256(raw).hexdigest()[:16]


def setup_logging() -> None:
    fmt = "%(asctime)s %(levelname)s %(name)s %(message)s"
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(jsonlogger.JsonFormatter(fmt))
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(getattr(logging, config.LOG_LEVEL.upper(), logging.INFO))


def log_tool_call(
    *,
    tool: str,
    params: Any,
    status: str,
    latency_ms: int,
    source: str = "MCP",
    error: str | None = None,
) -> None:
    logger = logging.getLogger("tool")
    extra: dict[str, Any] = {
        "tool": tool,
        "params_hash": _hash_params(params),
        "status": status,
        "latency_ms": latency_ms,
        "source": source,
    }
    if error:
        extra["error"] = error
    if status == "ok":
        logger.info("tool_call", extra=extra)
    else:
        logger.warning("tool_call_error", extra=extra)

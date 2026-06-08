"""
Point d entrée FastAPI.
- /health    : keep-alive Render free tier
- /mcp       : serveur MCP public (FastMCP, Streamable HTTP, auth Bearer)
- /chat      : endpoint orchestrateur LLM
"""
from __future__ import annotations

import contextlib

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import app.config as config
from app.logging_conf import setup_logging
from app.mcp_server import build_mcp_server
from app.orchestrator import orchestrate
from app.schemas import ChatRequest, ChatResponse

setup_logging()

mcp = build_mcp_server()


@contextlib.asynccontextmanager
async def lifespan(application: FastAPI):
    async with mcp.session_manager.run():
        yield


app = FastAPI(
    title="Liwaza eGov MCP",
    description="Plateforme eGov AI-native pour PME camerounaises",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def mcp_auth_middleware(request: Request, call_next):
    if request.url.path.startswith("/mcp"):
        if config.MCP_AUTH_TOKEN:
            auth = request.headers.get("Authorization", "")
            if auth != f"Bearer {config.MCP_AUTH_TOKEN}":
                return JSONResponse({"error": "Unauthorized"}, status_code=401)
    return await call_next(request)


app.mount("/mcp", mcp.streamable_http_app())


@app.get("/health")
def health():
    return {"status": "ok", "service": "liwaza-egov-backend"}


@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest) -> ChatResponse:
    return await orchestrate(request)

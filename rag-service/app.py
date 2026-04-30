"""
FastAPI wrapper around the personal-rag Retriever.

Exposes a single bearer-token-protected endpoint:
    POST /retrieve  { "query": str, "top_k": int = 6 }
    -> { "chunks": [ { text, source, source_type, score } ] }

The Retriever is imported from the vendored personal-rag library copied into
./rag/ at image build time (see Dockerfile).
"""
from __future__ import annotations

import os
import time
from typing import List, Optional

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from rag.retriever import Retriever

EXPECTED_TOKEN = os.environ.get("RAG_RETRIEVER_TOKEN", "")
PERSIST_DIR = os.environ.get("RAG_PERSIST_DIR", "./embeddings")

app = FastAPI(title="personal-rag-service", version="1.0.0")

_retriever: Optional[Retriever] = None
_warm_started_at: Optional[float] = None


def get_retriever() -> Retriever:
    global _retriever, _warm_started_at
    if _retriever is None:
        _retriever = Retriever(persist_directory=PERSIST_DIR)
        # Force a warm load so the first user request doesn't pay 3-5s of cold start.
        _retriever.count_documents()
        _warm_started_at = time.time()
    return _retriever


def check_auth(authorization: Optional[str]) -> None:
    if not EXPECTED_TOKEN:
        raise HTTPException(status_code=500, detail="server token not configured")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing bearer token")
    if authorization.removeprefix("Bearer ").strip() != EXPECTED_TOKEN:
        raise HTTPException(status_code=401, detail="bad token")


class RetrieveRequest(BaseModel):
    query: str = Field(min_length=1, max_length=1000)
    top_k: int = Field(default=6, ge=1, le=20)


class Chunk(BaseModel):
    text: str
    source: str
    source_type: str
    score: float


class RetrieveResponse(BaseModel):
    chunks: List[Chunk]


@app.on_event("startup")
def _startup() -> None:
    get_retriever()


@app.get("/health")
def health() -> dict:
    r = get_retriever()
    return {
        "ok": True,
        "chunks": r.count_documents(),
        "warmed_at": _warm_started_at,
    }


@app.post("/retrieve", response_model=RetrieveResponse)
def retrieve(req: RetrieveRequest, authorization: Optional[str] = Header(default=None)) -> RetrieveResponse:
    check_auth(authorization)
    r = get_retriever()
    raw = r.retrieve_with_metadata(query=req.query, top_k=req.top_k)
    chunks = [
        Chunk(
            text=item["text"],
            source=item["source"],
            source_type=item["source_type"],
            score=round(1.0 - float(item["distance"]), 4),
        )
        for item in raw
    ]
    return RetrieveResponse(chunks=chunks)

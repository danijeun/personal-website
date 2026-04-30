# syntax=docker/dockerfile:1.7
FROM python:3.11-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/app/.cache/hf \
    SENTENCE_TRANSFORMERS_HOME=/app/.cache/hf

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential curl && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Bake the embedding model into the image so the first request doesn't
# wait on a HuggingFace download.
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Vendor in the personal-rag retriever module. Build context expects:
#   ./rag/__init__.py
#   ./rag/retriever.py
# These are copied from /mnt/c/Users/Usuario/personal-rag/src/ via build.sh.
COPY rag/ ./rag/

# Bake the populated ChromaDB into the image. v1 has no write traffic, so we
# re-ingest locally and redeploy when content changes.
COPY embeddings/ ./embeddings/

COPY app.py .

EXPOSE 8080

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]

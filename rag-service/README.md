# rag-service

FastAPI wrapper around the personal-rag retriever, deployed to Fly.io.

## Endpoints
- `GET /health` — liveness + chunk count.
- `POST /retrieve` — bearer-token auth. Body: `{"query": str, "top_k": int}`.

## Deploy

```bash
cd rag-service
chmod +x build.sh && ./build.sh
fly launch --no-deploy   # first time only — keeps app name from fly.toml
fly secrets set RAG_RETRIEVER_TOKEN=$(openssl rand -hex 32)
fly deploy
```

Then put the same token + the `https://danijeun-rag.fly.dev` URL into Vercel as `RAG_RETRIEVER_TOKEN` and `RAG_RETRIEVER_URL`.

## Re-indexing
Embeddings are baked into the image. To refresh:
1. Re-run ingest in `personal-rag/` so `embeddings/` updates.
2. `./build.sh && fly deploy` here.

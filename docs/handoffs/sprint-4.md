# Sprint 4 handoff

## What shipped

### RAG service (`rag-service/`)
- `app.py` — FastAPI. `GET /health`, `POST /retrieve` (bearer token).
- Vendors `personal-rag/src/retriever.py` into the build via `build.sh`.
- Bakes the all-MiniLM-L6-v2 model and the populated `embeddings/` ChromaDB into the image to avoid cold start downloads.
- `fly.toml`: 1 GB shared CPU machine, `min_machines_running = 1` (warm), region `ewr`, health check on `/health`.
- Returns `score = 1 - distance` so the website can threshold easily.

### Chatbot
- `src/lib/rag/persona.ts` — inline persona / system prompt. No filesystem reads at request time.
- `src/lib/rag/client.ts` — server side typed client + `isContextTooWeak` and `formatContext` helpers.
- `src/pages/api/ask.ts` — SSE streaming, prompt cache on persona + first user message, refusal short circuit when retrieval is empty or all scores below 0.45.
- `src/pages/api/retrieve.ts` — debug-only proxy.
- `src/components/islands/AskWidget.tsx` — Motion-animated chat island, suggested starters, streaming render, source list, reset, 6-turn cap, 500-char input.
- `src/pages/ask.astro` — replaces the placeholder with the live widget.

### Eval + persona docs
- `qa/ask-eval.md` — ten reference questions plus refusal probes and perf gates.
- `src/content/persona.md` — long form persona doc that mirrors the inline `PERSONA` constant. Keep them in sync if either changes.

## What is left for Daniel to do

1. **Deploy `rag-service` to Fly.io.**
   ```bash
   cd rag-service
   chmod +x build.sh && ./build.sh
   fly launch --no-deploy   # accept name danijeun-rag from fly.toml
   fly secrets set RAG_RETRIEVER_TOKEN=$(openssl rand -hex 32)
   fly deploy
   curl https://danijeun-rag.fly.dev/health
   ```
2. **Add Vercel env vars** (Production + Preview):
   - `ANTHROPIC_API_KEY`
   - `RAG_RETRIEVER_URL=https://danijeun-rag.fly.dev`
   - `RAG_RETRIEVER_TOKEN=...` (same token)
   - Optional: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` for shared rate limiting (otherwise the edge function falls back to in memory, which is per region and resets on cold start).
3. **Run the eval.** `qa/ask-eval.md` has the ten questions. Send each through the deployed `/api/ask` and grade. 9/10 PASS gates the launch.
4. **Watch the numbers.** First two conversations should show prompt cache hits in the Anthropic dashboard. If not, check that `cache_control: ephemeral` is present on both system and the first user content block.

## Known gaps

- **Cache hit rate on the first turn is zero by design.** Cache writes only on the first turn; reads start on turn 2. The eval should treat single turn questions as cache misses.
- **In memory rate limiter** is per Vercel region. Upstash is a 5 minute add when Daniel is ready.
- **`pipeline.py` in personal-rag still references `claude-sonnet-4-20250514`.** Not blocking the website; flag for personal-rag cleanup.
- **No transcript logging.** Per the plan, only aggregate token + source counts are logged in `/api/ask` console output. No full transcripts are persisted.

## Smoke test

After deploy, from any machine:

```bash
curl -N https://danijeun.com/api/ask \
  -H 'Content-Type: application/json' \
  -d '{"question":"What is Daniel studying?","history":[]}'
```

Expect an SSE stream: one `meta` event with sources, several `delta` events, one `done`.

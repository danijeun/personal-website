// /api/ask — streams a Claude Haiku 4.5 response over SSE, grounded in
// chunks pulled from the Fly RAG service.
//
// - Prompt cache: persona system block + retrieved context are marked
//   cache_control ephemeral so turn 2+ in the same conversation hits cache.
// - Rate limit: 20 req per IP per day via Upstash REST. Falls back to an
//   in-memory limiter for local dev.
// - Hard caps: 6 turn conversation, 300 output tokens, 500 char user input.
import type { APIRoute } from "astro";
import { isContextTooWeak, formatContext, retrieve, RagError } from "../../lib/rag/client";
import { PERSONA } from "../../lib/rag/persona";

export const prerender = false;

const MODEL = "claude-haiku-4-5-20251001";
const MAX_OUTPUT_TOKENS = 300;
const MAX_USER_INPUT = 500;
const MAX_TURNS = 6;
const RATE_LIMIT_PER_DAY = 20;
const REFUSAL =
  "I don't actually know that one. Easier to just ask Daniel directly — danijeun@gmail.com.";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

interface AskBody {
  question?: unknown;
  history?: unknown;
}

const memHits = new Map<string, { count: number; reset: number }>();

async function rateLimit(ip: string): Promise<{ ok: boolean; remaining: number }> {
  const url = import.meta.env.UPSTASH_REDIS_REST_URL;
  const token = import.meta.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    const now = Date.now();
    const e = memHits.get(ip);
    const resetWindow = 24 * 60 * 60 * 1000;
    if (!e || e.reset < now) {
      memHits.set(ip, { count: 1, reset: now + resetWindow });
      return { ok: true, remaining: RATE_LIMIT_PER_DAY - 1 };
    }
    if (e.count >= RATE_LIMIT_PER_DAY) return { ok: false, remaining: 0 };
    e.count += 1;
    return { ok: true, remaining: RATE_LIMIT_PER_DAY - e.count };
  }

  const day = new Date().toISOString().slice(0, 10);
  const key = `ask:${day}:${ip}`;
  const incrRes = await fetch(`${url}/incr/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const incr = (await incrRes.json()) as { result: number };
  const count = Number(incr.result || 0);
  if (count === 1) {
    await fetch(`${url}/expire/${encodeURIComponent(key)}/86400`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  return { ok: count <= RATE_LIMIT_PER_DAY, remaining: Math.max(0, RATE_LIMIT_PER_DAY - count) };
}

function sse(event: string, data: unknown): Uint8Array {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  return new TextEncoder().encode(payload);
}

function parseHistory(raw: unknown): Turn[] {
  if (!Array.isArray(raw)) return [];
  const turns: Turn[] = [];
  for (const t of raw) {
    if (!t || typeof t !== "object") continue;
    const role = (t as { role?: unknown }).role;
    const content = (t as { content?: unknown }).content;
    if ((role === "user" || role === "assistant") && typeof content === "string") {
      turns.push({ role, content: content.slice(0, 4000) });
    }
  }
  return turns.slice(-MAX_TURNS);
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const apiKey = import.meta.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "model not configured" }), { status: 500 });
  }

  let body: AskBody;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "bad json" }), { status: 400 });
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question || question.length > MAX_USER_INPUT) {
    return new Response(JSON.stringify({ error: "question missing or too long" }), {
      status: 400,
    });
  }

  const ip = clientAddress || "unknown";
  const limit = await rateLimit(ip);
  if (!limit.ok) {
    return new Response(JSON.stringify({ error: "daily limit reached", remaining: 0 }), {
      status: 429,
    });
  }

  const history = parseHistory(body.history);

  let chunks;
  try {
    chunks = await retrieve(question, { topK: 6 });
  } catch (err) {
    if (err instanceof RagError) {
      console.error("rag error", err.status, err.message);
    } else {
      console.error("rag unknown error", err);
    }
    chunks = [];
  }

  // If retrieval failed or context is weak, short-circuit to the canned refusal.
  // We still stream it so the UI logic is the same.
  if (isContextTooWeak(chunks)) {
    return streamCanned(REFUSAL, limit.remaining);
  }

  const contextBlock = formatContext(chunks);
  const sources = chunks.map((c) => ({ source: c.source, score: c.score }));

  // Anthropic Messages API call with prompt caching on persona + first user
  // message (which carries the context block). Subsequent turns are not cached.
  const messages: Array<{
    role: "user" | "assistant";
    content: Array<{ type: "text"; text: string; cache_control?: { type: "ephemeral" } }>;
  }> = [];

  // Compose the first user message: context + the user's first turn from history,
  // or the current question if there is no prior turn.
  const firstUserText =
    history.length > 0 && history[0].role === "user"
      ? history[0].content
      : question;
  messages.push({
    role: "user",
    content: [
      { type: "text", text: contextBlock, cache_control: { type: "ephemeral" } },
      { type: "text", text: firstUserText },
    ],
  });

  // Replay middle turns (everything after the first user turn, except the latest
  // user question which we add at the end).
  const middle = history.slice(1);
  for (const t of middle) {
    messages.push({ role: t.role, content: [{ type: "text", text: t.content }] });
  }

  // Add the current question only if it's not already the last user turn in history.
  const lastIsCurrent =
    history.length > 0 &&
    history[history.length - 1].role === "user" &&
    history[history.length - 1].content === question;
  if (!lastIsCurrent && history.length > 0) {
    messages.push({ role: "user", content: [{ type: "text", text: question }] });
  }

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      stream: true,
      system: [
        {
          type: "text",
          text: PERSONA,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    console.error("anthropic error", upstream.status, detail);
    return streamCanned(REFUSAL, limit.remaining);
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(sse("meta", { sources, remaining: limit.remaining }));

      const reader = upstream.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          let idx: number;
          while ((idx = buf.indexOf("\n\n")) !== -1) {
            const block = buf.slice(0, idx);
            buf = buf.slice(idx + 2);

            const dataLine = block
              .split("\n")
              .find((l) => l.startsWith("data: "));
            if (!dataLine) continue;
            const json = dataLine.slice(6).trim();
            if (!json || json === "[DONE]") continue;

            try {
              const evt = JSON.parse(json);
              if (
                evt.type === "content_block_delta" &&
                evt.delta?.type === "text_delta" &&
                typeof evt.delta.text === "string"
              ) {
                controller.enqueue(sse("delta", { text: evt.delta.text }));
              } else if (evt.type === "message_stop") {
                controller.enqueue(sse("done", {}));
              }
            } catch {
              // skip malformed event
            }
          }
        }
      } catch (err) {
        controller.enqueue(sse("error", { message: String(err) }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
};

function streamCanned(text: string, remaining: number): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(sse("meta", { sources: [], remaining }));
      controller.enqueue(sse("delta", { text }));
      controller.enqueue(sse("done", {}));
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

export const GET: APIRoute = () =>
  new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });

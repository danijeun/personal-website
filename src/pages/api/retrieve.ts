// Server side helper that proxies a retrieval call to the Fly RAG service.
// Useful for debugging from the dev tools console; not called by the chat island.
// The shared token never leaves the server.
import type { APIRoute } from "astro";
import { RagError, retrieve } from "../../lib/rag/client";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: { query?: unknown; top_k?: unknown };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "bad json" }), { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  const topK = typeof body.top_k === "number" ? body.top_k : 6;
  if (!query || query.length > 500) {
    return new Response(JSON.stringify({ error: "query missing or too long" }), { status: 400 });
  }

  try {
    const chunks = await retrieve(query, { topK });
    return new Response(JSON.stringify({ chunks }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const status = err instanceof RagError ? err.status : 500;
    return new Response(JSON.stringify({ error: String(err) }), { status });
  }
};

export const GET: APIRoute = () =>
  new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });

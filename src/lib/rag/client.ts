// Server-side typed client for the Fly.io RAG retriever.
// Never import this from a browser entry point.

export interface RagChunk {
  text: string;
  source: string;
  source_type: string;
  score: number;
}

export interface RagResponse {
  chunks: RagChunk[];
}

export class RagError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function retrieve(
  query: string,
  opts: { topK?: number; signal?: AbortSignal } = {},
): Promise<RagChunk[]> {
  const url = import.meta.env.RAG_RETRIEVER_URL;
  const token = import.meta.env.RAG_RETRIEVER_TOKEN;
  if (!url || !token) {
    throw new RagError("RAG retriever is not configured.", 500);
  }

  const res = await fetch(`${url.replace(/\/$/, "")}/retrieve`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, top_k: opts.topK ?? 6 }),
    signal: opts.signal,
  });

  if (!res.ok) {
    throw new RagError(`retriever ${res.status}`, res.status);
  }
  const data = (await res.json()) as RagResponse;
  return data.chunks;
}

const DISTANCE_THRESHOLD = 0.45; // score = 1 - distance; 0.45 score == 0.55 distance

export function isContextTooWeak(chunks: RagChunk[]): boolean {
  if (chunks.length === 0) return true;
  return chunks.every((c) => c.score < DISTANCE_THRESHOLD);
}

export function formatContext(chunks: RagChunk[]): string {
  const parts = chunks.map((c, i) => {
    return `<chunk index="${i + 1}" source="${c.source}" type="${c.source_type}">\n${c.text.trim()}\n</chunk>`;
  });
  return `<context>\n${parts.join("\n\n")}\n</context>`;
}

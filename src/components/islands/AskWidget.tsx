import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

interface Source {
  source: string;
  score: number;
}

const MAX_INPUT = 500;
const MAX_TURNS = 6;

export default function AskWidget({ starters }: { starters: string[] }) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<Turn[]>([]);
  const [streaming, setStreaming] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [history, streaming]);

  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  async function send(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    if (history.length >= MAX_TURNS * 2) {
      setError("Six turns is the cap. Refresh to start a new conversation.");
      return;
    }
    setError(null);
    setSources([]);
    setBusy(true);
    setInput("");
    const nextHistory: Turn[] = [...history, { role: "user", content: q }];
    setHistory(nextHistory);
    setStreaming("");

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, history: nextHistory }),
        signal: ctrl.signal,
      });

      if (res.status === 429) {
        setError("Daily question limit hit on this network. Try again tomorrow, or email Daniel directly.");
        setHistory(history);
        setBusy(false);
        return;
      }
      if (!res.ok || !res.body) {
        setError("Something broke on the server. Try again in a moment.");
        setHistory(history);
        setBusy(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n\n")) !== -1) {
          const block = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          const lines = block.split("\n");
          const event = lines.find((l) => l.startsWith("event: "))?.slice(7) || "message";
          const dataLine = lines.find((l) => l.startsWith("data: "));
          if (!dataLine) continue;
          let data: any;
          try {
            data = JSON.parse(dataLine.slice(6));
          } catch {
            continue;
          }
          if (event === "meta") {
            if (Array.isArray(data.sources)) setSources(data.sources);
            if (typeof data.remaining === "number") setRemaining(data.remaining);
          } else if (event === "delta") {
            acc += data.text;
            setStreaming(acc);
          } else if (event === "done") {
            // handled below
          } else if (event === "error") {
            setError("The desk hit an error mid sentence. Try once more.");
          }
        }
      }

      setHistory((h) => [...h, { role: "assistant", content: acc }]);
      setStreaming("");
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError("Network error. Try again.");
      }
      setHistory(history);
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  function reset() {
    abortRef.current?.abort();
    setHistory([]);
    setStreaming("");
    setSources([]);
    setError(null);
  }

  return (
    <div className="mt-10">
      {history.length === 0 && !streaming && (
        <section className="mb-8">
          <p className="font-[var(--font-sans)] text-[11px] uppercase tracking-[0.18em] text-[var(--color-meta)]">
            Suggested questions
          </p>
          <ul className="mt-3 space-y-2">
            {starters.map((q) => (
              <li key={q}>
                <button
                  type="button"
                  onClick={() => send(q)}
                  className="text-left font-[var(--font-serif)] italic text-[var(--color-meta)] hover:text-[var(--color-ink)] hover:underline"
                >
                  &ldquo;{q}&rdquo;
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="space-y-8" aria-live="polite">
        <AnimatePresence initial={false}>
          {history.map((t, i) => (
            <motion.div
              key={i}
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {t.role === "user" ? (
                <div>
                  <p className="font-[var(--font-sans)] text-[11px] uppercase tracking-[0.18em] text-[var(--color-meta)]">
                    The reader asked
                  </p>
                  <p className="mt-2 font-[var(--font-serif)] text-[1.25rem] leading-snug text-[var(--color-ink)]">
                    {t.content}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-[var(--font-sans)] text-[11px] uppercase tracking-[0.18em] text-[var(--color-meta)]">
                    The desk replied
                  </p>
                  <p className="mt-2 whitespace-pre-wrap font-[var(--font-serif)] text-[1.0625rem] leading-relaxed text-[var(--color-ink)]">
                    {t.content}
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {streaming && (
          <div>
            <p className="font-[var(--font-sans)] text-[11px] uppercase tracking-[0.18em] text-[var(--color-meta)]">
              The desk is replying
            </p>
            <p className="mt-2 whitespace-pre-wrap font-[var(--font-serif)] text-[1.0625rem] leading-relaxed text-[var(--color-ink)]">
              {streaming}
              <span className="ml-0.5 inline-block h-[1.1em] w-[2px] -mb-[2px] bg-[var(--color-ink)] align-middle animate-pulse" />
            </p>
          </div>
        )}

        {sources.length > 0 && !streaming && history.length > 0 && (
          <p className="font-[var(--font-sans)] text-[11px] text-[var(--color-meta)]">
            Sources:{" "}
            {sources
              .slice(0, 4)
              .map((s) => s.source.split("/").pop())
              .filter(Boolean)
              .join(", ")}
          </p>
        )}

        {error && (
          <p className="font-[var(--font-sans)] text-[12px] italic text-[var(--color-accent,#a31621)]">
            {error}
          </p>
        )}
      </div>

      <div ref={endRef} />

      <form
        className="mt-10 border-t border-[var(--color-rule)] pt-6"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <label htmlFor="ask-input" className="sr-only">
          Ask a question
        </label>
        <div className="flex items-end gap-3">
          <textarea
            id="ask-input"
            value={input}
            maxLength={MAX_INPUT}
            rows={2}
            disabled={busy}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask something about Daniel."
            className="flex-1 resize-none border-0 border-b border-[var(--color-ink)] bg-transparent px-0 py-2 font-[var(--font-mono)] text-[15px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-meta)] focus:border-b-2 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="font-[var(--font-sans)] text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink)] underline-offset-4 hover:underline disabled:opacity-40"
          >
            {busy ? "Sending" : "Send"}
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between font-[var(--font-sans)] text-[11px] text-[var(--color-meta)]">
          <span>
            {input.length}/{MAX_INPUT} · enter to send, shift enter for newline
          </span>
          {history.length > 0 && (
            <button
              type="button"
              onClick={reset}
              className="hover:text-[var(--color-ink)] hover:underline"
            >
              Start over
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

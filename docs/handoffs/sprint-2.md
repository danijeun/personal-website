# Sprint 2 handoff — Frontend Agent → Backend / RAG Agents

## What landed
- **Newsreader** swapped in for Fraunces. Variable, opsz axis 6 to 72. Calmer, bookish, designed for on screen reading. Libre Franklin and IBM Plex Mono unchanged.
- **`/projects` index**: section front with kicker, headline, dek, chip filter (display only for now, no client filter island), full list of project article cards sorted by `order`.
- **`/projects/[slug]`** dynamic route reads from the `projects` content collection, renders through the new `Article` layout. MDX compiles, components like `<Figure>`, `<Sidebar>`, `<PullQuote>` are usable inside the body.
- **`Article` layout** under `src/layouts/Article.astro`: kicker, headline, dek, live byline, hero figure, body in serif with drop cap on the first paragraph, optional what broke sidebar, fact box, stack chips, back link.
- **Five project drafts** under `src/content/projects/`:
  - `foresee.mdx` (Tier A)
  - `fanar-mcp.mdx` (Tier A, bundles app and npm server)
  - `lets-play-brisca.mdx` (Tier A)
  - `wrf-rl.mdx` (Tier B, Capstone)
  - `heart-disease.mdx` (Tier B)
  Each pulls real facts from the GitHub READMEs. The body copy passes the voice rules but the **whatBroke** sidebars contain inline TODO markers asking Daniel for the honest version. Those replace before launch.
- **`/about`**: kicker, display headline, dek, live byline, headshot placeholder figure, body in serif with drop cap, fact box including the fencing one liner, link to `/ask` and `/contact`.
- **`/contact`**: channels fact box, an editorial styled form posting to `/api/contact`. The form submit endpoint does not exist yet, that's sprint 3.
- **`/ask`**: placeholder column with a sidebar explaining the chatbot lands in sprint 4. Suggested questions listed. Link to `/contact` as the human fallback.
- **Astro view transitions** (`<ClientRouter />` in `Base.astro`): 120ms route fade between pages, honors `prefers-reduced-motion`.

## Decisions baked in
- Article body uses a global `.prose-article` style block. First paragraph drop cap is automatic. `<h2>` is serif at h3 size, `<h3>` is small caps sans (the kicker style).
- The chip row on `/projects` is rendered but is not interactive. A `ProjectFilter` React island is on the sprint 3 backlog.
- All project articles use the same hero placeholder until Daniel uploads real images. The `<Figure>` component already supports both string URLs and Astro `ImageMetadata`, so the swap is one line per article.
- Live byline is used everywhere a byline appears, including project articles. The dateline rolls over to the visitor's local day.

## What the next agent has to do (Sprint 3, Backend / SEO)
- Build `/api/contact` Vercel function: validates payload, calls Resend, returns JSON. Add Upstash rate limit (5 per hour per IP).
- Wire the contact form to handle the response: success state, error state, both styled in editorial voice.
- SEO pass: per page Open Graph tags, JSON LD person schema on `/about`, an editorial OG image template that renders kicker plus headline plus dek on cream.
- Sitemap is auto generated, but verify `/dev/components` is excluded.
- Lighthouse CI workflow, gating prod deploys at perf 95, a11y 100, SEO 100.

## Blocked / waiting on Daniel
- Real headshot
- Hero images for foresee, fanar mcp, brisca, wrf, heart disease
- Honest "what broke" paragraphs for every project (the most important blocker)
- Resume PDF
- API keys: Resend, Anthropic, Upstash, RAG retriever
- Vercel project hooked up so the contact API can run

## Known to do, not blocking
- Self host fonts in sprint 5
- Build the React `ProjectFilter` island for chip based filtering on `/projects`
- Add Lighthouse CI workflow
- Refresh the chatbot eval set in `qa/ask-eval.md` once persona block exists

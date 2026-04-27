# Personal Website — Daniel Jeun Valenzuela

This file is the master plan and operating manual for the personal website project. It is also the contract between the orchestrator (you, Claude in this directory) and every sub agent that touches the codebase. Read it before doing anything. Update it when decisions change.

Owner: Daniel Jeun Valenzuela (danijeun@gmail.com)
GitHub: https://github.com/danijeun
LinkedIn: https://www.linkedin.com/in/danijeun
Devpost: https://devpost.com/danijeun
Repo: https://github.com/danijeun/personal-website
Domain: danijeun.com (registered with GoDaddy)
Current site: https://danijeun.github.io/danijeun_web/ (to be replaced)

---

## 1. What we are building

A personal site styled as an editorial publication, in the spirit of the New York Times. The format is the brand. A serif masthead, a strict grid, hairline rules between sections, italic photo captions, and project pages that read like feature stories instead of marketing one pagers.

Three jobs the site has to do, in order:
1. Tell people who Daniel is in under ten seconds.
2. Show the projects in a way that proves the work is real, not buzzword soup.
3. Give a clean way to reach him (email, GitHub, LinkedIn, optional resume) and a chatbot that can answer questions about him on demand.

The chatbot lives at a dedicated `/ask` page styled like a Q and A column. The Personal RAG system at `/mnt/c/Users/Usuario/personal-rag/` is the source of truth that grounds it. The chatbot is in scope for v1, not a stretch goal.

---

## 2. Voice and copy rules (non negotiable)

Every word that ships to a visitor goes through these filters. If a sentence fails any of them, rewrite it.

### Hard bans
- No hyphens. Anywhere. Use spaces, em dashes only where unavoidable, or just rephrase. "Full stack" not "full‑stack".
- No emojis. None. Not even one.
- No bullet points in the user facing prose sections (hero, about, project body). Bullets are fine in fact rows like a tech stack chip line, but not as a writing crutch.
- No corporate filler. Banned starter list: delve, leverage, utilize, robust, seamless, comprehensive, holistic, navigate (figurative), tapestry, landscape, realm, journey, unlock, empower, foster, elevate, harness, cutting edge, state of the art, in today's fast paced world, at the intersection of, passionate about, dedicated to, driven by.
- No transition crutches: furthermore, moreover, additionally, in conclusion, it is worth noting, this highlights, that said (sparingly ok), however (sparingly ok).
- No three item parallel lists used as sentence rhythm ("fast, scalable, and reliable"). That cadence is the single biggest AI tell.
- No false humility or false grandeur. He built a Brisca card game in 48 hours. Say that. Not "embarked on a journey to architect".

### Voice targets
- Honest. If a project is small, say small. If it has one star, fine, that is not the point.
- Funny in a dry way, not a stand up way. One small joke per page, max. Land it and move on.
- Direct. Subject, verb, object. Short sentences are good. One word sentences are fine.
- Specific. "Trained on 303 patient records, 87 percent recall on the held out set" beats "applied ML for healthcare insights".
- Varied rhythm. Mix a six word sentence with a twenty two word one. Read it out loud. If it sounds like a LinkedIn post, kill it.
- Use contractions. I'm, it's, that's, won't.
- First person. "I built this" not "this was built by".

### Copy smell test before shipping
Read the paragraph aloud. Then ask:
1. Could this sentence appear on any other portfolio? If yes, rewrite with a detail only Daniel would know.
2. Does the rhythm sound like a list? If yes, break the pattern.
3. Is there a word that sounds like a thesaurus pick? Swap it for the word a friend would use.
4. Is there a hyphen? Remove it.

---

## 3. Tech stack decision

### Frontend
- **Astro** as the framework. Portfolios are content first. Astro ships near zero JavaScript by default, hydrates only the islands we need (theme is fixed, so basically just project filter and chatbot).
- **MDX** through `@astrojs/mdx` so project pages can drop editorial components like `<PullQuote>` and `<Figure>` mid article.
- **React** islands for the interactive bits: project filter on `/projects`, chat widget on `/ask`. No theme toggle (light only).
- **Tailwind CSS v4** for styling. Utility first, scoped to a tight token set so it doesn't fight the editorial look.
- **Astro's built in image pipeline** (`astro:assets`) for responsive figures with captions.
- **Motion** (the library formerly known as Framer Motion) only for the chat island. Everything else uses CSS transitions or nothing.
- **Lucide** for the small handful of UI icons we need (mail, github, linkedin, arrow). Outline only.

Demoted or rejected:
- **GSAP**: cut. Editorial sites do not animate.
- **Lenis**: cut. Smooth scroll fights the calm of the format.
- **Three.js**: cut.
- **Next.js**: too heavy for static editorial content.
- **SvelteKit**: learning cost not worth it.
- **Dark mode**: cut. Light only is the design.

### Typography (the actual design system)
This site lives or dies on the type. Self host every font.

- **Display + body serif**: **Fraunces** (variable, free, Google Fonts open source). Plays the Cheltenham role for headlines and the body role at smaller weights. Optical sizing baked in, which is exactly what an editorial site needs.
  - Paid alternative if Daniel wants the real NYT feel: **GT Super** or **Tiempos Headline**, around 300 dollars one time. Decision deferred. Default to Fraunces and revisit before launch.
- **UI / meta sans**: **Libre Franklin** (free, the closest open analog to NYT's Franklin Gothic). For kickers, bylines, datelines, captions, nav, buttons.
- **Mono**: **IBM Plex Mono**. For code chips, labels, the chatbot input.

Sizes: a strict modular scale, not arbitrary. Hero headline around 64 to 96px on desktop, body 18 to 19px serif at 1.55 line height. Kickers 11 to 12px sans, all caps, letter spaced.

### Color
Monochrome. Background warm cream (around `#f7f3ec`), ink near black (around `#111`), rules and meta in a 60 percent gray. One single accent: a dark editorial red used only for the masthead rule and the "live" or "new" tag. Nothing else gets a color.

### Backend (only what we actually need)
No traditional server. Static build output plus three edge functions on Vercel.

1. `/api/contact` — receives the contact form, forwards to email via **Resend**.
2. `/api/ask` — proxies a chat message to the Claude API with the Personal RAG context injected. Streamed via server sent events. Rate limited per IP via **Upstash Redis**.
3. `/api/retrieve` — server side helper that calls the Personal RAG retriever endpoint with a shared secret. Never exposed to the browser.

### Database
- For the public site: none. Content lives as markdown / MDX collections in Astro.
- For the chatbot: reuse the existing **ChromaDB** vector store from `/mnt/c/Users/Usuario/personal-rag/`. The site does not own the embeddings. A small Python service wraps the existing Retriever and exposes `POST /retrieve` behind a token. Hosted on **Fly.io** free tier. One Dockerfile, one `fly deploy`.

### Claude API integration
- Model: `claude-haiku-4-5-20251001`. Cheap, fast, good enough for short factual answers.
- **Prompt caching** on the system prompt and the static persona block. Cache hits save real money over the life of the site.
- Streaming over server sent events to the browser.
- Hard limits: 300 output tokens per response, 20 requests per IP per day, 6 turn conversation cap.
- Refusal behavior: if a question falls outside the retrieved context, the bot says "I don't actually know that one, ask Daniel directly" and links the contact page. No invention.
- Eval set: ten reference questions with expected answer shape, kept under `qa/ask-eval.md`. The chatbot does not ship until it passes.

### Tooling
- Package manager: **pnpm**.
- TypeScript everywhere.
- **Biome** for lint + format. One tool, fast.
- **Playwright** for one smoke test that loads the homepage, opens a project article, submits the contact form against a mock, and sends one question to a mocked `/api/ask`.
- **Lighthouse CI** in GitHub Actions, fail the build if mobile perf drops below 95.

---

## 3a. Personal RAG integration spec (deep dive)

This section captures everything the Chatbot and RAG Service agents need to know about the existing personal-rag system at `/mnt/c/Users/Usuario/personal-rag/`. This is the source of truth for the `/ask` page.

### What exists today
- **Architecture**: three Python modules under `src/`. `ingest.py` loads files, chunks, embeds, writes to ChromaDB. `retriever.py` exposes a `Retriever` class with `retrieve()` and `retrieve_with_metadata()`. `pipeline.py` is an end to end query CLI using Sonnet 4. The website only uses `retriever.py`.
- **Vector store**: ChromaDB persistent client, on disk at `./embeddings/`. Collection name is `personal_rag`. Cosine similarity. Already populated: the `embeddings/` folder has a live `chroma.sqlite3` plus two collection UUIDs.
- **Embedding model**: `sentence-transformers/all-MiniLM-L6-v2`, 384 dim, runs on CPU, around 80MB on disk. Lazy loaded inside `Retriever`.
- **Chunking**: `RecursiveCharacterTextSplitter`, 500 chars, 50 overlap, splits on `\n\n`, `\n`, `.`, ` `.
- **Indexed sources** (live in `data/`):
  - `data/documents/`: resume PDF, NJIT transcripts, IBM AI Fundamentals, hackathon write up (Fanar), climate research paper, Daniel's profile txt, GitHub summary txt, LinkedIn profile txt, MixRank cover letter, more.
  - `data/social_media/gmail/`: Gmail exports tagged with `source_type: "email"`.
  - `data/github/`: per repo folders with READMEs and metadata.
- **Chunk schema**: `{document, metadata: {source, chunk_index, source_type}}` where `source_type` is one of `pdf`, `txt`, `md`, `docx`, `email`.
- **Retriever contract** (what the website's RAG service imports):
  ```python
  from src.retriever import Retriever
  r = Retriever(persist_directory="./embeddings")
  results = r.retrieve_with_metadata(query="...", top_k=5)
  # [{text, source, chunk_index, source_type, distance}, ...]
  ```

### What the RAG Service Agent has to build
A small **FastAPI** service in `rag-service/` that:
1. Imports `Retriever` from the personal-rag library (vendored in or installed as a local dependency).
2. Exposes `POST /retrieve` with body `{query: str, top_k: int = 5}` and bearer token auth.
3. Exposes `GET /health`.
4. Returns `{chunks: [{text, source, source_type, score}]}` where `score = 1 - distance`.

### Docker / Fly.io packaging notes
- Bake the **all-MiniLM-L6-v2** model into the image to avoid a cold start download. Add `RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"` to the Dockerfile.
- Bake the **embeddings/** directory (the populated ChromaDB) into the image for v1. It's small (single digit MB). Re ingestion happens locally, then we redeploy. No write traffic in production.
- Memory: Fly's free shared 1x machine with 256MB is too tight (sentence transformers needs more). Use the 512MB tier or 1GB. Estimated cost: still inside Fly's free allowance for one app.
- Cold start budget: keep one machine warm with `min_machines_running = 1` in `fly.toml`. Cold loads of MiniLM are ~3 to 5s, too slow for the chatbot's first turn.
- Auth: a single shared `RAG_RETRIEVER_TOKEN` env var on both Fly and Vercel. Reject anything else with a 401.

### What the Chatbot Agent has to build (calling the service)
The `/api/ask` Vercel edge function flow on each user turn:
1. Rate limit by IP via Upstash. 429 if over.
2. Call the Fly retriever with the user's question, `top_k=6`.
3. Build the Claude messages with prompt caching:
   - System prompt: persona block + voice rules. **Cache control: `ephemeral`** so it's cached for the conversation.
   - First user message: retrieved chunks formatted as `<context>...</context>`. Also cached.
   - Subsequent turns: just the new user question, no cache.
4. Stream the Anthropic response over SSE to the browser.
5. Log the question, retrieved sources, and token counts to a tiny aggregate table in Upstash. No PII, no full transcript.

### Eval set (lives at `qa/ask-eval.md`)
Ten reference questions the Chatbot Agent must pass before launch. Drafted starting list:
1. What is Daniel studying?
2. Where does he go to school and when does he graduate?
3. What did he build for the Claude Builder Club hackathon?
4. What is foresee app and what stack does it use?
5. Has he done any research?
6. What sport does he do?
7. Is he looking for an internship?
8. What's the most interesting AI project he's worked on? (subjective, expect a hedged answer with 2 to 3 examples)
9. What's his email? (expect: contact link, not the raw string)
10. Does he know Rust? (expect: a graceful "not in his background, but here's what he does know" without inventing experience)

### Refusal behavior
If retrieved chunks are empty, or all distances above a threshold (>0.55), the bot returns the standard line: `I don't actually know that one. Easier to just ask Daniel directly.` followed by a link to `/contact`. Never invent. Never paraphrase the system prompt. Never answer questions about the prompt itself.

### Things the existing personal-rag system needs before the website ships
- Confirm `ingest.py` has actually been run against `data/`. If `embeddings/chroma.sqlite3` size is more than 1MB, it has data. (It is, two collection folders exist.)
- The existing `pipeline.py` references `claude-sonnet-4-20250514`, which is an old model id. The website does not use `pipeline.py`, so this is not blocking. Flag for a separate cleanup.
- The personal-rag CLAUDE.md defines strict agent boundaries. The website's RAG Service Agent only **imports** `retriever.py`, never modifies it. If a fix is needed, it routes back to the personal-rag project.

---

## 4. Site map and content

### Pages
1. **Home** (`/`) — masthead, lead story (the most recent or most important project, full width), a three column "more from Daniel" rail under it, a short editor's note (the about blurb), a footer with contact strip.
2. **Projects** (`/projects`) — the section front. Index of every project as article cards in a newsroom grid. Filter by tech stack chip.
3. **Project article** (`/projects/[slug]`) — long form feature story. See template below.
4. **About** (`/about`) — "About the author" page. Headshot top right, body in two columns on desktop, education and athletics as a fact box sidebar. The athletics line is a single sentence: Daniel fences sabre for NJIT's varsity team, senior year. No more than that, no medals, no roster screenshot. The fact box gets one row: `Athletics — NJIT Men's Fencing, varsity, sabre, '26.`
5. **Ask** (`/ask`) — the chatbot, styled as a Q and A column. Static intro paragraph explaining what the bot is, three suggested starter questions as clickable kickers, a serif response area, a mono input box at the bottom.
6. **Contact** (`/contact`) — minimal page. Email, GitHub, LinkedIn, optional Devpost. A simple form for people who prefer that.
7. **404** — set in the headline serif. Layout: kicker `ERROR` in red, then a giant `404`, dek `Spiked.`, body line `Whatever you were looking for didn't make it past the desk.` and a link back to the home page styled as `Return to the front page →`. ("Spiked" is the newsroom term for a story killed before it ran. Insider joke, lands quietly, no one needs to get it.)

### Project article template
Every project page reads like a feature:
- Section kicker (small caps sans): "PROJECTS" or stack tag like "MACHINE LEARNING"
- Headline (display serif)
- Dek (one sentence subhead, serif italic)
- Byline ("By Daniel Jeun") + dateline ("Newark, March 2026")
- Hero figure with italic caption
- Body in two column flow on desktop, single column on mobile, drop cap on the first paragraph
- A pull quote halfway through (an honest line, not a marketing one)
- A "What broke" sidebar in a tinted box
- A fact box at the end: stack chips, role, year, links (github, live, devpost, paper, demo)

The "what broke / what I'd do differently" section is the anti AI tell. Every project gets one. That is where the honesty lives.

### Featured projects (first cut, from GitHub data)
Pick three for the homepage rail.

Candidates:
- **foresee app** — AutoML platform, CSV to ML insights in 60 seconds. React + Flask + Snowflake + Gemini.
- **fanar mcp app + fanar mcp server** — MCP architecture for an Islamic AI assistant. Hackathon. Bundle the two as one entry.
- **lets play brisca** — Spanish card game vs AI, built in 48 hours for the Claude Builder Club Challenge.
- **heart disease prediction** — ML model with SHAP, clinical framing.
- **wrf visualization app** — climate data viz, ties to the Capstone research thread.
- **digital postcards** — mobile first photo + text experience.
- **twitter analytics dashboard** — only if there are real screenshots.

Recommended featured three for the homepage rail: foresee app, fanar mcp, lets play brisca. The rest live on `/projects`.

### Full project ranking (from a deep read of the GitHub repos in personal-rag/data/github)

User has confirmed: do not hide any project. Show all of them, ranked by editorial weight. The old portfolio `danijeun_web` is the only exception — it is the predecessor to this site and gets retired, not surfaced.

**Tier A — featured on the homepage rail, full article on `/projects`**
1. **foresee app** (`foresee-app`) — AutoML, CSV to ML insights in 60 seconds. React + Flask + Snowflake + Gemini 2.5. The most ambitious project, real product, real stack. Headline of the section front.
2. **fanar mcp** (`fanar-mcp-app` + `fanar-mcp-server`) — MCP architecture for the Fanar Islamic AI assistant, with the novel angle that it works on LLMs without native function calling, via prompt engineering. The server is published to npm as `@danijeun/fanar-mcp-server`. Bundle the two repos as one article, link both.
3. **lets play brisca** (`lets-play-brisca`) — 48 hour Claude Builder Club Challenge. Spanish card game vs AI built entirely with Claude Sonnet 4.5. Real personality, the "missing game nights with friends" framing is the kind of detail this site lives on.

**Tier B — full article on `/projects`, not on the homepage rail**
4. **wrf rl computational steering** (`wrf-visualization-app`) — DS 493 Capstone. RL with a neural surrogate to tune a real WRF solar weather simulation against ARM SGP observations. SAC, Latin Hypercube Sampling, NJIT Wulver HPC. The serious research entry, headed for journal publication.
5. **sa i app** (`sa-i-app`) — Fanar AI email assistant on Telegram. Two server architecture (main MCP + tools), Gmail + Calendar + web search + image gen + voice. Hackathon scope but big surface area.
6. **heart disease prediction** (`heart-disease-prediction`) — UCI dataset, full preprocessing pipeline, SHAP interpretability, SMOTE for class imbalance. The clean ML fundamentals entry, useful for ML role applications.
7. **digital postcards** (`digital-postcards`) — React, mobile first photo + text experience with a retro TV intro animation. Live on github pages. The personality piece.

**Tier C — short cards on `/projects`, no full article unless Daniel wants one**
8. **twitter analytics dashboard** (`twitter-analytics-dashboard`) — surface only with a real screenshot, otherwise a one line entry.
9. **LLM interactive stream graph** (`LLM-InteractiveStreamGraph`) — needs a one paragraph note from Daniel before we know how to frame it.
10. **wordcount** (`wordcount`) — small CRA bootstrap. Honest "early experiment" card. Good to show range without pretending it is more than it is.

**Retired**
- `danijeun_web` — the previous portfolio. Do not show. It is being replaced by this site. Once danijeun.com is live, the GitHub Pages copy can be archived or redirected.

The article order on `/projects` follows the tier list. The chip filter lets visitors slice by stack tag.

### Per project markdown frontmatter
```
title
slug
kicker          (the section label, e.g. "MACHINE LEARNING")
dek             (one sentence subhead, under 110 chars, no hyphens)
year
role            (solo / team of N)
stack           (array of tech chips)
links           (github, live, devpost, paper, demo)
hero            (image path)
heroCaption     (italic caption)
heroCredit      (optional)
status          (shipped / archived / in progress)
featured        (bool)
pullQuote       (one sentence, sourced from the body)
whatBroke       (the sidebar text, can be markdown)
```

The body of the file is the article itself, in MDX, so we can drop in `<Figure>`, `<PullQuote>`, `<Sidebar>` mid flow.

### Contact info to include
- Email: danijeun@gmail.com
- GitHub: github.com/danijeun
- LinkedIn: linkedin.com/in/danijeun
- Resume PDF: served from `/static/Daniel_Jeun_Resume.pdf`. Daniel will upload the file later. Until then the resume link stays disabled.
- Devpost: devpost.com/danijeun
- NJIT fencing: confirmed in. Treat as a one line fact, not a section.

---

## 5. Design direction (NYT format)

The visual brief in one line: read like a section front of a newspaper, not a SaaS landing page.

### References to study
- **nytimes.com** itself. The masthead, the rules, the kicker treatment, the way captions sit under figures.
- **The Pudding** (pudding.cool) for editorial long form on the web.
- **Polygon's feature pages** for modern editorial layouts.
- **Robin Rendle** (robinrendle.com) for a personal site that uses editorial type seriously.
- **Brittany Chiang** for the "calm and quiet" benchmark, even if her site is dark.

### Core elements
- **Masthead**: site name set in display serif, small italic dateline under it ("Newark, NJ • Vol I"), a single horizontal red rule below. Nav links sit as small caps sans on the right.
- **Rules**: hairline horizontal rules separate sections everywhere. One pixel, full ink. No shadows.
- **Kickers**: section labels above every story headline, small caps sans, letter spaced, in red on the masthead, in gray everywhere else.
- **Drop caps**: the first paragraph of every project article and the about page gets a three line drop cap.
- **Figures**: every image has an italic caption directly underneath, plus an optional smaller credit line.
- **Pull quotes**: oversized serif italic, a hairline rule above and below, full bleed in the column.
- **Sidebars**: tinted box (5 percent ink on the cream), no border, sans serif heading, serif body. Used for "what broke" and fact boxes.
- **No shadows. No gradients. No glassmorphism. No neumorphism. No glow. No blur.**

### Motion
Near zero. The only motion that ships:
- 120ms fade between routes (Astro view transitions, free).
- Underline appears on link hover.
- Chatbot widget: messages slide in from the bottom, 200ms.
- Honor `prefers reduced motion` by killing all of it.

### Responsive
Mobile first. Breakpoints at 640, 768, 1024, 1280. The two column article flow collapses to a single column at 768. Sidebars become inline blocks on mobile. Tap targets at least 44 by 44. No horizontal scroll ever.

### Accessibility floor
- WCAG AA contrast (cream + near black is comfortably above).
- Keyboard navigable everywhere, visible focus rings (a red ink underline on focus).
- Semantic HTML: `<article>`, `<aside>`, `<figure>`, `<figcaption>`, one `<h1>` per page.
- Alt text on every image, written by a human, not "image of...".
- Skip link to main content.

---

## 6. Editorial component library

The Design System Agent owns these. Each ships with mobile + desktop states, focus state, hover state, reduced motion variant, and an example MDX usage.

- **Masthead** — site name + dateline + red rule + nav.
- **Kicker** — small caps sans label.
- **Headline** — display serif, optical sized.
- **Dek** — italic serif subhead.
- **Byline** — "By Daniel Jeun" + dateline, sans, small.
- **DropCap** — three line initial cap on the first paragraph.
- **Figure** — image + italic caption + optional credit.
- **PullQuote** — oversized italic serif with hairline rules.
- **Sidebar** — tinted box for "what broke" and fact rows.
- **FactBox** — labeled rows (Stack, Role, Year, Links).
- **Tag / Chip** — sans, small caps, used for tech stack and filter pills.
- **SectionRule** — the one pixel horizontal divider.
- **ArticleCard** — kicker + headline + dek + thumb, used on `/projects` and the homepage rail.
- **AskComposer** — mono input, send button, disclaimer line. Lives on `/ask` only.
- **AskBubble** — serif response block, italic byline ("The desk replied"), source links inline.
- **NotFound** — the 404 line in display serif.

---

## 7. Multi agent operating plan

You (the orchestrator in this directory) coordinate the work. You do not personally write every file. You spin up sub agents with tight scopes. Each agent gets a briefing that includes a link to this CLAUDE.md, the specific section it owns, and a definition of done.

### Agent roster

**1. Content Writer Agent**
Owns: every word a visitor reads. Hero, about, project articles, pull quotes, "what broke" sidebars, dekks, captions, 404 line, contact CTA, chatbot persona block, suggested starter questions on `/ask`.
Inputs: section 2, the Personal RAG profile data, the GitHub project summaries, Daniel's raw four question writeups per project.
Output: markdown / MDX files under `src/content/`.
Definition of done: every page passes the four question copy smell test. Zero hyphens. Zero emojis. Zero banned words. A second pass reads it out loud.

**2. Design System Agent**
Owns: tokens, typography scale, color, spacing, every editorial component listed in section 6.
Inputs: section 5, section 6.
Output: `src/styles/tokens.css`, `tailwind.config.ts`, every component under `src/components/ui/`, plus a `/dev/components` route demoing each one.
Definition of done: every component has a mobile and desktop state, a focus state, a hover state, a reduced motion variant. Passes WCAG AA at every size.

**3. Frontend Agent (Astro + MDX + React islands)**
Owns: routes, layouts, content collection schemas, project filter island.
Inputs: design system, content from the Writer agent.
Output: working pages at all routes in section 4, MDX rendering of project articles with custom components.
Definition of done: every page renders with no JS errors, Lighthouse mobile perf at least 95, no layout shift.

**4. Backend / API Agent**
Owns: `/api/contact` and `/api/ask` and `/api/retrieve`. Rate limiting. Email forwarding. Secrets.
Inputs: Resend API key, Anthropic API key, Upstash Redis credentials, the RAG retriever URL and shared token.
Output: edge functions, deployed.
Definition of done: contact form sends a real email to danijeun@gmail.com in production. Endpoint returns a 429 when rate limited. Streaming works for `/api/ask`. No secrets in the repo.

**5. RAG Service Agent**
Owns: the Python wrapper service around the existing Personal RAG retriever. Dockerfile. Fly.io deployment. Shared token auth.
Inputs: the existing `/mnt/c/Users/Usuario/personal-rag/` codebase.
Output: a deployed `POST /retrieve` endpoint with a known URL and token.
Definition of done: a `curl` from anywhere on the internet with the right token gets back relevant chunks for a sample query. Cold start under 3 seconds.

**6. Claude API / Chatbot Agent**
Owns: the system prompt, the static persona block, the prompt caching setup, the SSE streaming wiring, the eval set, the refusal behavior, the `/ask` page UX flow.
Inputs: RAG retriever endpoint, persona block from Content Writer, design components from Design System.
Output: working chat island on `/ask`, eval set under `qa/ask-eval.md`, a small dashboard or log showing eval pass rate.
Definition of done: bot answers all ten eval questions with the expected shape, refuses one out of scope question gracefully, streams smoothly on a slow 3G throttle, costs under one cent per conversation on average, prompt cache hit rate above 70 percent after the second turn.

**7. SEO + Metadata Agent**
Owns: `<head>` tags, Open Graph images (rendered as editorial covers, kicker + headline + dek on cream), sitemap, robots.txt, JSON LD person schema, RSS feed for projects.
Inputs: final copy, final images.
Output: a generated OG image per page in the editorial style, one sitemap.xml, structured data validated.
Definition of done: passes Google Rich Results test, has a real OG image for the home page and every project page.

**8. QA + Accessibility Agent**
Owns: Playwright smoke test, axe accessibility scan, manual keyboard run, real device check, the chatbot eval run.
Inputs: deployed preview URL.
Output: a checklist run per release in `qa/`.
Definition of done: zero axe critical issues, smoke test green in CI, manual keyboard pass on every interactive element, chatbot eval passes.

**9. DevOps / Deployment Agent**
Owns: GitHub repo, GitHub Actions CI, Vercel project, Fly.io project for the RAG service, custom domain, environment variables on both.
Inputs: this plan.
Output: pushing to `main` deploys the site within 2 minutes, every PR gets a preview URL, Fly app stays up.
Definition of done: live custom domain with TLS, Lighthouse CI gating production deploys, RAG service health check green.

### How agents coordinate
- Each agent works in a feature branch.
- The orchestrator opens PRs and merges them. No agent merges its own work.
- Cross agent questions go through the orchestrator, not directly. Keeps context windows clean.
- Every agent writes a `HANDOFF.md` at the end of its task summarizing what it did, what it left undone, and what the next agent needs to know. Archived under `docs/handoffs/`.
- The Content Writer agent has veto power on any user facing string a frontend agent invents. If the frontend needs filler text, request it, do not write it.

### Order of work
- **Sprint 0, half a day**: scaffold the Astro project, set up Biome, Tailwind, MDX, pnpm, deploy a hello page to Vercel. DevOps Agent.
- **Sprint 1, two days**: design tokens, typography pipeline (self host Fraunces, Libre Franklin, Plex Mono), every editorial component on `/dev/components`. Design System Agent. Content Writer drafts hero, about, and the persona block in parallel.
- **Sprint 2, three days**: home, projects index, two project articles, about, contact. Frontend Agent. Content Writer fills the rest.
- **Sprint 3, one day**: contact API, email wiring, SEO pass, OG image template. Backend + SEO agents.
- **Sprint 4, two days**: RAG Service Agent stands up the Fly.io retriever. Claude API Agent builds `/ask`, system prompt, eval set, streaming. End of sprint, eval has to pass.
- **Sprint 5, one day**: QA, a11y, real device pass, perf tuning. Then ship.

Total: roughly nine working days.

---

## 8. Repo layout (target)

```
personal-website/
  CLAUDE.md
  README.md
  astro.config.mjs
  tailwind.config.ts
  biome.json
  package.json
  pnpm-lock.yaml
  .github/workflows/         (ci.yml, lighthouse.yml)
  public/                    (favicons, resume pdf, robots.txt, fonts/)
  src/
    content/
      projects/              (one mdx per project)
      about.mdx
      home.md
      ask-intro.md
      persona.md             (chatbot persona block)
    components/
      ui/                    (Masthead, Kicker, Headline, Dek, Byline,
                              DropCap, Figure, PullQuote, Sidebar,
                              FactBox, Tag, SectionRule, ArticleCard)
      islands/               (ProjectFilter.tsx, AskWidget.tsx)
    layouts/
      Base.astro
      Article.astro
    pages/
      index.astro
      about.astro
      contact.astro
      ask.astro
      projects/index.astro
      projects/[slug].astro
      404.astro
      api/
        contact.ts
        ask.ts
        retrieve.ts
    styles/
      tokens.css
      global.css
    lib/
      rag/                   (typed client to the Fly retriever)
      cache/                 (prompt cache helpers)
  qa/
    accessibility.md
    smoke.spec.ts
    ask-eval.md
  docs/
    handoffs/
  rag-service/               (separate Python service, deployed to Fly.io)
    Dockerfile
    fly.toml
    app.py
    requirements.txt
```

The `rag-service/` folder lives in this repo for convenience but deploys independently to Fly.io. It does not get bundled into the Astro build.

---

## 9. Deployment plan

### Web (Vercel)
- Hosting: **Vercel** free tier. Edge functions included. Preview URLs per PR.
- Domain: **danijeun.com** (registered with GoDaddy). Point DNS to Vercel via either an A/AAAA record or a CNAME on www, and add an apex ALIAS / ANAME if GoDaddy supports it (it does, as "Forwarding" or via Cloudflare in front).
- TLS: handled by Vercel automatically.
- Branching: `main` is production. Every other branch gets a preview deploy. Previews are the staging.
- CI: GitHub Actions runs `pnpm install`, `biome check`, `astro build`, `playwright test`, `lhci autorun`. Fail closed.
- Rollback: Vercel keeps previous deploys. Promote a previous one if main breaks.
- Analytics: Vercel Analytics (privacy friendly, no cookies). No Google Analytics.

### RAG service (Fly.io)
- One Dockerfile, Python, FastAPI, calls into the existing personal-rag library.
- Single endpoint: `POST /retrieve`, requires bearer token.
- Free tier app, scale to zero ok if cold starts stay under 3 seconds, otherwise keep one warm machine.
- Health check `GET /health` polled by Vercel monitoring.

### Env vars
On Vercel:
- `RESEND_API_KEY`
- `CONTACT_TO_EMAIL=danijeun@gmail.com`
- `ANTHROPIC_API_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `RAG_RETRIEVER_URL`
- `RAG_RETRIEVER_TOKEN`

On Fly.io:
- `RAG_RETRIEVER_TOKEN` (must match Vercel)
- whatever the existing personal-rag system needs (Anthropic key for embeddings, etc.)

---

## 10. What Daniel needs to start building

### Decisions locked
- Light only, no dark mode.
- Chatbot ships on a dedicated `/ask` page in v1.
- NYT editorial format.
- Domain: **danijeun.com**, registered at GoDaddy.
- Fencing: in, but as a single line fact, not a section.

### Decisions still open
1. ~~Domain name~~ (locked: danijeun.com on GoDaddy).
2. ~~Devpost~~ (locked: devpost.com/danijeun).
3. ~~LinkedIn slug~~ (locked: /in/danijeun).
4. ~~Hide any project~~ (locked: show all, ranked by tier, retire only `danijeun_web`).
2. Devpost profile URL, if one exists.
3. LinkedIn vanity slug.
4. ~~Fencing on the about page~~ (locked: yes, one line).
5. Resume: ship the existing PDF, or refresh first.
6. Any project to hide.
7. Font budget: stay free with Fraunces + Libre Franklin + Plex Mono, or buy a Tiempos Headline / GT Super license (around 300 dollars one time).

### Accounts to create or confirm
- GitHub (have it)
- Vercel, free tier, log in with GitHub
- Cloudflare or Porkbun for the domain
- Resend for the contact form (free tier, 100 emails per day)
- Upstash Redis for rate limiting (free tier)
- Anthropic API key with API billing on (separate from Claude Pro)
- Fly.io account for the RAG service

### Local tooling
- Node 20 LTS or newer
- pnpm 9
- Git
- Docker Desktop (for the Fly.io RAG service)
- Fly CLI (`flyctl`)
- A real phone for responsive testing

### Content Daniel has to provide before sprint 2 ends
This is the bottleneck. Without it the project pages are empty.
- A headshot. Square, neutral background, phone is fine.
- One hero image or screenshot per featured project. Real screenshots, no Figma mockups.
- A short raw writeup per project answering four questions, in his own words, no editing for tone yet:
  1. What was the problem.
  2. What did you actually build.
  3. What broke or surprised you.
  4. What would you do differently.
- The current resume PDF (or a refreshed one).
- Any press, paper links, or hackathon judging notes worth citing as a "see also" sidebar on a project.

### RAG side, what has to be true before the chatbot ships
- The personal-rag system at `/mnt/c/Users/Usuario/personal-rag/` works end to end: ingest, embed, retrieve. Confirm by running a query locally and getting back relevant chunks.
- A FastAPI wrapper exposes one endpoint, `POST /retrieve {query, k}`, returning the top k chunks with metadata, behind a bearer token.
- It is deployed to Fly.io with a known URL.
- A persona block lives at `src/content/persona.md`, owned by the Content Writer agent, describing tone rules, what the bot will and will not answer.
- An eval set at `qa/ask-eval.md` lists ten real questions with expected answer shape.

---

## 11. Definition of done for v1 launch

- All five core pages live: home, projects, about, ask, contact.
- At least three project articles with real "what broke" sidebars and pull quotes.
- Contact form sends mail to danijeun@gmail.com in production.
- `/ask` chatbot answers the ten eval questions correctly, refuses out of scope ones gracefully, streams on slow 3G, costs under one cent per conversation on average.
- Lighthouse mobile: perf 95+, a11y 100, best practices 100, SEO 100.
- Zero axe critical issues.
- Zero hyphens, zero emojis, zero banned words in any user facing string.
- Deployed to a custom domain with TLS.
- RAG service on Fly.io healthy.
- Daniel has read every page out loud and approved it.

Out of scope for v1, tracked for v1.1: a notes / blog section, custom OG images per project beyond the template, multilingual support, a comment box on `/ask` for follow ups.

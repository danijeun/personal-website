# Sprint 1 handoff — Design System Agent → Frontend Agent

## What landed
- **Fonts wired** via Google Fonts CDN: Fraunces (variable, italic + roman), Libre Franklin (variable, italic + roman), IBM Plex Mono. Preconnect tags in `Base.astro`. Note: this is a temporary CDN dependency. Sprint 5 swaps to fully self hosted woff2 in `public/fonts/`. README in that folder lists the exact files needed.
- **Editorial component library** under `src/components/ui/`:
  - `Masthead.astro` — site name set in display serif, italic dateline, red 2px rule, sticky nav with active state in red
  - `Kicker.astro` — red, ink, or meta tone
  - `Headline.astro` — display, h1, h2, h3, with optical size set to 144 for the big sizes
  - `Dek.astro` — italic serif subhead
  - `Byline.astro` — author plus optional dateline
  - `SectionRule.astro` — hairline divider, tone variants
  - `Tag.astro` — chips, active state, optional href
  - `DropCap.astro` — three line initial cap on first paragraph of slot
  - `Figure.astro` — supports both string URLs and Astro `ImageMetadata`, italic caption, optional credit
  - `PullQuote.astro` — full bleed serif italic with hairline rules above and below
  - `Sidebar.astro` — tinted box with ink border on the left, used for "what broke"
  - `FactBox.astro` — `<dl>` rows for Stack, Role, Year, Links
  - `ArticleCard.astro` — kicker plus headline plus dek plus year, three sizes (lead, standard, compact), red hover
- **`/dev/components`** route demos every primitive on the cream background. Reachable in dev and prod (no auth gate, but it is not linked from the masthead). Useful for QA.
- **Home page rewritten** as a real section front: lede, headline, dek, byline, then a "Featured" rail with three ArticleCards (foresee, fanar mcp, lets play brisca) and a "More from the desk" link. All copy passes the voice rules.

## Decisions baked in
- Kicker color hierarchy: **red** for section kickers in the masthead and on featured cards, **meta** (gray) for body section labels, **ink** when something needs to feel like a tag.
- Active nav state uses red, not underline. Underline is reserved for hover.
- Tag default has a hairline border, active inverts to ink fill.
- DropCap is applied per article via a wrapper, not globally on every `<p>`. Avoids accidents.
- Figure supports a graceful string URL fallback so MDX can use external placeholders before we have local hero images.

## What the next agent has to do (Sprint 2, Frontend)
- Build the real `/about`, `/contact`, `/projects` index, `/projects/[slug]` article template.
- Author 3 to 5 project MDX files using the content collection schema in `src/content.config.ts`. Use the foresee, fanar mcp, and brisca content from CLAUDE.md section 4 as starting drafts.
- Wire the `Article` layout that pulls together kicker, headline, dek, byline, hero figure, body, pull quote, what broke sidebar, fact box.
- Add an Astro view transition for the 120ms route fade.
- Build the project filter island as a small React component reading the chip list from URL params.

## Blocked / waiting on Daniel
- Headshot for the about page hero figure
- Hero images for foresee, fanar mcp, brisca, and any other featured project
- Raw four question writeups per project (the most important blocker)
- Resume PDF
- Vercel project hooked up so we can see real preview URLs

## Known to do, not blocking
- Swap Google Fonts to self hosted woff2 in sprint 5
- Add `prefers-reduced-motion` short circuit to the 120ms route fade once it ships
- Audit a11y contrast at the smallest meta sizes against `--color-tint` background

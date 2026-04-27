# Self hosted fonts

Sprint 1 ships with Google Fonts as the source of truth so the site renders correctly today. Sprint 5 swaps this to fully self hosted woff2 files for performance and privacy.

When that swap happens, drop the following files into this folder:

- `fraunces/Fraunces[opsz,wght].woff2` (variable, italic and roman)
- `libre-franklin/LibreFranklin[wght].woff2` (variable, italic and roman)
- `ibm-plex-mono/IBMPlexMono-Regular.woff2`
- `ibm-plex-mono/IBMPlexMono-Medium.woff2`
- `ibm-plex-mono/IBMPlexMono-SemiBold.woff2`

Sources:
- Fraunces: https://fonts.google.com/specimen/Fraunces
- Libre Franklin: https://fonts.google.com/specimen/Libre+Franklin
- IBM Plex Mono: https://www.ibm.com/plex/

Subset to Latin. Add `@font-face` declarations in `src/styles/global.css` with `font-display: swap`, then remove the Google Fonts `<link>` tags from `src/layouts/Base.astro`.

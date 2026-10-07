# Rodemap

Campaign demo web app (Vite + React 19 + strict TypeScript, plain CSS from tokens) for a Vietnamese high-school student council election. The product name is **Rodemap** — never "Rode".

Read before changing anything:
- `DESIGN.md` — binding visual spec (tokens, components, motion, voice, a11y).
- `docs/ARCHITECTURE.md` — layer rules and the fixed module contracts.
- `docs/PROMPT.md` — the original product brief.

Hard rules (all enforced by `npm run check`):
- All UI copy and sample data in formal administrative Vietnamese; `npm run lint:copy` bans colloquial words/structures and emoji.
- No raw colors, font names, px/rem, gradients, raw shadows/durations/easings outside `src/styles/tokens.css` (`npm run lint:tokens`). Breakpoints 720px / 1080px are the only px allowed in media queries.
- `src/domain` is pure and 100 % covered. Components/pages never call localStorage, fetch or the Mochi client.
- Times are Asia/Ho_Chi_Minh; always use `src/domain/dates.ts`.

Commands: `npm run dev`, `npm test`, `npm run lint`, `npm run lint:tokens`, `npm run lint:copy`, `npm run typecheck`, `npm run build`, `npm run e2e`, `npm run screens`, `npm run check` (everything).
Playwright uses the preinstalled Chromium (`@playwright/test` pinned to 1.56.1 to match `/opt/pw-browsers/chromium-1194`); never run `playwright install`.

# AGENTS.md

### Do

- use React function components and hooks
- keep diffs small and focused
- use semantic theme tokens from `src/index.css`; do not hardcode raw hex in components
- keep user-facing copy in `src/locales/en.ts` and `src/locales/zh.ts`, accessed through `useI18n().t()`
- reuse `src/components/LPPLTrackerBase.tsx` for shared tracker UI
- keep market-specific fetching and symbol validation in the thin wrapper trackers
- use `btn-primary`, `btn-secondary`, `bg-card`, `bg-panel`, `border-border-var`, `text-text`, and `text-muted` before introducing new styling patterns
- prefer `pnpm exec biome check ...` on touched files during iteration
- run `pnpm check` before handoff when a change spans multiple surfaces

### Don't

- do not hardcode colors, copy, or duplicate layout patterns in components
- do not add new dependencies without approval
- do not change LPPL math or fitting behavior unless the task requires it
- do not fetch stock or commodity history directly from the browser when `api/stock/historical.ts` already covers the use case
- do not turn small tasks into repo-wide refactors

### Commands

```bash
# lint and format touched files
pnpm exec biome check src/components/PriceChart.tsx src/index.css
pnpm exec biome check path/to/file.tsx path/to/file.css

# type check the app
pnpm typecheck

# full validation
pnpm check

# local dev
pnpm dev
pnpm server
```

### Safety and permissions

Allowed without prompt:

- read files and search the repo
- run `pnpm exec biome check ...` on touched files
- run `pnpm typecheck`

Ask first:

- package installs
- deleting or renaming many files
- changing API providers or required environment variables
- deploy, release, or git push operations

### Project structure

- routes and header navigation: `src/App.tsx`
- global design tokens and interaction states: `src/index.css`
- theme provider: `src/lib/theme.tsx`
- i18n provider and translate helper: `src/lib/i18n-provider.tsx`, `src/lib/i18n.ts`
- locale dictionaries: `src/locales/en.ts`, `src/locales/zh.ts`
- shared tracker shell: `src/components/LPPLTrackerBase.tsx`
- chart rendering: `src/components/PriceChart.tsx`
- tracker wrappers: `src/components/LPPLTracker.tsx`, `src/components/StockLPPLTracker.tsx`, `src/components/CommodityLPPLTracker.tsx`
- stock and commodity history API proxy: `api/stock/historical.ts`
- product and API docs: `docs/LPPL-Guide.md`, `docs/API-SETUP.md`

### Good examples

- shared layout and card composition: `src/components/LPPLTrackerBase.tsx`
- token-driven chart styling: `src/components/PriceChart.tsx`
- small route-level page composition: `src/pages/CryptoLPPLPage.tsx`
- theme-aware icon controls: `src/components/ThemeToggle.tsx`, `src/components/LanguageToggle.tsx`

### API docs

- see `docs/API-SETUP.md` for API keys and provider setup
- see `docs/LPPL-Guide.md` for product and model context
- see `api/stock/historical.ts` for the server contract used by stock and commodity pages

### Design system

- read `DESIGN.md` before changing layout, visual language, or interaction feedback
- charts should use semantic tokens, not inline literals
- keep the UI technical, calm, and concise

### PR checklist

- touched files pass `pnpm exec biome check ...`
- TypeScript changes pass `pnpm typecheck`
- multi-surface changes pass `pnpm check`
- docs are updated when product rules or UX patterns change
- remove speculative code, logs, and unused copy before handoff

### When stuck

- inspect the nearest shared abstraction first
- make one small reversible change and validate it before widening scope
- if requirements conflict, ask one concise clarifying question with concrete options

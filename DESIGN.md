# DESIGN.md

## Product tone

LPPL is a technical monitoring tool, not a marketing site. The interface should feel calm, analytical, and low-noise.

- Favor concise labels over descriptive sentences.
- Use color as a signal, not decoration.
- Keep visual hierarchy obvious even when the screen is data-dense.

## Design tokens

Global visual tokens live in `src/index.css`.

- Backgrounds: `--bg`, `--card-bg`, `--panel-bg`
- Text: `--text`, `--text-secondary`, `--muted`
- Borders: `--border`
- Primary actions: `--accent`, `--accent-hover`, `--accent-text`
- Status colors: `--danger`, `--warning`, `--success`, `--info`

Rules:

- Do not hardcode raw hex values inside React components.
- Prefer semantic CSS variables or existing utility classes.
- Chart colors should come from the same semantic tokens: info for live price, accent for LPPL fit, warning for critical markers.

## Layout system

- App shell: sticky header, content below, max width `7xl`.
- Primary pages use card stacks with generous padding and small gaps.
- The main tracker surface is composed of:
  - a control panel card
  - a metrics row
  - a chart card
  - a parameter grid card
- Use rounded corners (`rounded-lg` / `rounded-xl`) and light borders rather than heavy shadows.

## Component patterns

- Header navigation uses pill-style tabs inside a muted panel.
- Theme and language toggles are 40x40 secondary icon buttons.
- Inputs are 40px tall, bordered, and theme-aware.
- Primary actions use `btn-primary`.
- Secondary actions use `btn-secondary`.
- Shared tracker layout and data presentation belong in `src/components/LPPLTrackerBase.tsx`.
- Market-specific fetch and validation logic belong in the thin wrapper trackers.

## Motion and interaction

- Standard transitions are short and restrained: 150ms to 200ms.
- Buttons lift slightly on hover and compress on active.
- Interactive icons may rotate or scale when the action benefits from feedback.
- All clickable surfaces must show pointer cursor on hover.
- Focus styles must remain visible and use the accent token.

## Content guidelines

- All user-facing copy should come from `src/locales/en.ts` and `src/locales/zh.ts`.
- Keep labels short: 1 to 3 words when possible.
- Prefer direct wording like `Risk`, `Update`, `Fit quality`, `Critical point`.
- Avoid emoji in UI copy unless the design explicitly needs it.
- Error text should be brief and actionable.

## Accessibility

- Use real `button`, `a`, `input`, and `select` elements for interaction.
- Provide `aria-label` where the UI is icon-only or abbreviated.
- Do not remove visible focus states.
- Preserve sufficient contrast in both light and dark themes.

## File anchors

- App shell and navigation: `src/App.tsx`
- Shared styles and tokens: `src/index.css`
- Shared tracker layout: `src/components/LPPLTrackerBase.tsx`
- Chart treatment: `src/components/PriceChart.tsx`
- Locale copy: `src/locales/en.ts`, `src/locales/zh.ts`

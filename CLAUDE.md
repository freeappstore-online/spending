# spending

GCP spending & visibility dashboard. Sign in with Google → see your projects, billing, budgets, APIs, Firestore databases, BigQuery cost breakdown, and Cloud Monitoring activity, **live**. No backend, no stored credentials, no nightly pipeline.

## Platform: FreeAppStore
- Hosted on Cloudflare Pages (static SPA only)
- ONE environment only (production). No dev/staging. Fix forward, no rollbacks.
- Push to `main` auto-deploys to production via CF Pages
- Domain: spending.freeappstore.online

## Tech Stack
- TypeScript, React 19, Vite 6, Tailwind CSS 4.1, pnpm
- `@freeappstore/sdk` from public npm (validates the published build)
- Google Identity Services (Token Client flow) for GCP OAuth
- GCP REST APIs called directly from the browser (CORS-enabled)
- No backend. Access token in memory only. Prefs in localStorage.
- Must work offline for the shell (PWA); data tabs need network

## Brand Guidelines
- Fonts: Manrope (body) + Fraunces (display)
- Follow CSS variables in `web/src/index.css` for colors
- Sidebar on desktop (17rem), bottom dock on mobile
- Dark mode via prefers-color-scheme (no toggle)
- Border radius: 1.25rem cards, 0.75rem buttons

## Setup (one-time, admin)
1. GCP Console → Credentials → create **OAuth 2.0 Client ID (Web application)**.
2. Authorized JS origins: **`https://spending.freeappstore.online`** only. No localhost.
3. `web/.env.production` holds `VITE_GOOGLE_CLIENT_ID=…apps.googleusercontent.com` (committed; OAuth client IDs are public identifiers, not secrets).

## Development
Production-only platform — no staging, no dev environment, no `pnpm dev` OAuth flow.

- `pnpm typecheck` — verify types before pushing
- `pnpm build` — sanity-check the production build locally
- `pnpm test` — run vitest
- `git push origin main` — the only deploy. CF Pages auto-builds on push.

For UI iteration that doesn't need OAuth/network (component layout, CSS), `pnpm dev` works against http://localhost:5173 — the sign-in screen will render but clicking the button will be rejected by Google because localhost isn't an authorized origin. That's intentional.

## Rules
- No analytics, no tracking, no cookies
- Access token stays in memory only — never written to localStorage
- All user prefs in localStorage only
- Include "Part of FreeAppStore" link in sidebar
- MIT license

## Architecture
```
src/
├── main.tsx           — React entry
├── App.tsx            — top-level routing between SetupNeeded / SignIn / Overview
├── components/
│   └── Shell.tsx      — FAS sidebar + mobile dock layout
├── hooks/
│   └── useGoogleAuth.ts — GIS Token Client wrapper
├── lib/
│   └── gcp.ts         — GCP REST helpers (currently: listProjects)
├── pages/
│   └── Overview.tsx   — proof-of-concept tab (project count)
└── types.ts           — GIS type declarations
```

The legacy `~/dev/spending/pipeline/fetch.py` is **superseded** by direct browser calls. Keep around for reference until tabs are ported; delete after.

## Platform Docs & Publishing
- **Full AI guide:** https://raw.githubusercontent.com/freeappstore-online/ops/main/SKILLS.md
- **Store registry:** ~/dev/stores/fas/freeappstore/registry.json
- **Deploy:** Push to main auto-deploys via GitHub Actions / CF Pages

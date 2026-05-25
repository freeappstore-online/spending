# spending

GCP spending & visibility dashboard. Sign in with Google → see your projects, billing, budgets, APIs, Firestore databases, BigQuery cost breakdown, and Cloud Monitoring activity, **live**. No backend, no stored credentials, no nightly pipeline.

- Subdomain: `spending.freeappstore.online`
- Dev: `pnpm install && pnpm dev`
- Build: `pnpm build`
- Deploy: `git push origin main` (auto-deploys to R2 via GitHub Actions)

Free, MIT-licensed, no tracking. For platform conventions, read
https://raw.githubusercontent.com/freeappstore-online/freeappstore/main/SKILLS.md
before writing or changing anything.

---

## Setup (one-time, admin)
1. GCP Console → Credentials → create **OAuth 2.0 Client ID (Web application)**.
2. Authorized JS origins: **`https://spending.freeappstore.online`** only. No localhost.
3. Set `VITE_GOOGLE_CLIENT_ID` as a GitHub repo Variable. The deploy workflow passes it to the build step. OAuth client IDs are public identifiers, not secrets.

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
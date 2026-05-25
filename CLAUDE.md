# gcp-spending

GCP spending & visibility dashboard. Sign in with Google, see your projects, billing, budgets, APIs, resources, Firestore databases, and auto-detected cost issues — live. No backend, no stored credentials.

- Subdomain: `gcp-spending.freeappstore.online`
- Dev: `pnpm install && pnpm dev`
- Build: `pnpm build`
- Deploy: `git push origin main` (auto-deploys to R2 via GitHub Actions)

Free, MIT-licensed, no tracking. For platform conventions, read
https://raw.githubusercontent.com/freeappstore-online/freeappstore/main/SKILLS.md
before writing or changing anything.

---

## Setup (one-time, admin)
1. GCP Console -> Credentials -> create **OAuth 2.0 Client ID (Web application)**.
2. Authorized JS origins: **`https://gcp-spending.freeappstore.online`** only.
3. Set `VITE_GOOGLE_CLIENT_ID` as a GitHub repo Variable. The deploy workflow passes it to the build step.

## Architecture
```
src/
├── main.tsx              — React entry
├── App.tsx               — auth gating + tab routing
├── components/
│   ├── Shell.tsx         — sidebar (desktop) + tab dock (mobile)
│   ├── Card.tsx          — stat cards + card grid
│   └── Table.tsx         — table, pill, external link primitives
├── hooks/
│   ├── useGoogleAuth.ts  — GIS Token Client wrapper
│   ├── useGcpData.ts     — fetches all GCP data, returns DashboardData
│   └── useHash.ts        — hash-based tab routing
├── lib/
│   ├── gcp.ts            — GCP REST API wrappers (projects, billing, budgets, services, resources, Firestore)
│   └── fmt.ts            — money/number formatting, project labels
├── pages/
│   ├── Overview.tsx      — inventory cards, top APIs, resource breakdown
│   ├── Projects.tsx      — filterable project table with status
│   ├── Billing.tsx       — billing account cards with linked projects + budgets
│   ├── Budgets.tsx       — budget table with thresholds
│   ├── Resources.tsx     — type-filtered resource table
│   ├── Idle.tsx          — idle project detection
│   ├── Apis.tsx          — enabled API usage table
│   ├── Firestore.tsx     — Firestore database listing
│   ├── Issues.tsx        — auto-detected cost optimization issues
│   └── Errors.tsx        — API fetch error log
└── types.ts              — GIS types + all data model interfaces
```

Data flows: Google OAuth -> GCP REST APIs (browser-direct) -> useGcpData hook -> tab components.

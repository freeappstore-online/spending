# spending

GCP spending & visibility dashboard. Sign in with Google → see live projects, billing, budgets, APIs, Firestore, BigQuery costs, and Cloud Monitoring activity. No backend, no stored credentials.

Live at https://gcp-spending.freeappstore.online.

## How it works

Pure SPA. On sign-in, Google Identity Services hands the browser a short-lived OAuth access token. The dashboard uses that token to call GCP REST APIs directly (Cloud Resource Manager, Cloud Billing, Service Usage, BigQuery, Cloud Monitoring, Firestore). The token expires in 1 hour; silent re-auth refreshes it transparently while you have a Google session.

No backend. No stored credentials. No nightly pipeline. Everything is live.

## Deploy

Production-only. `git push origin main` → GitHub Actions → R2 deploy → live in ~60s.

## License

MIT.

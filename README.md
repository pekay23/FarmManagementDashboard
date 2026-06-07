# Hughes Farms — Farm Management Dashboard

An **offline-first** PWA for small-to-mid mixed crop-and-livestock farms.
Dexie/IndexedDB is the source of truth on the device; the app syncs to
Postgres in the background and keeps working without internet.

**Live:** https://farm-management-dashboard.vercel.app

## Stack

- **Frontend** — Next.js 16 (App Router, Turbopack dev), React 19,
  TypeScript 6
- **Styling** — Tailwind CSS 4 (CSS-first `@theme`), Inter, Lucide icons
- **Local DB** — Dexie 4 (IndexedDB)
- **Server DB** — Postgres via `pg` / `@neondatabase/serverless`
- **Auth** — NextAuth v4 (credentials, JWT, multi-tenant)
- **PWA** — `next-pwa` (manifest + service worker)
- **Charts** — Recharts
- **PDF** — jsPDF + canvg (per-animal health booklets)
- **Theming** — `next-themes` with light + dark palettes
- **Lint** — ESLint 10 (with a small upstream-compat patch for
  `eslint-plugin-react`, applied automatically on every `bun install`)
- **Package manager** — bun

## Quick start

```bash
bun install           # Install deps (auto-applies the eslint-plugin-react patch)
cp .env.example .env.local
bun run dev           # http://localhost:3000
```

See [docs/guides/setup.md](./docs/guides/setup.md) for full setup,
[docs/guides/deployment.md](./docs/guides/deployment.md) for the Vercel
deployment walkthrough.

## Scripts

| Command            | What it does                                              |
| ------------------ | --------------------------------------------------------- |
| `bun run dev`      | Dev server (Turbopack) on http://localhost:3000           |
| `bun run build`    | Production build (webpack)                                |
| `bun run start`    | Run the production build locally                          |
| `bun run lint`     | ESLint 10                                                 |
| `bun run docs:html`| Regenerate the static HTML mirror of `docs/`              |

## Deploying

Hosted on **Vercel** — see [docs/guides/deployment.md](./docs/guides/deployment.md)
for the full walkthrough. Production URL:
**https://farm-management-dashboard.vercel.app**

Every push to `main` triggers a production deploy; every PR gets a
preview URL.

## Documentation

Full docs live in [`docs/`](./docs/README.md):

- [Architecture](./docs/architecture/system-overview.md) — what the
  app does, data model, offline sync flow
- [Design system](./docs/design/01-foundations.md) — colours,
  typography, components, motion
- [Guides](./docs/guides/setup.md) — setup, deployment, contributing
- [Audits](./docs/audits/known-issues.md) — known issues + workarounds
- [Plans](./docs/plans/future-plans.md) — roadmap

A static HTML mirror of the docs lives at `docs/html/index.html`
(regenerate with `bun run docs:html`).

## License

Private / client work. See `docs/PORTFOLIO-SUMMARY.md` for the public
write-up.

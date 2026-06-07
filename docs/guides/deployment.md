# Deployment

The app is configured to deploy to **Vercel** (see `vercel.json` in the
repo root). Production URL: **https://farm-management-dashboard.vercel.app**

## Vercel (primary)

`vercel.json` (already in the repo) wires up:

- Framework preset: `nextjs`
- Install command: `bun install`
- Build command: `bun run build` (Turbopack build is the future, see
  [Future plans → Turbopack-for-prod](../plans/future-plans.md))
- Region: `iad1` (US East, matches the Neon Postgres region)
- GitHub auto-aliasing on, so each push to `main` gets a production
  alias and every PR gets a preview URL
- Service-worker-friendly headers on `/sw.js` and `/workbox-*`
- Minimal security headers (`X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`)

### First-time setup

1. Push the repo to GitHub.
2. In Vercel, **Add new project → Import** the repo. Vercel auto-detects
   Next.js 16 + bun and applies `vercel.json`.
3. **Project → Settings → Environment Variables** — copy the three vars
   from `.env.local` (or from this table):

   | Var               | Value (example)                                                                            |
   | ----------------- | ------------------------------------------------------------------------------------------ |
   | `DATABASE_URL`    | `postgresql://neondb_owner:…@ep-purple-boat-…neon.tech/neondb?sslmode=require&…`           |
   | `NEXTAUTH_URL`    | `https://farm-management-dashboard.vercel.app/`                                            |
   | `NEXTAUTH_SECRET` | 32+ random bytes (generate with `openssl rand -base64 32`)                                |

   Set them for **all three** environments (Production, Preview,
   Development). The values can be identical if you use the same DB
   for all three — otherwise see [Branches & environments](#branches--environments).

4. **Deploy**. First build runs `bun install` (postinstall patch is
   safe in CI) followed by `bun run build`.

### Branches & environments

| Branch         | Vercel env  | URL                                              |
| -------------- | ----------- | ------------------------------------------------ |
| `main`         | Production  | `https://farm-management-dashboard.vercel.app`    |
| any other      | Preview     | `https://farm-management-dashboard-<hash>.vercel.app` |
| PR branch      | Preview     | `https://farm-management-dashboard-git-<branch>-<user>.vercel.app` |

By default, Preview deploys point at the **same** Neon database as
Production. To use a separate staging DB, add a `DATABASE_URL_STAGING`
env var and override it in the Preview environment.

### Continuous deployment

Every push to `main` triggers a **production** deploy (because
`autoAlias: true` in `vercel.json`). Pull requests get a **preview**
URL automatically.

## Local preview against production data

1. Copy the env vars from Vercel into `.env.local` (never commit).
2. `bun run dev` → http://localhost:3000.
3. The dev server is fully offline-first — read paths come from
   IndexedDB until the first sync; write paths queue and push to
   Postgres in the background. See [Data flow](../architecture/data-flow.md).

## Build verification

Before tagging a release, run:

```bash
bun run lint   # ESLint 10 (postinstall patch is required)
bun run build  # `next build --webpack` — full production build
bun run start  # Smoke-test the production server
```

## Migrations

Schema changes go through `scripts/schema.sql`. The current process is
**manual**: a maintainer applies the SQL against the production DB
during a low-traffic window. If you need to ship schema changes more
often, add a migration tool (e.g. `node-pg-migrate`) and a CI check.

## If you still need Netlify

The repo is no longer configured for Netlify (`netlify.toml` was
removed in the Vercel migration). To re-enable, restore the
`netlify.toml` from git history and follow Netlify's
[Next.js runtime docs](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/).

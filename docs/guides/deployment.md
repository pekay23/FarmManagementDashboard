# Deployment

The app is configured to deploy to **Vercel** (see `vercel.json` in the
repo root). Production URL: **https://farm-management-dashboard.vercel.app**

## Vercel (primary)

`vercel.json` (already in the repo) wires up:

- Framework preset: `nextjs`
- Install command: `bun install`
- Build command: `bun run build` (Turbopack via `next dev --turbopack`)
- Region: `iad1` (US East, matches the Neon Postgres region)
- **Git auto-deploy disabled** (`git.deploymentEnabled: false`, `github.enabled: false`)
  so Vercel cannot auto-deploy on push/PR — CI is the only deploy path
- Security headers on `/api/:path*` (moved into `next.config.ts` for all routes)
- Service-worker headers removed (PWA/next-pwa retired)

## Vercel CI-gated deployment (primary)

Deployments flow exclusively through `.github/workflows/ci.yml`:

1. **validate** job (runs on every push/PR to `main`):
   `bun install --frozen-lockfile` → lint → type-check → test → build-env
   validation → `bun run build`, all with `DATABASE_URL`, `NEXTAUTH_SECRET`,
   `NEXTAUTH_URL` from GitHub Secrets.
2. **deploy-preview** job (PRs only): `vercel deploy --target preview`,
   gated on `validate == success`. Fork PRs never deploy.
3. **deploy-production** job (push to `main` only): `vercel deploy --target
   production`, gated on `validate == success`. Runs in the `Production`
   environment (restricted to `main`).

The Vercel GitHub App and Netlify Git integrations are disconnected so no
path exists outside CI to deploy to Vercel. `vercel.json` is under
`/.github/CODEOWNERS` so any change to the deploy contract requires review.

### First-time setup

1. Push the repo to GitHub (branch `main` is protected).
2. In Vercel, **Add new project → Import** the repo. Vercel auto-detects
   Next.js 16 + bun and applies `vercel.json`.
3. **Disconnect** the project from GitHub in the Vercel dashboard
   (Settings → Git) so auto-deploy is off at the platform level.
4. **Project → Settings → Environment Variables** — set for Production +
   Preview:
   `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.
5. **GitHub repository Secrets** — mirror the same values:
   `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `VERCEL_TOKEN`.
6. **GitHub repository Variables**:
   `VERCEL_ORG_ID` (`team_xtlPeu6qXAdmKjbOmUWWY35o`),
   `VERCEL_PROJECT_ID` (`prj_QE0NhKb6d2GqT83xk85ar6rC4diq`).

### Branch protection

`main` is protected: required PR, required `validate` status check,
strict (up-to-date) branches, no force push, no deletions, admins enforced,
conversation resolution required.


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

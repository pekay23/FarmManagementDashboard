# Changelog

All notable changes to Hughes Farms are documented here. The format is
loosely based on [Keep a Changelog](https://keepachangelog.com/) and
this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed — hosting move (Netlify → Vercel)

- **Hosting**: switched from Netlify to **Vercel** (production URL
  `https://farm-management-dashboard.vercel.app`). `netlify.toml`
  removed; `vercel.json` added with `framework: nextjs`, bun install
  + bun build, `iad1` region (matches Neon), service-worker-aware
  cache headers, and minimal security headers.
- **Env files**: `.env.example` is now committed (whitelisted in
  `.gitignore`); `.env.local` holds the real values and stays
  ignored. Same three vars as before: `DATABASE_URL`,
  `NEXTAUTH_URL`, `NEXTAUTH_SECRET`.

## [0.2.0] — 2026-06-05

### Changed — full upgrade pass

- **Package manager**: switched from npm to **bun**. `package-lock.json`
  deleted; `bun.lock` is the source of truth. `postinstall` now re-applies
  the ESLint-10 compat patch (see Audits → Known issues).
- **Dependencies — all on latest**:
  - `next 16.1.1 → 16.2.7`, `react / react-dom 19.2.3 → 19.2.7`
  - `tailwindcss 3.4.19 → 4.3.0` (+ `@tailwindcss/postcss@4.3.0`),
    migrated to CSS-first `@theme` config; `tailwind.config.ts` removed
  - `lucide-react 0.562.0 → 1.17.0`
  - `dexie 4.2.1 → 4.4.3`, `jspdf 4.0.0 → 4.2.1`, `recharts 3.6.0 → 3.8.1`
  - `eslint 9.39.4 → 10.4.1` *(with upstream-compat patch — see audits)*
  - `typescript 5.9.3 → 6.0.3`
- **Dev script**: dropped the 3 GB `NODE_OPTIONS='--max_old_space_size=3072'`
  limit. Replaced the deprecated `--turbo` flag with `--turbopack` and
  removed the contradictory `--webpack` flag:
  - Before: `"dev": "NODE_OPTIONS='--max_old_space_size=3072' next dev --turbo --webpack"`
  - After:  `"dev": "next dev --turbopack"`

### Added

- **Full light + dark colour system** in `app/globals.css`: brand teal
  scale, semantic tokens (background/foreground/card/popover/primary/
  secondary/muted/accent/destructive/border/input/ring), sidebar gradient
  stops, 7-colour chart palette, success/warning/info status palette.
  JSX uses utilities like `bg-background`, `text-foreground`,
  `border-border`, `text-chart-3`, `bg-success-soft`.
- **Dark-mode toggle** (`next-themes` + custom `ThemeProvider` +
  `ThemeToggle` cycle button) sitting in the sidebar footer. Persists to
  `localStorage` and respects OS preference by default.
- **`postinstall` patch script** (`scripts/patch-eslint-plugin-react.mjs`)
  that re-applies the ESLint 10 → `eslint-plugin-react@7.37.5` compat
  shim on every `bun install`.
- **Documentation**: this folder (`docs/`) — architecture, design system,
  guides, audits, plans.

### Removed

- `package-lock.json` and the old `tailwind.config.ts` (replaced by the
  CSS-first `@theme` block in `globals.css`).
- The 3 GB V8 heap limit on the dev script.

## [0.1.0] — Initial release

- First usable build: dashboard, livestock, crops, inventory, employees,
  tasks, expenses, sales, reports, settings, admin user-management.
- Offline-first via Dexie (IndexedDB); two-way sync against a Postgres
  backend (via `pg` / `@neondatabase/serverless`).
- Auth via NextAuth credentials provider, JWT session, middleware-guarded
  routes, role split between farm users and platform super-admin.
- PWA shell via `next-pwa` (manifest, service-worker).

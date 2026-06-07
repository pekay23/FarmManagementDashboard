# System overview

Hughes Farms is an **offline-first** farm management PWA for small-to-mid
sized mixed crop-and-livestock operations. It runs in the browser (desktop
or tablet), keeps everything working without a network connection, and
reconciles changes against a central Postgres database whenever the
device comes back online.

## What the app does

A farm owner / manager uses the app to track:

- **Livestock** — animals by ID, species, breed, sex, weight, and full
  medical history (vaccinations, treatments, weigh-ins). A printable
  per-animal health booklet can be generated as PDF.
- **Crops** — plots, varieties, planting + expected harvest dates,
  treatment log, actual-vs-estimated yield.
- **Inventory** — seeds, feed, fertilizer, etc. with low-stock alerts
  driven by a per-item threshold.
- **Employees** — name, role, contact, active/inactive.
- **Tasks** — title, description, assignee, due-date, priority, status.
- **Expenses** — title, category, date, amount, notes.
- **Sales** — date, customer, contact, line items, total amount.
- **Reports** — KPI overview + period selection + PDF export.
- **Settings** — farm name, address, phone, email, tax rate, receipt
  footer, logo (white-labelling for the sidebar).

A separate **super-admin** role sees an aggregate dashboard across every
farm and a user-management screen (`/admin/users`).

## Top-level architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                       Browser (PWA shell)                        │
│  ┌───────────────────────┐    ┌──────────────────────────────┐  │
│  │   Next.js 16 client   │    │  Service worker (next-pwa)   │  │
│  │  App Router + Turbopack│    │  caches static assets,      │  │
│  │  React 19 + shadcn    │    │  enables install-to-home     │  │
│  └────────────┬──────────┘    └──────────────────────────────┘  │
│               │                                                  │
│       reads / writes                                            │
│               ▼                                                  │
│  ┌───────────────────────┐                                      │
│  │   Dexie (IndexedDB)   │   ← single source of truth on device │
│  │   9 typed tables      │                                      │
│  └────────────┬──────────┘                                      │
│               │                                                  │
│       sync (every 15s + on change)                              │
│               ▼                                                  │
│  ┌───────────────────────┐                                      │
│  │  Next.js API routes   │   /api/{entity} — REST-shaped        │
│  │  App Router handlers  │   CRUD per tenant, RBAC via session  │
│  └────────────┬──────────┘                                      │
└───────────────┼──────────────────────────────────────────────────┘
                │
                ▼
        ┌───────────────┐
        │   Postgres    │   single logical DB; row-level `farm_id`
        │  (Neon-ready) │   isolates every farm; super-admin bypass.
        └───────────────┘
```

## Tech stack

| Layer            | Choice                                        |
| ---------------- | --------------------------------------------- |
| Framework        | Next.js 16 (App Router, Turbopack dev)        |
| Language         | TypeScript 6 (strict)                         |
| UI               | React 19 + Tailwind CSS 4 (CSS-first `@theme`)|
| Components       | hand-rolled + shadcn/ui primitives             |
| Icons            | Lucide React 1.x                              |
| Charts           | Recharts                                      |
| Local DB         | Dexie 4 (IndexedDB wrapper)                   |
| Server DB        | Postgres (via `pg` + `@neondatabase/serverless`)|
| Auth            | NextAuth v4, credentials provider, JWT session |
| PWA             | `next-pwa` (service worker + manifest)        |
| PDF             | `jspdf` + `jspdf-autotable` + `canvg`         |
| Theming          | `next-themes` + CSS variables                 |
| Package manager | bun                                           |
| Lint            | ESLint 10 (with `eslint-config-next`)         |

## Roles

| Role         | Sees                                                                 |
| ------------ | -------------------------------------------------------------------- |
| Farm user    | Their farm only. Standard sidebar.                                   |
| Super admin  | Aggregated metrics across all farms + `/admin/users` management.     |

The role lives on the JWT (`is_superadmin` claim) and is read in
`middleware.ts`, the API handlers, and the sidebar.

## File layout

```
app/                     App-Router pages
  api/                   REST-shaped handlers
  admin/users/           Super-admin user management
  crops|employees|...    Per-feature pages
components/              Shared UI (Sidebar, Providers, ThemeToggle, …)
context/                 React contexts (SyncContext)
hooks/                   Reusable hooks
lib/                     Auth, db (Dexie), pg, pdf utils, logo
public/                  Static assets, PWA manifest
scripts/                 Build / patch scripts
docs/                    You are here
```

## Where to read next

- [Data model](./data-model.md) — every entity + sync status field
- [Data flow & offline sync](./data-flow.md) — how writes round-trip

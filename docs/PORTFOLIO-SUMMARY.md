# Portfolio summary

> Drop-in summary for a portfolio site. Each block is self-contained —
> paste the whole file, or just the bullets you need.

---

## At a glance

```
PROJECT:      Hughes Farms — Farm Management Dashboard
INDUSTRY:     Agriculture / AgriTech (offline-first PWA)
WHAT IT DOES: Lets small-to-mid farm owners run their mixed
              crop-and-livestock operation from a phone or tablet,
              even without internet, and syncs back to a central
              Postgres database when they're online again.
PROBLEM:      Smallholders in low-connectivity regions were still
              running their farms on paper ledgers and Excel sheets,
              losing data when devices failed and unable to coordinate
              with field workers.
SOLUTION:     Offline-first PWA — Dexie/IndexedDB as the single
              source of truth on the device, two-way sync against
              Postgres, full CRUD for livestock, crops, inventory,
              employees, tasks, expenses, and sales, plus a printable
              animal health booklet (PDF), low-stock alerts,
              and a super-admin view that aggregates KPIs across
              multiple farms.
RESULT:       Used daily by a multi-farm operation in Ghana to
              replace paper ledgers. Zero data loss during multi-day
              offline windows; livestock health booklets now go
              straight to the vet instead of being hand-transcribed.
PERMISSION:   It's mine (original client work; can anonymise on
              request).
LINKS:        https://github.com/pekay23/FarmManagementDashboard
```

---

## Formatted for a portfolio card

**Hughes Farms — Farm Management Dashboard** · Agriculture
An offline-first Next.js + Dexie PWA that runs a mixed crop &
livestock operation from a phone in a barn, syncs to Postgres when
the network returns, and emits a per-animal health booklet (PDF) the
vet can read on the spot. Built to replace paper ledgers for a
multi-farm operation in Ghana.

**Stack** — Next.js 16 (App Router, Turbopack) · React 19 · TypeScript
6 · Tailwind CSS 4 (CSS-first `@theme`) · Dexie 4 (IndexedDB) ·
Postgres (`pg` + `@neondatabase/serverless`) · NextAuth v4 ·
Recharts · jsPDF · `next-themes` (light + dark) · bun · ESLint 10.

**Highlights**

- **Offline-first by design**: every screen reads from and writes to
  IndexedDB; a 15 s poll + on-focus push keeps Postgres in sync
  when the network is up, and queues writes when it's not.
- **Soft-delete + sync-status field** on every entity keeps the
  local store and the server mirror eventually consistent without
  losing audit history.
- **Multi-tenant by `farm_id`** with a separate super-admin role that
  sees an aggregate cross-farm dashboard.
- **Full light + dark design system** (brand teal scale, semantic
  tokens, sidebar gradient, 7-slot chart palette, status trios)
  with a `next-themes` toggle in the sidebar that persists across
  sessions.
- **PDF generation** for the animal health booklet — rendered with
  jsPDF + canvg from the same base64-embedded logo used in the UI.
- **PWA shell** with manifest + service worker so the app installs
  to the home screen on Android tablets.
- **bun** + `postinstall` patch for the one upstream
  `eslint-plugin-react` → ESLint 10 incompatibility (documented in
  `docs/audits/known-issues.md`).

---

## One-paragraph version (for "About this project")

Hughes Farms is an offline-first farm management PWA I built for a
multi-farm operation that needed to keep working in low-connectivity
areas of Ghana. It runs on Next.js 16 + React 19 + Tailwind 4 with
Dexie as the local source of truth, syncs to Postgres in the
background, and gives the owner a real-time view of crops, livestock,
inventory, tasks, expenses, and sales — plus a printable per-animal
health booklet the vet can read on the spot. The UI ships with a
full light + dark design system built on CSS variables and a
`next-themes` toggle. The project is fully self-bootstrapped with
bun; the only environmental quirk (a `react/display-name` ↔ ESLint
10 compat shim) is auto-applied by a `postinstall` script and
documented in the repo.

---

## Drop-in bullets (for a project card or "what I did" list)

- Designed and shipped the full UX — 10 feature areas (dashboard,
  livestock, crops, inventory, employees, tasks, expenses, sales,
  reports, settings) plus a super-admin console.
- Built the offline-first data layer: Dexie schemas, sync-status
  lifecycle, soft-delete convention, 15 s poll + on-focus sync,
  conflict resolution.
- Implemented the full light + dark design system on Tailwind 4's
  CSS-first `@theme`, with a `next-themes` toggle that persists.
- Migrated from npm + a 3 GB `--max-old-space-size` dev hack to
  bun, bumped every dep to latest (next 16.2.7, react 19.2.7,
  tailwind 4.3, typescript 6, eslint 10), and pinned the
  one upstream incompat with a `postinstall` patch.
- PDF generation: per-animal health booklet with embedded logo
  (jsPDF + canvg).
- PWA shell: manifest, service worker, install-to-home-screen.
- Wrote the docs (`docs/architecture`, `docs/design`,
  `docs/guides`, `docs/audits`, `docs/plans`) following the same
  template as my other projects.

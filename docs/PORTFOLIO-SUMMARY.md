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
              employees, tasks, expenses, and sales, plus geo-tagged
              field scouting, harvest traceability batches, work-order
              management, strategic farm planning, file attachments,
              a sync-conflict resolution console, a live weather widget,
              a printable per-animal health booklet (PDF), low-stock
              alerts, and a super-admin view that aggregates KPIs
              across multiple farms.
RESULT:       Used daily by a multi-farm operation in Ghana to
              replace paper ledgers. Zero data loss during multi-day
              offline windows; livestock health booklets now go
              straight to the vet instead of being hand-transcribed.
PERMISSION:   It's mine (original client work; can anonymise on
              request).
LINKS:        https://github.com/pekay23/FarmManagementDashboard
              https://farm-management-dashboard.vercel.app
```

---

## Formatted for a portfolio card

**Hughes Farms — Farm Management Dashboard** · Agriculture  
An offline-first Next.js + Dexie PWA that runs a mixed crop &
livestock operation from a phone in a barn, syncs to Postgres when
the network returns, and emits a per-animal health booklet (PDF) the
vet can read on the spot. Now spans 16 feature areas — including
geo-tagged field scouting, harvest traceability, work orders, and
farm planning — and is deployed to Vercel with Neon Postgres as the
cloud backend. Built to replace paper ledgers for a multi-farm
operation in Ghana.

**Stack** — Next.js 16 (App Router, Turbopack) · React 19 · TypeScript
6 · Tailwind CSS 4 (CSS-first `@theme`) · Dexie 4 (IndexedDB, v3
schema) · Postgres (`pg` + `@neondatabase/serverless`) · NextAuth v4 ·
Recharts 3 · jsPDF 4 + jspdf-autotable · Leaflet (map selector) ·
Sonner (toast) · lucide-react · `next-themes` (light + dark) ·
`next-pwa` · bun · ESLint 10 · Vercel.

**Highlights**

- **Offline-first by design**: every screen reads from and writes to
  IndexedDB; a 15 s poll + on-focus push keeps Postgres in sync
  when the network is up, and queues writes when it's not.
- **Soft-delete + sync-status field** on every entity keeps the
  local store and the server mirror eventually consistent without
  losing audit history.
- **Sync-conflict resolution console**: detects and surfaces
  local vs. server divergences so the user can accept, reject, or
  ignore each conflict individually.
- **Multi-tenant by `farm_id`** with a separate super-admin role that
  sees an aggregate cross-farm dashboard.
- **16 feature areas**: dashboard, livestock (+ health logs),
  crops (+ treatments), inventory, employees, tasks, expenses, sales,
  reports, settings, field scouting, work orders, traceability,
  farm planning, attachments, and the super-admin console.
- **Geo-tagged field scouting**: log crop pressure observations with
  severity triage, a Leaflet-powered map pin picker, and an
  open/monitoring/resolved workflow.
- **Harvest traceability**: register quality-graded batch records
  (field → market), auto-generate batch numbers, link to source crops.
- **Work-order management**: create, assign, and progress equipment
  or field operations through Draft → In Progress → Completed states.
- **Farm planning module**: author Crop Rotation, Financial, and
  Resource plans keyed to a season/year and stored offline-first.
- **File attachments**: attach documents or images to any entity
  (crop, livestock, task, etc.) with offline storage in IndexedDB
  and optional sync to the server.
- **Live weather widget**: auto-locates the device (GPS → IP → Accra
  fallback), calls the Open-Meteo API, caches for 1 hour in
  `localStorage`, and shows current conditions + 3-day forecast in
  a dark teal glassmorphism card on the dashboard.
- **Full light + dark design system** (brand teal scale, semantic
  tokens, sidebar gradient, 7-slot chart palette, status trios)
  with a `next-themes` toggle in the sidebar that persists across
  sessions.
- **PDF generation** for the animal health booklet — rendered with
  jsPDF + canvg from the same base64-embedded logo used in the UI.
- **PWA shell** with manifest + service worker so the app installs
  to the home screen on Android tablets.
- **Hosted on Vercel** with `bun install` + `bun build`, `iad1`
  region co-located with Neon Postgres, and service-worker-aware
  cache headers.
- **bun** + `postinstall` patch for the one upstream
  `eslint-plugin-react` → ESLint 10 incompatibility (documented in
  `docs/audits/known-issues.md`).

---

## One-paragraph version (for "About this project")

Hughes Farms is an offline-first farm management PWA I built for a
multi-farm operation that needed to keep working in low-connectivity
areas of Ghana. It runs on Next.js 16 + React 19 + Tailwind 4 with
Dexie 4 (v3 schema, 15 tables) as the local source of truth, syncs to
Neon Postgres in the background, and gives the owner a real-time view
across 16 feature areas: dashboard, livestock (with health logs),
crops (with treatments), inventory, employees, tasks, expenses, sales,
reports, settings, geo-tagged field scouting, work-order management,
harvest traceability, farm planning, file attachments, and a
sync-conflict resolution console. The UI ships with a full light + dark
design system built on CSS variables and a `next-themes` toggle, plus
a live weather widget (Open-Meteo, GPS-located, 1 h cache). A
per-animal health booklet is generated on-device with jsPDF and
printable for the vet. The project is bootstrapped with bun, deployed
to Vercel, and the only environmental quirk (a `react/display-name` ↔
ESLint 10 compat shim) is auto-applied by a `postinstall` script and
documented in the repo.

---

## Drop-in bullets (for a project card or "what I did" list)

- Designed and shipped the full UX — 16 feature areas (dashboard,
  livestock, crops, inventory, employees, tasks, expenses, sales,
  reports, settings, field scouting, work orders, traceability,
  farm planning, attachments, sync-conflict console) plus a
  super-admin cross-farm console.
- Built the offline-first data layer: Dexie v3 schema (15 tables),
  sync-status lifecycle, soft-delete convention, 15 s poll + on-focus
  sync, conflict detection with a user-facing resolution UI.
- Built geo-tagged field scouting with a Leaflet map-pin picker,
  severity triage, and an open/monitoring/resolved workflow.
- Added harvest traceability (quality-graded batches, auto-generated
  batch numbers, crop linkage) and a work-order system (Draft →
  In Progress → Completed) with employee and plot assignment.
- Added a strategic farm planning module (Crop Rotation, Financial,
  Resource plan types) and a file-attachment system that stores data
  offline in IndexedDB.
- Embedded a live weather widget: GPS → IP → Accra fallback,
  Open-Meteo API, 1 h `localStorage` cache, 3-day forecast.
- Implemented the full light + dark design system on Tailwind 4's
  CSS-first `@theme`, with a `next-themes` toggle that persists.
- Migrated from npm + a 3 GB `--max-old-space-size` dev hack to
  bun, bumped every dep to latest (Next 16.2.7, React 19.2.7,
  Tailwind 4.3, TypeScript 6, ESLint 10), and pinned the one upstream
  incompat with a `postinstall` patch.
- Migrated hosting from Netlify to Vercel: `vercel.json` with bun
  build, `iad1` region (co-located with Neon), service-worker-aware
  cache headers, and minimal security headers.
- PDF generation: per-animal health booklet with embedded logo
  (jsPDF + canvg + jspdf-autotable).
- PWA shell: manifest, service worker, install-to-home-screen.
- Wrote the docs (`docs/architecture`, `docs/design`,
  `docs/guides`, `docs/audits`, `docs/plans`) following the same
  template as my other projects.

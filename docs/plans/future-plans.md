# Future plans

Open roadmap. Anything in this doc is *intentional but not yet
scoped* — it is not a commitment. Add new RFCs at the top (newest
first), and link out to deeper plans when they exist.

---

## Conflict resolution → CRDT

**Today:** last-write-wins keyed on `updatedAt`. Acceptable for a
single-farm, single-user setup; risky for multi-device, multi-user.

**Goal:** adopt a proper CRDT layer (Yjs is the leading candidate
because it has a `y-indexeddb` provider that dovetails with our
existing Dexie + sync setup). Each entity would become a Yjs
document, and sync would push the Yjs update log instead of
last-write-wins snapshots.

**Why not now:** Big rewrite; needs a spike to confirm Yjs's binary
size + per-entity memory overhead is acceptable on low-end Android
tablets.

## Migrate to Turbopack for builds

**Today:** the `build` script still passes `--webpack` because the
Turbopack production build was not stable enough when the project
was upgraded. Dev uses Turbopack.

**Goal:** drop `--webpack` from `build` once Vercel signs off on
Turbopack-for-prod. Expected to land in Next.js 16.3 or 17.

## Add a migration tool

**Today:** schema changes are hand-applied as raw SQL.

**Goal:** introduce `node-pg-migrate` (or similar) with versioned
migrations under `migrations/` and a CI check that warns if
`docs/architecture/data-model.md` is out of sync with the latest
migration.

## Multi-language (i18n)

The data model already stores strings in plain English (`name`,
`title`, `notes`, …). To add support for Twi / Hausa / French (the
common languages on Ghanaian smallholdings), swap the column types
to JSONB keyed by locale, and use `next-intl` for UI strings.

## Replace `next-pwa` with Workbox direct

`next-pwa` is barely maintained. Migrate to hand-rolled Workbox
in `public/sw.js`, which is already a partial dependency via
`workbox-*` packages.

## Component library extraction

The shared patterns (Modal, StatusBadge, DetailRow, ActionButton)
are duplicated across feature pages. Extract them into
`components/ui/*` and add Storybook.

## Tests

Vitest + React Testing Library are not yet wired up. Add a
`bunx vitest` script and start with the sync layer (the only part
with non-trivial business logic).

## Settings → ThemeConfig in the DB

The theme toggle currently only persists in `localStorage`. A
future enhancement is to let per-farm `settings` table carry a
`default_theme` column so the brand can ship a dark-on-light (or
light-on-dark) default.

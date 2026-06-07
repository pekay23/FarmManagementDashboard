# Hughes Farms — Documentation

All project documentation lives in this folder, organised by purpose. Read it
in order if you're new to the codebase.

## Folder layout

```
docs/
├── README.md                   This index
├── CHANGELOG.md                Version history
├── architecture/               System reference — data model, data flow, sync
├── design/                     Design system (foundations, colors, type, …)
├── guides/                     Operational how-tos (setup, deploy, contribute)
├── audits/                     Historical audit reports + known issues
└── plans/                      RFCs + implementation roadmaps
```

## Naming conventions

- Filenames are lowercase `kebab-case` (`data-flow.md`, not `dataFlow.md`).
- Numbered design files use a `NN-slug.md` prefix so they sort into the
  correct reading order (`01-foundations.md`, `02-colors.md`, …).
- Chronological audit reports use a `YYYY-MM-DD-slug.md` prefix so they
  sort naturally.

## Architecture

System reference — read these to understand how Hughes Farms is built.

- [System overview](./architecture/system-overview.md)
- [Data model](./architecture/data-model.md)
- [Data flow & offline sync](./architecture/data-flow.md)

## Design

The full design system reference. Start with foundations, then colours.

- [01 · Foundations](./design/01-foundations.md) — voice, where tokens live, hex cheat-sheet
- [02 · Colors](./design/02-colors.md) — light + dark palette, semantic + chart + status
- [03 · Typography](./design/03-typography.md) — Inter, scale, line-heights
- [04 · Sizing & spacing](./design/04-sizing.md) — 4 px scale, breakpoints
- [05 · Components](./design/05-components.md) — buttons, cards, modals, forms
- [06 · Motion](./design/06-motion.md) — durations, easings, reduced-motion
- [07 · Icons & illustrations](./design/07-icons-illustrations.md) — Lucide, logo

## Guides

Operational how-tos — read these to *do* something.

- [Setup](./guides/setup.md) — install, env vars, first run
- [Deployment](./guides/deployment.md) — Vercel + environment matrix
- [Contributing](./guides/contributing.md) — branch + PR conventions, linting

## Audits

Historical audit reports and persistent issues.

- [Known issues](./audits/known-issues.md) — pre-existing lint warnings, deprecation
  warnings, and workarounds

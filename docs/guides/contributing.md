# Contributing

## Branch naming

| Prefix      | Use                                                |
| ----------- | -------------------------------------------------- |
| `feat/`     | New user-facing feature                            |
| `fix/`      | Bug fix                                            |
| `chore/`    | Refactor, dependency bump, tooling                 |
| `docs/`     | Markdown / docs-only change                        |
| `design/`   | Design system tokens or component changes          |

Examples: `feat/livestock-pdf-export`, `fix/sync-offline-crash`,
`chore/upgrade-tailwind-v4`.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/) so
`CHANGELOG.md` can be auto-generated later:

```
feat(crops): add per-treatment cost aggregation
fix(sync): avoid duplicate POST when two devices edit same row
chore(deps): upgrade tailwindcss to 4.3.0
docs(architecture): document multi-tenant row-level filtering
```

## Pull-request checklist

- [ ] `bun run lint` passes with **zero new errors** (pre-existing
      `no-explicit-any` warnings are tracked in
      [Known issues](../audits/known-issues.md)).
- [ ] If you touched `app/globals.css` or any color token, run a
      smoke test in **both** light and dark mode.
- [ ] If you added a new entity, mirror it in
      `docs/architecture/data-model.md` + add a sync status table.
- [ ] If you added a new icon, confirm it imports from
      `lucide-react` (no emoji).
- [ ] Screenshots in the PR description for any visual change.

## Code style

- **TypeScript strict** — no `any` in new code (cast through a
  `unknown` if you really have to).
- **Tailwind utility classes only** — no inline `style={{}}` for
  anything that could be a class.
- **`'use client'`** only when you need state, effects, or browser
  APIs. Pages that just render server data should stay server
  components.
- **Dexie reads in `useLiveQuery`** so the UI re-renders on sync.
- **Soft-delete** — never `db.<table>.delete(id)`; flip
  `syncStatus` to `'deleted'` and let the sync layer push it.

## Lint policy

- New code: 0 errors, 0 new warnings.
- Existing `no-explicit-any` warnings: allowed, but please fix them
  when you touch the file for unrelated reasons. The full backlog
  lives in [Known issues](../audits/known-issues.md).

## Reviewing

- At least **one approving review** from a maintainer.
- The author merges after CI is green.
- Squash-merge to keep `main` linear.

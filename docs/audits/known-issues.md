# Known issues

Persistent issues that aren't blockers but are worth knowing about.
Newly-discovered problems go here; resolved ones move to
`CHANGELOG.md`.

---

## ESLint 10 ↔ `eslint-plugin-react@7.37.5` compat shim

**Symptom:** `bun run lint` throws
`TypeError: contextOrFilename.getFilename is not a function`
while loading the `react/display-name` rule.

**Root cause:** ESLint 10 replaced `context.getFilename()` (method)
with `context.filename` (property). `eslint-plugin-react@7.37.5` still
calls the old method. There's no upstream `8.x` yet.

**Workaround:** `scripts/patch-eslint-plugin-react.mjs` (run
automatically by the `postinstall` script) monkey-patches
`node_modules/eslint-plugin-react/lib/util/version.js` to support
both APIs. The patch is idempotent and self-disables once upstream
fixes the issue.

**When this goes away:** bump to `eslint-plugin-react@8.x` (or a
fixed `7.38.x`) when it ships, delete `scripts/patch-eslint-plugin-react.mjs`,
remove the `postinstall` hook from `package.json`, and delete the
`react/display-name` override in `eslint.config.mjs`.

---

## Next.js 16 deprecation — `middleware.ts` → `proxy.ts`

**Symptom:** Dev server logs

```
⚠ The "middleware" file convention is deprecated.
  Please use "proxy" instead. Learn more: …
```

**Impact:** None yet — `middleware.ts` still works. Next.js 17 will
remove it.

**Workaround:** Rename `middleware.ts` → `proxy.ts` when the rest of
the ecosystem is ready. The `withAuth` import from `next-auth/middleware`
should still work; if it doesn't, swap to `next-auth`'s newer
`auth()` helper.

---

## `react/display-name` rule disabled

**Why:** Required to make `eslint-plugin-react@7.37.5` load under
ESLint 10 (see above). The shim lets the rule module load, but the
display-name check itself produces false positives in 19.2+ with
React Compiler, so we keep it off.

**Re-enable:** When upgrading to `eslint-plugin-react@8.x` *and*
confirming the rule still produces value with React Compiler.

---

## Pre-existing lint warnings

These existed before the upgrade pass and are tracked here so they
don't surprise new contributors:

- **`@typescript-eslint/no-explicit-any`** (≈260 occurrences) —
  legacy code, mostly in `lib/auth.ts`, `lib/db.ts`, `lib/pg.ts`, and
  feature page state. None of these are bugs; they're typed as `any`
  for ergonomic reasons. Fix in passing when you touch a file.
- **`react-hooks/set-state-in-effect`** (1 location) — `components/ThemeToggle.tsx`
  uses the canonical `next-themes` mount guard (`useEffect(() =>
  setMounted(true), [])`). Disabled with an inline comment because
  the React 19 rule's "don't set state in effects" advice is
  incorrect for this specific next-themes pattern (the effect's
  *only* purpose is to flip `mounted` after hydration).
- **`prefer-const`** (1 location) — `lib/pg.ts:20`. `let pool` should
  be `const pool`. Trivial fix; tracked here so it doesn't get lost.
- **268 implicit-any parameter warnings** — pre-existing, mostly in
  API route handlers (`app/api/**/*.ts`) and feature page
  callbacks. Fix in passing.

---

## `pg` SSL mode warning (`sslmode=require`)

**Symptom:** The Next.js dev server logs

```
(node:NNNN) Warning: SECURITY WARNING: The SSL modes 'prefer', 'require',
and 'verify-ca' are treated as aliases for 'verify-full'.
In the next major version (pg-connection-string v3.0.0 and pg v9.0.0),
these modes will adopt standard libpq semantics, which have weaker
security guarantees.
```

**Root cause:** The current Neon connection string uses
`?sslmode=require&channel_binding=require`. Today `pg-connection-string`
maps `require` → `verify-full`; in v3.0.0 it will map to libpq's
`require` (no CA verification, weaker security).

**Impact:** None today — the connection works exactly as `verify-full`
would. It's a forward-looking warning.

**Fix when ready (pick one):**
- **Keep current security, opt in explicitly:**
  ```
  DATABASE_URL=...?sslmode=verify-full
  ```
- **Use libpq semantics now, future-proof the connection string:**
  ```
  DATABASE_URL=...?sslmode=require&uselibpqcompat=true
  ```

Tracked in the upstream `pg-connection-string` repo
([connection-string PRs](https://github.com/brianc/node-postgres/tree/master/packages/pg-connection-string)).

## `401 Unauthorized` errors before first sign-in

**Symptom:** After a fresh `bun install` + `bun run dev` and visiting
`/login`, the dev server floods with:

```
Fetch employees error: Error: Unauthorized
  at getSessionInfo (app\api\employees\route.ts:10:23)
  ...
 GET /api/employees 401
```

(and the same for `/api/crops`, `/api/tasks`, `/api/inventory`,
`/api/sales`, `/api/expenses`, `/api/livestock`, `/api/treatments`).

**Root cause:** The login screen calls these endpoints to hydrate the
local Dexie cache *before* the user has signed in, so every fetch
correctly returns 401. The stack-trace noise in `console.error` is
unhelpful for this expected path.

**Workaround (one-time):** Bootstrap the first super-admin by hitting
the setup endpoint in your browser or with `curl`:

```
http://localhost:3000/api/setup/admin
```

It creates a `Default Farm` and a super-admin user
(`admin@farm.com` / `123`). After that, sign in and the 401s stop.
The endpoint is **idempotent-safe**: it returns 403 if a super-admin
already exists, so you can't accidentally re-run it.

**Long-term fix (future):**
- Move the unauthenticated `GET /api/*` to read straight from Dexie
  (which already has the data after first login) and skip the
  server-side fetch entirely.
- Or downgrade the `console.error` in the per-entity route handlers
  to `console.warn` for `UnauthorizedError` and skip the stack trace.

## Missing `@types/pg`

**Symptom:** `bunx tsc --noEmit` warns
`Could not find a declaration file for module 'pg'`.

**Impact:** None at runtime — `pg` ships its own ESM and works fine
in Node. The warning is purely a type-check artifact.

**Workaround:** `bun add -d @types/pg`. Not done in the upgrade
pass because it would touch `lib/pg.ts` and the dev install was
already large.

---

## `tailwind.config.ts` removed

**What changed:** With the Tailwind 3 → 4 migration, the old
`tailwind.config.ts` was deleted and its contents were migrated into
the CSS-first `@theme` block in `app/globals.css`.

**Why this matters for contributors:** any change to the design
tokens now lives in **one file** (`app/globals.css`) instead of two
(`tailwind.config.ts` + CSS variables).

---

## Sidebar still uses some hard-coded emerald/teal classes

The mobile-only top bar (`md:hidden`) and the brand-tile background
still use `bg-emerald-900`, `border-white/10`, etc. — these were
left as-is to keep the upgrade diff small. A future pass should
swap them for `bg-sidebar-from` / `border-sidebar-border` for full
dark-mode adaptation.

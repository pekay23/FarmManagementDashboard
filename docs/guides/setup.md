# Setup

Get a working dev environment in under five minutes.

## 1. Prerequisites

| Tool    | Min version | Notes                                  |
| ------- | ----------- | -------------------------------------- |
| bun     | 1.3.x       | The package manager. Install from [bun.sh](https://bun.sh). |
| Node    | 20.x        | Only required for `pg` / NextAuth.     |
| Postgres | 14+        | Local install, Docker, or Neon cloud.  |

## 2. Clone & install

```bash
git clone https://github.com/pekay23/FarmManagementDashboard.git
cd FarmManagementDashboard
bun install
```

`bun install` will:

1. Resolve the dependency tree.
2. Install into `node_modules/`.
3. Run `postinstall` → `scripts/patch-eslint-plugin-react.mjs`, which
   re-applies the ESLint-10 ↔ `eslint-plugin-react@7.37.5` compat
   shim. *(Safe to skip if upstream has shipped a fix; the script
   no-ops if the patch is already present or no longer needed.)*

## 3. Environment variables

Copy `.env.example` to `.env.local` in the repo root and fill in
real values (`.env.local` is git-ignored, `.env.example` is committed):

```bash
cp .env.example .env.local
```

The three required vars:

```env
# Postgres — Neon (pooled, ssl required)
DATABASE_URL=postgresql://USER:PASS@HOST/DBNAME?sslmode=require

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace-me-with-a-32-byte-random-string
```

Generate a strong `NEXTAUTH_SECRET` with:

```bash
openssl rand -base64 32
```

For the production / preview values, see
[Deployment → Vercel](./deployment.md#vercel-primary).

## 4. Database

Provision the schema. There's no Prisma file in this repo — the schema
lives as raw SQL. Apply it manually:

```bash
psql "$DATABASE_URL" -f scripts/schema.sql
```

*(If `scripts/schema.sql` doesn't exist in your checkout, see the
[Data model](../architecture/data-model.md) page for the column list
and create the tables from there.)*

## 5. Run the dev server

```bash
bun run dev
```

The app boots on http://localhost:3000 in ~2–3 s (Turbopack).

## 6. Seed an account

The signup flow lives at `/login` (it doubles as the create-account
form for the first user of a new farm). For local development you can
also `INSERT` a row directly:

```sql
INSERT INTO users (email, password, farm_id, is_superadmin)
VALUES (
  'admin@example.com',
  -- bcrypt hash of "password"
  '$2a$10$…',
  '00000000-0000-0000-0000-000000000001',
  true
);
```

The first super-admin lets you create more farms and users from the
`/admin/users` screen.

## 7. Bootstrap the first super-admin (one-time)

The first time you run the app, the `users` table is empty and every
protected API call returns `401 Unauthorized`. Bootstrap a super-admin
account by visiting the setup endpoint:

```
http://localhost:3000/api/setup/admin
```

The endpoint is **idempotent-safe**: it refuses to run if a
super-admin already exists (returns `403`). On success it creates:

- A `Default Farm` row
- A super-admin user with email **`admin@farm.com`** and password **`123`**

You'll see this in the dev-server logs as a one-time `POST` /
`GET` burst against the various `/api/*` routes.

**Change the default password immediately** under
`Profile → Security Settings` after first sign-in.

## 8. Verify

- `http://localhost:3000` → should redirect to `/login`.
- Sign in with `admin@farm.com` / `123`.
- The dashboard should load with empty KPI cards and a "0 active crops"
  empty-state.

## Common gotchas

- **`@types/pg` is not in `devDependencies`** — `tsc --noEmit` will
  warn about implicit-any on `lib/pg.ts`. Either install
  `bun add -d @types/pg` or ignore the warning; it doesn't affect
  runtime.
- **Service worker caching** — after changing anything in `public/`,
  do a hard reload (Cmd/Ctrl-Shift-R) or open DevTools → Application
  → Service Workers → Unregister.
- **Dark mode** — toggle via the sun/moon button in the sidebar
  footer. The choice persists in `localStorage` under the `theme` key.

# Setup

This guide describes the local setup recorded in the repository. It does not establish that every feature works without a configured database.

## Prerequisites

- Node.js 24 or later, as declared in `package.json`.
- Bun 1.4.3, the version declared in `package.json`.
- A development PostgreSQL database and its connection details.

## Install and configure

```sh
bun install
```

Copy `.env.example` to `.env.local` and supply values for the development environment. Create a unique authentication secret and keep environment files out of version control.

## Database

A complete database provisioning script is not documented in this checkout: `scripts/schema.sql` is not present. `lib/api.ts` creates some supporting tables, but that does not provision the whole schema. Obtain and review the authoritative database schema before setting up a new database. Do not reconstruct a production schema from an old documentation table.

## Run and check

```sh
bun run dev
bun run lint
bun run type-check
bun run test
bun run build
```

The development server normally uses port 3000. These commands are defined in `package.json`; their presence here is not a claim that they were run during this documentation update.

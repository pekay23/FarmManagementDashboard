# System Overview

Hughes Farms is a farm management application with browser-based records and server-backed services. The application includes areas for crops, livestock, inventory, staff, sales, tasks, and reporting.

## How the project is organised

The Next.js application lives in `app/`, with shared components in `components/` and data helpers in `lib/`. `lib/db.ts` defines a Dexie database for local records. API routes under `app/api/` access PostgreSQL, and `context/SyncContext.tsx` coordinates supported sync operations for authenticated farm users.

Some pages use local IndexedDB data, while others also make server requests. Offline behavior varies by feature and should be tested for the workflow being used. The current package manifest does not include `next-pwa`; a web manifest alone does not establish that an offline service worker is installed.

The complete database provisioning process is not documented in this checkout. See the [setup guide](../guides/setup.md) before configuring a new database.

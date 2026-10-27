# Data Flow and Sync

The project combines local IndexedDB records, defined in `lib/db.ts`, with PostgreSQL-backed API routes. Several feature pages use Dexie live queries. Other workflows make direct API requests, so offline support is not uniform across every page.

`context/SyncContext.tsx` coordinates supported uploads and downloads for authenticated, non-super-admin farm sessions. It attempts sync periodically and when the connection returns. Pending records and conflicts are represented in the local data model; consult the current provider and API handlers for the details of each entity.

Treat synchronization as a feature to verify against a configured environment. A network connection alone does not establish an authenticated session or guarantee that pending changes have reached the server.

See the [system overview](./system-overview.md) and [setup guide](../guides/setup.md).

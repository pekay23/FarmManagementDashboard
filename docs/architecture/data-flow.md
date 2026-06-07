# Data flow & offline sync

Hughes Farms is **offline-first**: every screen reads from and writes to
the on-device IndexedDB (Dexie). The server is the durable source of
truth, but the UI must keep working — and stay snappy — when the network
is missing, slow, or flaky.

This page describes the round-trip: how a click turns into a row in
Postgres, and how a row from Postgres becomes a row on another device.

## Read path (server → client)

```
Postgres
   │
   │  API route handler  (e.g. GET /api/crops)
   │   └─ SELECT … WHERE farm_id = $1
   │
   ▼
JSON response
   │
   │  SyncContext.syncNow()  (called every 15 s + on tab focus)
   │   └─ bulkPut(pgRows, { id })  on the matching Dexie table
   │   └─ mark each row syncStatus = 'synced'
   │
   ▼
Dexie (IndexedDB)
   │
   │  useLiveQuery(() => db.crops.toArray())
   │  → React re-renders with fresh data
   │
   ▼
JSX
```

- **15-second poll** (`setInterval(syncNow, 15000)` in `SyncContext`).
  Cheap because the network is only hit if the device is online; the
  handler short-circuits otherwise.
- **Pull-on-focus** is also wired up so a phone that just woke from
  sleep doesn't wait the full 15 s.

## Write path (client → server)

```
JSX form submit (e.g. "Save Crop")
   │
   │  await db.crops.add({ id: uuid, …, syncStatus: 'pending' })
   │
   ▼
Dexie (write is durable immediately, no network needed)
   │
   │  useLiveQuery → re-renders with the new row
   │
   ▼
User sees their change INSTANTLY
   │
   │  Next tick: SyncContext pushes the pending row
   │   └─ POST /api/crops  with the full row body
   │   └─ Server inserts / upserts, returns server-canonical row
   │   └─ Client re-saves the server response with syncStatus = 'synced'
   │
   ▼
Postgres
```

If the POST fails (offline, 5xx, etc.) the row stays at
`syncStatus: 'pending'` and the next `syncNow()` will retry it.

## Sync status lifecycle

```
   created locally          server push OK            server delete
   ────────────────►  ┌──────────────┐  ────────►  ┌──────────────┐
                       │  syncStatus  │              │  syncStatus  │
   pending             │   = pending  │   synced     │   = deleted  │
                       └──────┬───────┘  ◄────────   └──────┬───────┘
                              │                              │
                              │  local edit                  │  local edit
                              ▼                              ▼
                       ┌──────────────┐               (server already
                       │  syncStatus  │                deleted; client
                       │  = updated   │                re-creates with
                       └──────┬───────┘                new id)
                              │  server push OK
                              ▼
                          synced
```

## The `SyncContext` provider

Wrapped around the whole app in `app/layout.tsx`:

```tsx
<SyncProvider>
  <Toaster />
  <Sidebar />
  <main>{children}</main>
</SyncProvider>
```

Responsibilities:

1. Boot once per page load (initial pull from server, status `pending`
   rows pushed).
2. Run `syncNow()` every 15 seconds while the tab is open.
3. Run `syncNow()` again on `window` `online` / `focus` events.
4. Expose `isOnline`, `lastSyncAt`, and a manual `syncNow()` to the
   `SyncStatus` indicator in the sidebar.

## Conflict resolution

The app is **last-write-wins** keyed on `updatedAt`. Because UUIDs are
generated client-side, the only realistic conflict is "device A edited
the same row as device B between syncs". The push handler on the server
upserts on `id` and relies on `updatedAt` to decide which copy wins
(server timestamp is authoritative; client clock skew is ignored).

A proper CRDT / OT layer is out of scope for the current version — see
[Future plans → Conflict resolution](../plans/future-plans.md).

## API surface (one endpoint per entity)

Each entity has the same shape:

| Method   | Path                | Body / params      | Returns                         |
| -------- | ------------------- | ------------------ | ------------------------------- |
| `GET`    | `/api/{entity}`     | —                  | `200 { data: Row[] }`           |
| `POST`   | `/api/{entity}`     | full row body      | `200 { data: Row }` (server)    |
| `PUT`    | `/api/{entity}/{id}`| partial row body   | `200 { data: Row }`             |
| `DELETE` | `/api/{entity}/{id}`| —                  | `200 { ok: true }`              |

The `entity` segment is one of: `crops`, `livestock`, `inventory`,
`sales`, `expenses`, `employees`, `tasks`, `treatments`, `users`,
`settings`, `dashboard`, `reports`. Auth is enforced by NextAuth +
`middleware.ts` (every path under `(portal)/` requires a session; API
routes check `getServerSession(authOptions)`).

## "Offline ready" badge in the UI

The dashboard header shows a small `⚡ Offline Ready` chip when the
device hasn't pinged the server in the current session. The same flag
suppresses the auto-poll to avoid burning battery when there's no hope
of a successful round-trip.

# Data model

The Hughes Farms schema lives in **two places** that must stay in sync:

1. **On-device** — Dexie / IndexedDB, defined in `lib/db.ts` (TypeScript
   interfaces, single `FarmDatabase` class, 9 tables, version 1).
2. **On-server** — Postgres, addressed by `pg` / `@neondatabase/serverless`,
   one table per entity, plus a `users` table that Dexie does not mirror.

Every Dexie record carries a `syncStatus` field so the sync layer knows
what still needs to round-trip to the server. See
[Data flow & offline sync](./data-flow.md) for how that field is used.

## Shared base — `Syncable`

```ts
interface Syncable {
  id: string;                                         // UUID v4
  syncStatus: 'synced' | 'pending' | 'updated' | 'deleted';
  createdAt: string;                                  // ISO timestamp
  updatedAt: string;                                  // ISO timestamp
}
```

| Status     | Meaning                                              |
| ---------- | ---------------------------------------------------- |
| `pending`  | Created locally; never pushed to server.             |
| `synced`   | Server has the same record.                          |
| `updated`  | Local edit since last sync; server is stale.         |
| `deleted`  | Soft-delete marker; server should drop the record.   |

UUIDs are generated client-side via `crypto.randomUUID()` (with a
fallback for old browsers in `lib/db.ts`-style helpers) so the same row
can be created on multiple devices and reconciled later.

## Entities (Dexie tables ↔ Postgres tables)

| Dexie table        | Entity     | Key fields                                                                |
| ------------------ | ---------- | ------------------------------------------------------------------------- |
| `employees`        | Employee   | `name`, `role`, `phone`, `isActive`                                       |
| `tasks`            | Task       | `title`, `description`, `assignedTo`, `dueDate`, `priority`, `status`     |
| `crops`            | Crop       | `plot_number`, `crop_type`, `variety`, `planting_date`, `expected_harvest_date`, `plot_size_acres`, `estimated_yield_kg`, `actual_yield_kg` |
| `treatments`       | Treatment  | `crop_id` (FK), `treatment_type`, `product_name`, `treatment_date`, `quantity`, `cost` |
| `livestock`        | Livestock  | `animal_id`, `species`, `breed`, `sex`, `date_of_birth`, `current_weight_kg`, `health_status` |
| `livestock_logs`   | LivestockLog | `livestock_id` (FK), `type` (`vaccine` / `treatment` / `weight`), `date`, `data` (JSON) |
| `inventory`        | InventoryItem | `name`, `category`, `quantity`, `unit`, `lowStockThreshold`, `unitPrice`, `supplier` |
| `sales`            | Sale       | `date`, `customer`, `contact_info`, `amount`, `itemsData` (JSON array)    |
| `expenses`         | Expense    | `title`, `category`, `date`, `amount`, `notes`                            |

## Server-only tables (no Dexie mirror)

| Postgres table | Purpose                                                              |
| -------------- | -------------------------------------------------------------------- |
| `users`        | Auth accounts: `id`, `email`, `password` (bcrypt), `farm_id`, `is_superadmin` |
| `settings`     | Per-farm branding: `farm_name`, `phone`, `email`, `address`, `tax_rate`, `receipt_footer`, `logo` |

## Indexes (Dexie schema string)

The full schema lives in the `constructor` of `FarmDatabase` in
`lib/db.ts`. The index list is included here for reference:

```
employees       id, name, role, phone, isActive, syncStatus, createdAt, updatedAt
tasks           id, title, status, priority, assignedTo, dueDate, syncStatus, createdAt, updatedAt
crops           id, plot_number, crop_type, status, location, planting_date, syncStatus, createdAt, updatedAt
inventory       id, name, category, quantity, lowStockThreshold, syncStatus, createdAt, updatedAt
sales           id, date, customer, amount, syncStatus, createdAt, updatedAt
expenses        id, title, category, date, amount, syncStatus, createdAt, updatedAt
livestock       id, animal_id, species, health_status, syncStatus, createdAt, updatedAt
livestock_logs  id, livestock_id, type, date, syncStatus, createdAt, updatedAt
treatments      id, crop_id, treatment_date, syncStatus, createdAt, updatedAt
```

## Database name + version

- **DB name**: `HughesFarmDB_v2` — the `_v2` suffix was added when the
  schema evolved past the original shape; users with the old DB will get
  a clean IndexedDB on first load.
- **Schema version**: `1` (Dexie `this.version(1).stores(…)`).
  Bump this on any column change and add a `this.version(2).stores(…)`
  migration.

## Soft-delete convention

The app **never** physically removes a record from Dexie. Delete actions
flip `syncStatus` to `'deleted'`, the row is hidden from the UI by a
`.filter(r => r.syncStatus !== 'deleted')` guard (and from
`useLiveQuery` results), and the sync layer pushes the deletion to the
server. The server's mirror is responsible for the actual hard delete
once the soft-delete marker is received.

Exception: a row that was created locally and never synced (i.e.
`syncStatus === 'pending'`) can be hard-deleted on the client — there's
nothing on the server to clean up.

## Multi-tenancy

Every server-side row carries a `farm_id` matching the user's tenant.
The JWT exposes `farm_id`; API handlers must filter by it. The single
exception is `is_superadmin === true`, which bypasses the `farm_id`
filter and can aggregate across tenants (used by the
`/admin/users` screen and the cross-farm dashboard view).

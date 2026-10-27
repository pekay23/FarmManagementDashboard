# Data Model

The browser data model is defined in `lib/db.ts`. It uses a Dexie database named `FieldOpsDB` and declares schema versions 1, 2, and 3. Local records include synchronization state used by the sync provider.

Server-backed data is accessed through API routes and PostgreSQL. Some supporting tables are created in `lib/api.ts`, but the repository does not contain a complete schema provisioning script. Review the current data model and API handlers rather than relying on an old table list when changing or provisioning data.

Individual workflows handle local edits, deletes, and server synchronization differently. See [Data Flow and Sync](./data-flow.md) and verify the relevant workflow before relying on offline behavior.

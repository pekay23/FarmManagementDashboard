import { NextResponse } from "next/server";
import pool from "@/lib/pg";
import { ApiError, apiErrorResponse, ensurePlatformTables, enumValue, getFarmSession, idValue, logAudit, readJson, text } from "@/lib/api";

export const dynamic = "force-dynamic";

const statuses = ["open", "resolved", "ignored"] as const;

export async function GET() {
  try {
    const session = await getFarmSession();
    await ensurePlatformTables();
    const result = await pool.query("SELECT * FROM sync_conflicts WHERE farm_id = $1 ORDER BY created_at DESC LIMIT 100", [session.farm_id]);
    return NextResponse.json(result.rows);
  } catch (error) {
    return apiErrorResponse(error, "Failed to load sync conflicts");
  }
}

export async function POST(request: Request) {
  try {
    const session = await getFarmSession();
    await ensurePlatformTables();
    const body = await readJson(request);
    const tableName = text(body.table_name, "table_name", { max: 80 });
    const recordId = idValue(body.record_id, "record_id");
    const localData = body.local_data && typeof body.local_data === "object" ? body.local_data : {};
    const serverData = body.server_data && typeof body.server_data === "object" ? body.server_data : null;
    const reason = text(body.reason, "reason", { max: 500 });

    const result = await pool.query(
      `INSERT INTO sync_conflicts (farm_id, user_id, table_name, record_id, local_data, server_data, reason)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7)
       RETURNING *`,
      [session.farm_id, session.user_id, tableName, recordId, JSON.stringify(localData), JSON.stringify(serverData), reason]
    );
    await logAudit(session, "sync.conflict.created", tableName, recordId, { reason });
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return apiErrorResponse(error, "Failed to create sync conflict");
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getFarmSession();
    await ensurePlatformTables();
    const body = await readJson(request);
    const id = idValue(body.id);
    const status = enumValue(body.status, "status", statuses, "resolved");
    const resolution = text(body.resolution, "resolution", { required: false, max: 500 });
    const result = await pool.query(
      `UPDATE sync_conflicts
       SET status = $1, resolution = $2, resolved_at = CASE WHEN $1 = 'open' THEN NULL ELSE CURRENT_TIMESTAMP END
       WHERE id = $3 AND farm_id = $4
       RETURNING *`,
      [status, resolution, id, session.farm_id]
    );
    if (result.rowCount === 0) throw new ApiError("Conflict not found", 404);
    await logAudit(session, "sync.conflict.updated", "sync_conflict", id, { status, resolution });
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return apiErrorResponse(error, "Failed to update sync conflict");
  }
}

import { NextResponse } from "next/server";
import pool from "@/lib/pg";
import { ApiError, apiErrorResponse, ensurePlatformTables, getFarmSession, idValue, logAudit, numberValue, readJson, requirePermission, text } from "@/lib/api";

export const dynamic = "force-dynamic";

function normalizeAttachment(body: Record<string, unknown>) {
  const url = text(body.url, "url", { required: false, max: 2000 });
  const dataUrl = text(body.data_url, "data_url", { required: false });
  if (!url && !dataUrl) throw new ApiError("A file URL or data URL is required", 400);

  return {
    entity_type: text(body.entity_type, "entity_type", { max: 80 }),
    entity_id: idValue(body.entity_id, "entity_id"),
    file_name: text(body.file_name, "file_name", { max: 240 }),
    file_type: text(body.file_type, "file_type", { required: false, max: 120 }) || null,
    file_size: numberValue(body.file_size, "file_size", { required: false, min: 0 }) || null,
    url: url || null,
    data_url: dataUrl || null,
    notes: text(body.notes, "notes", { required: false, max: 500 }) || null,
  };
}

export async function GET(request: Request) {
  try {
    const session = await getFarmSession();
    await ensurePlatformTables();
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entity_type");
    const entityId = searchParams.get("entity_id");
    const params: Array<string | number> = [session.farm_id];
    const where = ["farm_id = $1"];

    if (entityType) {
      params.push(entityType);
      where.push(`entity_type = $${params.length}`);
    }
    if (entityId) {
      params.push(entityId);
      where.push(`entity_id = $${params.length}`);
    }

    const result = await pool.query(`SELECT * FROM attachments WHERE ${where.join(" AND ")} ORDER BY created_at DESC`, params);
    return NextResponse.json(result.rows);
  } catch (error) {
    return apiErrorResponse(error, "Failed to load attachments");
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission("attachments:write");
    if (!session.farm_id) throw new ApiError("Farm workspace required", 403);
    const item = normalizeAttachment(await readJson(request));
    const result = await pool.query(
      `INSERT INTO attachments
       (farm_id, entity_type, entity_id, file_name, file_type, file_size, url, data_url, notes, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        session.farm_id,
        item.entity_type,
        item.entity_id,
        item.file_name,
        item.file_type,
        item.file_size,
        item.url,
        item.data_url,
        item.notes,
        session.user_id,
      ]
    );
    await logAudit(session, "attachment.created", item.entity_type, item.entity_id, { attachment_id: result.rows[0].id, file_name: item.file_name });
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return apiErrorResponse(error, "Failed to create attachment");
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requirePermission("attachments:write");
    if (!session.farm_id) throw new ApiError("Farm workspace required", 403);
    const body = await readJson(request);
    const id = idValue(body.id);
    const result = await pool.query("DELETE FROM attachments WHERE id = $1 AND farm_id = $2 RETURNING entity_type, entity_id", [id, session.farm_id]);
    if (result.rowCount === 0) throw new ApiError("Attachment not found", 404);
    await logAudit(session, "attachment.deleted", result.rows[0].entity_type, result.rows[0].entity_id, { attachment_id: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "Failed to delete attachment");
  }
}

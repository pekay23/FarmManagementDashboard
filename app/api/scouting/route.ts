import { NextResponse } from "next/server";
import pool from "@/lib/pg";
import {
  ApiError,
  apiErrorResponse,
  ensurePlatformTables,
  enumValue,
  getFarmSession,
  idValue,
  logAudit,
  numberValue,
  readJson,
  requirePermission,
  text,
} from "@/lib/api";

export const dynamic = "force-dynamic";

const severities = ["low", "medium", "high", "critical"] as const;
const statuses = ["open", "monitoring", "resolved"] as const;

function normalizeScouting(body: Record<string, unknown>) {
  return {
    crop_id: text(body.crop_id, "crop_id", { required: false, max: 120 }) || null,
    field_name: text(body.field_name, "field_name", { max: 160 }),
    scout_date: text(body.scout_date, "scout_date", { required: false, max: 40 }) || new Date().toISOString().slice(0, 10),
    crop_stage: text(body.crop_stage, "crop_stage", { required: false, max: 80 }) || null,
    issue_type: text(body.issue_type, "issue_type", { max: 80 }),
    severity: enumValue(body.severity, "severity", severities, "medium"),
    latitude: numberValue(body.latitude, "latitude", { required: false, min: -90, max: 90 }) || null,
    longitude: numberValue(body.longitude, "longitude", { required: false, min: -180, max: 180 }) || null,
    notes: text(body.notes, "notes", { required: false, max: 1200 }) || null,
    recommendation: text(body.recommendation, "recommendation", { required: false, max: 1200 }) || null,
    status: enumValue(body.status, "status", statuses, "open"),
  };
}

export async function GET() {
  try {
    const session = await getFarmSession();
    await ensurePlatformTables();
    const result = await pool.query("SELECT * FROM field_scouting WHERE farm_id = $1 ORDER BY scout_date DESC, created_at DESC", [
      session.farm_id,
    ]);
    return NextResponse.json(result.rows);
  } catch (error) {
    return apiErrorResponse(error, "Failed to load scouting records");
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission("scouting:write");
    if (!session.farm_id) throw new ApiError("Farm workspace required", 403);
    const item = normalizeScouting(await readJson(request));
    const result = await pool.query(
      `INSERT INTO field_scouting
       (farm_id, crop_id, field_name, scout_date, crop_stage, issue_type, severity, latitude, longitude, notes, recommendation, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        session.farm_id,
        item.crop_id,
        item.field_name,
        item.scout_date,
        item.crop_stage,
        item.issue_type,
        item.severity,
        item.latitude,
        item.longitude,
        item.notes,
        item.recommendation,
        item.status,
        session.user_id,
      ]
    );
    await logAudit(session, "scouting.created", "scouting", result.rows[0].id, { field_name: item.field_name, severity: item.severity });
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return apiErrorResponse(error, "Failed to create scouting record");
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requirePermission("scouting:write");
    if (!session.farm_id) throw new ApiError("Farm workspace required", 403);
    const body = await readJson(request);
    const id = idValue(body.id);
    const item = normalizeScouting(body);
    const result = await pool.query(
      `UPDATE field_scouting
       SET crop_id=$1, field_name=$2, scout_date=$3, crop_stage=$4, issue_type=$5, severity=$6,
           latitude=$7, longitude=$8, notes=$9, recommendation=$10, status=$11, updated_at=CURRENT_TIMESTAMP
       WHERE id=$12 AND farm_id=$13
       RETURNING *`,
      [
        item.crop_id,
        item.field_name,
        item.scout_date,
        item.crop_stage,
        item.issue_type,
        item.severity,
        item.latitude,
        item.longitude,
        item.notes,
        item.recommendation,
        item.status,
        id,
        session.farm_id,
      ]
    );
    if (result.rowCount === 0) throw new ApiError("Scouting record not found", 404);
    await logAudit(session, "scouting.updated", "scouting", id, { status: item.status, severity: item.severity });
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return apiErrorResponse(error, "Failed to update scouting record");
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requirePermission("scouting:write");
    if (!session.farm_id) throw new ApiError("Farm workspace required", 403);
    const body = await readJson(request);
    const id = idValue(body.id);
    const result = await pool.query("DELETE FROM field_scouting WHERE id = $1 AND farm_id = $2", [id, session.farm_id]);
    if (result.rowCount === 0) throw new ApiError("Scouting record not found", 404);
    await logAudit(session, "scouting.deleted", "scouting", id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, "Failed to delete scouting record");
  }
}

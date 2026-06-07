import { NextResponse } from "next/server";
import pool from "@/lib/pg";
import { apiErrorResponse, ensurePlatformTables, getSessionInfo, requirePermission } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getSessionInfo();
    await ensurePlatformTables();
    if (!session.is_superadmin) await requirePermission("audit:read");

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entity_type");
    const limit = Math.min(Number(searchParams.get("limit") || 100), 250);
    const params: Array<string | number> = [];
    const where: string[] = [];

    if (!session.is_superadmin) {
      params.push(session.farm_id as string | number);
      where.push(`a.farm_id = $${params.length}`);
    } else if (searchParams.get("farm_id")) {
      params.push(searchParams.get("farm_id") as string);
      where.push(`a.farm_id = $${params.length}`);
    }

    if (entityType) {
      params.push(entityType);
      where.push(`a.entity_type = $${params.length}`);
    }

    params.push(limit);
    const result = await pool.query(
      `
      SELECT a.*, u.email AS user_email
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.user_id
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY a.created_at DESC
      LIMIT $${params.length}
      `,
      params
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    return apiErrorResponse(error, "Failed to load audit logs");
  }
}

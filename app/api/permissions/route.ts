import { NextResponse } from "next/server";
import pool from "@/lib/pg";
import { ApiError, PERMISSIONS, apiErrorResponse, ensurePlatformTables, getSessionInfo, idValue, logAudit, readJson } from "@/lib/api";

export const dynamic = "force-dynamic";

async function requireSuperAdmin() {
  const session = await getSessionInfo();
  if (!session.is_superadmin) throw new ApiError("Super admin required", 403);
  await ensurePlatformTables();
  return session;
}

export async function GET() {
  try {
    await requireSuperAdmin();
    const result = await pool.query(`
      SELECT
        u.id,
        u.email,
        u.farm_id,
        u.is_superadmin,
        COALESCE(json_agg(up.permission) FILTER (WHERE up.permission IS NOT NULL), '[]') AS permissions
      FROM users u
      LEFT JOIN user_permissions up ON up.user_id = u.id
      GROUP BY u.id, u.email, u.farm_id, u.is_superadmin
      ORDER BY u.is_superadmin DESC, u.email ASC
    `);

    return NextResponse.json({ available: PERMISSIONS, users: result.rows });
  } catch (error) {
    return apiErrorResponse(error, "Failed to load permissions");
  }
}

export async function PUT(request: Request) {
  const client = await pool.connect();
  try {
    const session = await requireSuperAdmin();
    const body = await readJson(request);
    const userId = idValue(body.user_id, "user_id");
    const permissions = Array.isArray(body.permissions) ? body.permissions.map(String) : [];
    const invalid = permissions.filter((permission) => !PERMISSIONS.includes(permission as (typeof PERMISSIONS)[number]));
    if (invalid.length > 0) throw new ApiError(`Invalid permissions: ${invalid.join(", ")}`, 400);

    const user = await client.query("SELECT id, is_superadmin FROM users WHERE id = $1", [userId]);
    if (user.rowCount === 0) throw new ApiError("User not found", 404);
    if (user.rows[0].is_superadmin) throw new ApiError("Super admin permissions are implicit", 400);

    await client.query("BEGIN");
    await client.query("DELETE FROM user_permissions WHERE user_id = $1", [userId]);
    for (const permission of permissions) {
      await client.query(
        "INSERT INTO user_permissions (user_id, permission, granted_by) VALUES ($1, $2, $3)",
        [userId, permission, session.user_id]
      );
    }
    await client.query("COMMIT");

    await logAudit(session, "permissions.updated", "user", userId, { permissions });
    return NextResponse.json({ success: true, user_id: userId, permissions });
  } catch (error) {
    await client.query("ROLLBACK");
    return apiErrorResponse(error, "Failed to update permissions");
  } finally {
    client.release();
  }
}

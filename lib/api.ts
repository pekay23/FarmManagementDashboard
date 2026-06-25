import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/pg";

export type SessionInfo = {
  farm_id: string | number | null;
  is_superadmin: boolean;
  user_id: string | number;
  email?: string | null;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export const PERMISSIONS = [
  "dashboard:read",
  "crops:write",
  "livestock:write",
  "employees:write",
  "inventory:write",
  "sales:write",
  "finance:write",
  "tasks:write",
  "scouting:write",
  "attachments:write",
  "settings:write",
  "users:manage",
  "audit:read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export async function getSessionInfo(): Promise<SessionInfo> {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new ApiError("Unauthorized", 401);
  const user = session.user as {
    id?: string | number;
    farm_id?: string | number | null;
    is_superadmin?: boolean;
    email?: string | null;
  };

  if (!user.id) throw new ApiError("Unauthorized", 401);

  return {
    farm_id: user.farm_id ?? null,
    is_superadmin: Boolean(user.is_superadmin),
    user_id: user.id,
    email: user.email ?? null,
  };
}

export async function getFarmSession() {
  const session = await getSessionInfo();
  if (!session.farm_id) throw new ApiError("Farm workspace required", 403);
  return session as SessionInfo & { farm_id: string | number };
}

export async function ensurePlatformTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_permissions (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      permission TEXT NOT NULL,
      granted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, permission)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      farm_id UUID NULL,
      user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NULL,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_audit_logs_farm_created ON audit_logs(farm_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

    CREATE TABLE IF NOT EXISTS field_scouting (
      id SERIAL PRIMARY KEY,
      farm_id UUID NOT NULL,
      crop_id TEXT NULL,
      field_name TEXT NOT NULL,
      scout_date DATE NOT NULL DEFAULT CURRENT_DATE,
      crop_stage TEXT NULL,
      issue_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      latitude NUMERIC NULL,
      longitude NUMERIC NULL,
      notes TEXT NULL,
      recommendation TEXT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_field_scouting_farm_date ON field_scouting(farm_id, scout_date DESC);

    CREATE TABLE IF NOT EXISTS attachments (
      id SERIAL PRIMARY KEY,
      farm_id UUID NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_type TEXT NULL,
      file_size INTEGER NULL,
      url TEXT NULL,
      data_url TEXT NULL,
      notes TEXT NULL,
      uploaded_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(farm_id, entity_type, entity_id);

    CREATE TABLE IF NOT EXISTS sync_conflicts (
      id SERIAL PRIMARY KEY,
      farm_id UUID NOT NULL,
      user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      local_data JSONB NOT NULL,
      server_data JSONB NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      resolution TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      resolved_at TIMESTAMP NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sync_conflicts_farm_status ON sync_conflicts(farm_id, status, created_at DESC);
  `);
}

export async function requirePermission(permission: Permission) {
  const session = await getSessionInfo();
  if (session.is_superadmin) return session;

  if (!session.farm_id) throw new ApiError("Farm workspace required", 403);
  await ensurePlatformTables();

  const result = await pool.query("SELECT permission FROM user_permissions WHERE user_id = $1", [session.user_id]);
  if (result.rowCount === 0) return session;

  const granted = new Set(result.rows.map((row) => row.permission));
  if (!granted.has(permission)) throw new ApiError("Permission denied", 403);
  return session;
}

export async function logAudit(
  session: Pick<SessionInfo, "farm_id" | "user_id">,
  action: string,
  entityType: string,
  entityId?: string | number | null,
  metadata: Record<string, unknown> = {}
) {
  try {
    await ensurePlatformTables();
    await pool.query(
      `INSERT INTO audit_logs (farm_id, user_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [session.farm_id, session.user_id, action, entityType, entityId ? String(entityId) : null, JSON.stringify(metadata)]
    );
  } catch (error) {
    console.warn("Audit log write failed", error);
  }
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new ApiError("Invalid JSON body", 400);
    }
    return body as Record<string, unknown>;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("Invalid JSON body", 400);
  }
}

export function text(value: unknown, field: string, options: { required?: boolean; max?: number } = {}) {
  const required = options.required ?? true;
  if (value === undefined || value === null || value === "") {
    if (required) throw new ApiError(`${field} is required`, 400);
    return "";
  }

  const result = String(value).trim();
  if (!result && required) throw new ApiError(`${field} is required`, 400);
  if (options.max && result.length > options.max) throw new ApiError(`${field} is too long`, 400);
  return result;
}

export function numberValue(
  value: unknown,
  field: string,
  options: { min?: number; max?: number; required?: boolean } = {}
) {
  const required = options.required ?? true;
  if (value === undefined || value === null || value === "") {
    if (required) throw new ApiError(`${field} is required`, 400);
    return 0;
  }

  const result = Number(value);
  if (!Number.isFinite(result)) throw new ApiError(`${field} must be a number`, 400);
  if (options.min !== undefined && result < options.min) throw new ApiError(`${field} is below the minimum`, 400);
  if (options.max !== undefined && result > options.max) throw new ApiError(`${field} exceeds the maximum`, 400);
  return result;
}

export function idValue(value: unknown, field = "id") {
  return text(value, field, { max: 120 });
}

export function emailValue(value: unknown) {
  const result = text(value, "email", { max: 254 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) {
    throw new ApiError("A valid email is required", 400);
  }
  return result;
}

export function enumValue<T extends string>(value: unknown, field: string, allowed: readonly T[], fallback?: T) {
  const raw = value === undefined || value === null || value === "" ? fallback : String(value).toLowerCase();
  if (!raw || !allowed.includes(raw as T)) {
    throw new ApiError(`${field} must be one of: ${allowed.join(", ")}`, 400);
  }
  return raw as T;
}

export function apiErrorResponse(error: unknown, fallback = "Request failed") {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error(fallback, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

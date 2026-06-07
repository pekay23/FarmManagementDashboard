"use client";

import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

type PermissionPayload = {
  available: string[];
  users: Array<{
    id: string;
    email: string;
    farm_id: string | null;
    is_superadmin: boolean;
    permissions: string[];
  }>;
};

export default function PermissionsPage() {
  const [data, setData] = useState<PermissionPayload | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadPermissions() {
    setError(null);
    const response = await fetch("/api/permissions", { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load permissions.");
    const payload = await response.json();
    setData(payload);
    const firstUser = payload.users.find((user: PermissionPayload["users"][number]) => !user.is_superadmin);
    if (firstUser) {
      setSelectedUserId(String(firstUser.id));
      setSelectedPermissions(new Set(firstUser.permissions));
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      loadPermissions().catch((err) => setError(err instanceof Error ? err.message : "Unable to load permissions."));
    });
  }, []);

  const selectedUser = useMemo(
    () => data?.users.find((user) => String(user.id) === selectedUserId),
    [data, selectedUserId]
  );

  function selectUser(id: string) {
    const user = data?.users.find((item) => String(item.id) === id);
    setSelectedUserId(id);
    setSelectedPermissions(new Set(user?.permissions ?? []));
  }

  function togglePermission(permission: string) {
    setSelectedPermissions((current) => {
      const next = new Set(current);
      if (next.has(permission)) next.delete(permission);
      else next.add(permission);
      return next;
    });
  }

  async function savePermissions() {
    if (!selectedUser) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: selectedUser.id, permissions: Array.from(selectedPermissions) }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Unable to save permissions.");
      }
      await loadPermissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save permissions.");
    } finally {
      setSaving(false);
    }
  }

  if (!data && !error) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 pb-12 lg:px-8 lg:py-10">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Security</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">Role Permissions</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Restrict farm users to the modules they should operate. Super admins keep implicit full access.
        </p>
      </div>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm font-semibold text-destructive">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-bold text-foreground">Users</h2>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.users ?? []).map((user) => (
              <button
                key={user.id}
                type="button"
                disabled={user.is_superadmin}
                onClick={() => selectUser(String(user.id))}
                className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  selectedUserId === String(user.id) ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-accent"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <span className="block truncate text-sm font-bold text-foreground">{user.email}</span>
                <span className="block text-xs text-muted-foreground">
                  {user.is_superadmin ? "Super admin" : `${user.permissions.length || "Default"} permissions`}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground">{selectedUser?.email || "Select a user"}</h2>
              <p className="mt-1 text-xs text-muted-foreground">Empty custom permissions means the user keeps the default farm-operator access.</p>
            </div>
            <Button onClick={savePermissions} disabled={!selectedUser || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {(data?.available ?? []).map((permission) => (
                <label key={permission} className="flex min-h-14 items-center gap-3 rounded-lg border border-border bg-surface-raised p-3">
                  <input
                    type="checkbox"
                    checked={selectedPermissions.has(permission)}
                    onChange={() => togglePermission(permission)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="text-sm font-semibold text-foreground">{permission}</span>
                </label>
              ))}
            </div>
            <div className="mt-5 rounded-lg border border-primary/20 bg-primary/10 p-4 text-sm text-muted-foreground">
              <ShieldCheck className="mb-2 h-5 w-5 text-primary" />
              Use explicit permissions when you need restricted operator accounts. Leave the list empty for trusted full farm users.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Pencil, Shield, Trash2, UserPlus, Warehouse } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { DialogShell } from "@/components/ui/Dialog";
import { Field, inputClassName } from "@/components/ui/Field";
import { useSortableData } from "@/hooks/useSortableData";
import { SortableHeader } from "@/components/ui/SortableHeader";

type UserRow = {
  id: number;
  email: string;
  created_at: string;
  is_superadmin?: boolean;
  role?: string;
  farm_name?: string | null;
};

export default function UserManagement() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null);
  const [formError, setFormError] = useState("");

  const { items: sortedUsers, requestSort, sortConfig } = useSortableData(users);

  const { data: session } = useSession();
  const isSuperAdmin = Boolean((session?.user as { is_superadmin?: boolean } | undefined)?.is_superadmin);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setFormError("");
    setEditingUser(null);
    setIsModalOpen(true);
  }

  function openEdit(user: UserRow) {
    setFormError("");
    setEditingUser(user);
    setIsModalOpen(true);
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");

    const formData = new FormData(e.currentTarget);
    const payload = {
      email: String(formData.get("email") || ""),
      password: String(formData.get("password") || ""),
      farm_name: String(formData.get("farm_name") || ""),
    };

    if (!editingUser && payload.password.length < 12) {
      setFormError("Use a password with at least 12 characters.");
      return;
    }

    if (editingUser && payload.password && payload.password.length < 12) {
      setFormError("Use a password with at least 12 characters.");
      return;
    }

    try {
      const res = await fetch("/api/users", {
        method: editingUser ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingUser ? { id: editingUser.id, password: payload.password } : payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const message = err.error || "Operation failed";
        setFormError(message);
        toast.error(message);
        return;
      }

      toast.success(editingUser ? "Account updated" : "Farm owner created");
      setIsModalOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch {
      setFormError("Network error");
      toast.error("Network error");
    }
  }

  async function handleDelete() {
    if (!deletingUser) return;
    try {
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deletingUser.id }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to delete user");
        return;
      }

      toast.success("User deleted");
      setDeletingUser(null);
      fetchUsers();
    } catch {
      toast.error("Error deleting user");
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-[1600px] p-4 pb-20 md:p-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-foreground">
            <Shield className="h-6 w-6 text-primary" />
            {isSuperAdmin ? "Platform User Management" : "Account Management"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage farm owner accounts and access.</p>
        </div>

        {isSuperAdmin && (
          <Button onClick={openCreate} className="w-full md:w-auto">
            <UserPlus className="h-5 w-5" />
            Add Farm Owner
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <CardContent className="flex justify-center py-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        ) : users.length === 0 ? (
          <CardContent className="py-12 text-center">
            <p className="text-sm font-medium text-muted-foreground">No users found.</p>
          </CardContent>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-table-header text-xs uppercase text-muted-foreground">
                    <SortableHeader label="User / Email" sortKey="email" sortConfig={sortConfig} requestSort={requestSort} />
                    {isSuperAdmin && <SortableHeader label="Farm Name" sortKey="farm_name" sortConfig={sortConfig} requestSort={requestSort} />}
                    <SortableHeader label="Type" sortKey="is_superadmin" sortConfig={sortConfig} requestSort={requestSort} />
                    <SortableHeader label="Joined" sortKey="created_at" sortConfig={sortConfig} requestSort={requestSort} />
                    <th className="p-4 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedUsers.map((user) => (
                    <UserTableRow
                      key={user.id}
                      user={user}
                      isSuperAdmin={isSuperAdmin}
                      onEdit={() => openEdit(user)}
                      onDelete={() => setDeletingUser(user)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-border md:hidden">
              {users.map((user) => (
                <UserMobileCard
                  key={user.id}
                  user={user}
                  isSuperAdmin={isSuperAdmin}
                  onEdit={() => openEdit(user)}
                  onDelete={() => setDeletingUser(user)}
                />
              ))}
            </div>
          </>
        )}
      </Card>

      {isModalOpen && (
        <DialogShell title={editingUser ? "Edit Account" : "Create Farm Owner"} onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleSave} className="space-y-5 p-5">
            {!editingUser && (
              <Field label="Email Address">
                <input name="email" required type="email" className={inputClassName} placeholder="owner@farm.com" />
              </Field>
            )}

            {isSuperAdmin && !editingUser && (
              <Field label="Farm Name">
                <div className="relative">
                  <Warehouse className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <input name="farm_name" required className={`${inputClassName} pl-9`} placeholder="North Ridge Farm" />
                </div>
              </Field>
            )}

            <Field
              label={editingUser ? "New Password" : "Temporary Password"}
              help={editingUser ? "Leave blank to keep the current password." : "Minimum 12 characters."}
              error={formError}
            >
              <input
                name="password"
                type="password"
                required={!editingUser}
                className={inputClassName}
                placeholder="Minimum 12 characters"
              />
            </Field>

            <Button type="submit" className="w-full">
              {editingUser ? "Update Account" : "Create Farm Owner"}
            </Button>
          </form>
        </DialogShell>
      )}

      {deletingUser && (
        <DialogShell title="Delete User" onClose={() => setDeletingUser(null)} className="max-w-sm">
          <div className="space-y-5 p-5">
            <p className="text-sm text-muted-foreground">
              Delete <strong className="text-foreground">{deletingUser.email}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setDeletingUser(null)}>
                Cancel
              </Button>
              <Button variant="danger" className="flex-1" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </div>
        </DialogShell>
      )}
    </div>
  );
}

function UserTableRow({
  user,
  isSuperAdmin,
  onEdit,
  onDelete,
}: {
  user: UserRow;
  isSuperAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isPlatformAdmin = user.role === "Admin" || user.is_superadmin;
  return (
    <tr className="transition-colors hover:bg-table-row-hover">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">
            {user.email.charAt(0).toUpperCase()}
          </div>
          <div className="font-medium text-foreground">{user.email}</div>
        </div>
      </td>
      {isSuperAdmin && (
        <td className="p-4 text-sm font-medium text-muted-foreground">
          {user.farm_name || <span className="italic">No Farm</span>}
        </td>
      )}
      <td className="p-4">
        <span className={`rounded-md px-2 py-1 text-xs font-bold ${isPlatformAdmin ? 'bg-primary/10 text-primary' : 'bg-success-soft text-success-fg'}`}>
          {isPlatformAdmin ? "Platform Admin" : "Farm Owner"}
        </span>
      </td>
      <td className="p-4 text-sm text-muted-foreground">{new Date(user.created_at).toLocaleDateString()}</td>
      <td className="p-4">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={onEdit} aria-label={`Edit ${user.email}`}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} aria-label={`Delete ${user.email}`}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function UserMobileCard({
  user,
  isSuperAdmin,
  onEdit,
  onDelete,
}: {
  user: UserRow;
  isSuperAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isPlatformAdmin = user.role === "Admin" || user.is_superadmin;
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-foreground">{user.email}</p>
          <p className="mt-1 text-xs text-muted-foreground">{new Date(user.created_at).toLocaleDateString()}</p>
        </div>
        <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-bold ${isPlatformAdmin ? 'bg-primary/10 text-primary' : 'bg-success-soft text-success-fg'}`}>
          {isPlatformAdmin ? "Admin" : "Owner"}
        </span>
      </div>
      {isSuperAdmin && <p className="text-xs text-muted-foreground">{user.farm_name || "No Farm"}</p>}
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" className="flex-1" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
        <Button variant="secondary" size="sm" className="flex-1" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      </div>
    </div>
  );
}

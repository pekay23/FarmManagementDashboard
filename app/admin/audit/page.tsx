"use client";

import { useEffect, useState } from "react";
import { Loader2, ScrollText } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useSortableData } from "@/hooks/useSortableData";
import { SortableHeader } from "@/components/ui/SortableHeader";

type AuditLog = {
  id: number;
  action: string;
  entity_type: string;
  entity_id?: string;
  user_email?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { items: sortedLogs, requestSort, sortConfig } = useSortableData(logs);

  useEffect(() => {
    fetch("/api/audit-logs?limit=150", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load audit logs.");
        return response.json();
      })
      .then(setLogs)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load audit logs."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 p-4 pb-12 lg:px-8 lg:py-10">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Security</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">Audit Logs</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Review sensitive changes, uploads, scouting updates, and permission changes.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-foreground">Recent Activity</h2>
            <p className="mt-1 text-xs text-muted-foreground">{logs.length} entries loaded</p>
          </div>
          <ScrollText className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm font-semibold text-destructive">{error}</div>
          ) : logs.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No audit activity has been recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                  <tr>
                    <SortableHeader label="Action" sortKey="action" sortConfig={sortConfig} requestSort={requestSort} className="py-3 pr-4" />
                    <SortableHeader label="Entity" sortKey="entity_type" sortConfig={sortConfig} requestSort={requestSort} className="py-3 pr-4" />
                    <SortableHeader label="User" sortKey="user_email" sortConfig={sortConfig} requestSort={requestSort} className="py-3 pr-4" />
                    <SortableHeader label="Time" sortKey="created_at" sortConfig={sortConfig} requestSort={requestSort} className="py-3 pr-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="py-3 pr-4 font-bold text-foreground">{log.action}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{log.entity_type}{log.entity_id ? ` #${log.entity_id}` : ""}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{log.user_email || "System"}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{new Date(log.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

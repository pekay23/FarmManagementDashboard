"use client";

import { useEffect, useState } from "react";
import { GitMerge, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

type SyncConflict = {
  id: string;
  table_name: string;
  record_id: string;
  reason: string;
  status: "open" | "resolved" | "ignored";
  local_data?: Record<string, unknown>;
  server_data?: Record<string, unknown>;
  created_at?: string;
  createdAt?: string;
};

export default function SyncConflictsPage() {
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadConflicts() {
    const response = await fetch("/api/sync/conflicts", { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load sync conflicts.");
    setConflicts(await response.json());
  }

  useEffect(() => {
    queueMicrotask(() => {
      loadConflicts()
        .catch((err) => setError(err instanceof Error ? err.message : "Unable to load sync conflicts."))
        .finally(() => setLoading(false));
    });
  }, []);

  async function setStatus(conflict: SyncConflict, status: "resolved" | "ignored") {
    const response = await fetch("/api/sync/conflicts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: conflict.id, status, resolution: status === "resolved" ? "Reviewed manually" : "Ignored by operator" }),
    });
    if (!response.ok) {
      toast.error("Unable to update conflict");
      return;
    }
    toast.success("Conflict updated");
    await loadConflicts();
  }

  function formatConflictTime(conflict: SyncConflict) {
    const value = conflict.created_at ?? conflict.createdAt;
    return value ? new Date(value).toLocaleString() : "Unknown time";
  }

  return (
    <div className="space-y-6 p-4 pb-12 lg:px-8 lg:py-10">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Offline sync</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">Sync Conflicts</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Review records that changed locally while another device or server update touched the same item.</p>
      </div>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm font-semibold text-destructive">{error}</div>}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-foreground">Conflict Queue</h2>
            <p className="mt-1 text-xs text-muted-foreground">{conflicts.filter((item) => item.status === "open").length} open conflicts</p>
          </div>
          <GitMerge className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
          ) : conflicts.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No sync conflicts found.</p>
          ) : (
            <div className="space-y-4">
              {conflicts.map((conflict) => (
                <article key={conflict.id} className="rounded-lg border border-border bg-surface-raised p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-foreground">{conflict.table_name} #{conflict.record_id}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{conflict.reason}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatConflictTime(conflict)}
                      </p>
                    </div>
                      <Badge variant="secondary" className="uppercase font-black text-[10px] w-fit">
                        {conflict.status}
                      </Badge>
                  </div>
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <pre className="max-h-52 overflow-auto rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                      {JSON.stringify(conflict.local_data ?? {}, null, 2)}
                    </pre>
                    <pre className="max-h-52 overflow-auto rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                      {JSON.stringify(conflict.server_data ?? {}, null, 2)}
                    </pre>
                  </div>
                  {conflict.status === "open" && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => setStatus(conflict, "resolved")}>Mark reviewed</Button>
                      <Button size="sm" variant="secondary" onClick={() => setStatus(conflict, "ignored")}>Ignore</Button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

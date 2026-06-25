"use client";

import { useState } from "react";
import { Cloud, CloudOff, RefreshCw, AlertTriangle } from "lucide-react";
import { useSync } from "@/context/SyncContext";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

export default function SyncStatus() {
  const { isOnline, isSyncing, syncNow } = useSync();
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);

  const conflicts = useLiveQuery(() => db.sync_conflicts.where('status').equals('open').toArray()) || [];

  const handleSync = async () => {
    if (!isOnline) return;
    await syncNow();
  };

  const resolveConflict = async (conflict: any, action: 'local' | 'server') => {
    try {
        if (action === 'server' && conflict.server_data) {
            // Overwrite local with server data
            await (db as any)[conflict.table_name].put({
                ...conflict.server_data,
                syncStatus: 'synced'
            });
        } else if (action === 'local') {
            // Keep local data, force re-sync
            const data = { ...conflict.local_data, syncStatus: 'updated' };
            await (db as any)[conflict.table_name].put(data);
        }
        
        // Mark conflict as resolved
        await db.sync_conflicts.update(conflict.id, { 
            status: 'resolved',
            updatedAt: new Date().toISOString()
        });
        
        toast.success(`Conflict resolved using ${action} data`);
        
        // Auto-sync after resolution if no more conflicts
        if (conflicts.length <= 1) {
            setIsConflictModalOpen(false);
            syncNow();
        }
    } catch (err) {
        console.error("Failed to resolve conflict", err);
        toast.error("Failed to resolve conflict");
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleSync}
          disabled={isSyncing || !isOnline}
          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-colors ${
            !isOnline
              ? "border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/15"
              : "border-border bg-card text-foreground hover:bg-accent"
          }`}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            {isSyncing ? (
              <RefreshCw className="h-4 w-4 shrink-0 animate-spin text-primary" />
            ) : !isOnline ? (
              <CloudOff className="h-4 w-4 shrink-0" />
            ) : (
              <Cloud className="h-4 w-4 shrink-0 text-primary" />
            )}
            <span className="min-w-0">
              <span className="block truncate text-xs font-bold">
                {isSyncing ? "Syncing data" : !isOnline ? "Offline mode" : "Cloud connected"}
              </span>
              <span className="block truncate text-[10px] font-semibold text-muted-foreground">
                {isSyncing ? "Updating local changes" : !isOnline ? "Changes saved to device" : "Auto-sync active"}
              </span>
            </span>
          </span>

          {isOnline && !isSyncing && (
            <span className="relative ml-3 flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
            </span>
          )}
        </button>

        {conflicts.length > 0 && (
            <button 
                onClick={() => setIsConflictModalOpen(true)}
                className="flex w-full items-center justify-between rounded-xl border border-warning/30 bg-warning/10 px-3 py-2.5 text-left transition-colors hover:bg-warning/20 text-warning-foreground"
            >
                <span className="flex min-w-0 items-center gap-2.5">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
                    <span className="min-w-0">
                        <span className="block text-xs font-bold text-warning">Sync Conflicts ({conflicts.length})</span>
                        <span className="block text-[10px] font-semibold opacity-80">Requires your attention</span>
                    </span>
                </span>
            </button>
        )}
      </div>

      <Modal isOpen={isConflictModalOpen} onClose={() => setIsConflictModalOpen(false)} title="Resolve Sync Conflicts">
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {conflicts.length === 0 ? (
                <p className="text-sm text-gray-500">No open conflicts.</p>
            ) : (
                conflicts.map(conflict => (
                    <div key={conflict.id} className="border border-warning/30 bg-warning/5 p-4 rounded-xl space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-sm flex items-center gap-1.5">
                                    <AlertTriangle className="w-4 h-4 text-warning" />
                                    {conflict.table_name.toUpperCase()} Update Failed
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{conflict.reason}</p>
                            </div>
                            <span className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-sm border font-mono">
                                ID: {conflict.record_id.slice(0, 8)}
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="bg-white dark:bg-gray-800 p-2.5 rounded-lg border">
                                <span className="font-bold text-blue-600 dark:text-blue-400 block mb-1">Your Changes (Local)</span>
                                <pre className="whitespace-pre-wrap overflow-x-auto text-gray-700 dark:text-gray-300">
                                    {JSON.stringify(conflict.local_data, null, 2)}
                                </pre>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-2.5 rounded-lg border">
                                <span className="font-bold text-green-600 dark:text-green-400 block mb-1">Server Data</span>
                                <pre className="whitespace-pre-wrap overflow-x-auto text-gray-700 dark:text-gray-300">
                                    {conflict.server_data ? JSON.stringify(conflict.server_data, null, 2) : 'Deleted on server'}
                                </pre>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-warning/20">
                            <Button size="sm" variant="secondary" className="flex-1" onClick={() => resolveConflict(conflict, 'local')}>
                                Keep Local
                            </Button>
                            <Button size="sm" variant="primary" className="flex-1" onClick={() => resolveConflict(conflict, 'server')}>
                                Use Server
                            </Button>
                        </div>
                    </div>
                ))
            )}
        </div>
      </Modal>
    </>
  );
}

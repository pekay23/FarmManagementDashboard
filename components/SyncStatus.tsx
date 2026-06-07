"use client";

import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { useSync } from "@/context/SyncContext";

export default function SyncStatus() {
  const { isOnline, isSyncing, syncNow } = useSync();

  const handleSync = async () => {
    if (!isOnline) return;
    await syncNow();
  };

  return (
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
  );
}

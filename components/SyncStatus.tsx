"use client";

import { useState, useEffect } from "react";
import { Cloud, CloudOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function SyncStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Back online! Syncing...");
      handleSync();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("You are offline. Changes will save locally.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleSync = async () => {
    if (!isOnline) return;
    
    setIsSyncing(true);
    // The actual sync logic runs in the background via OfflineSync.tsx
    // This UI just gives visual feedback that "something is happening"
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsSyncing(false);
  };

  return (
    <div className="w-full">
      <button
        onClick={handleSync}
        disabled={isSyncing || !isOnline}
        className={`
          w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-medium transition-all duration-200 border
          ${!isOnline 
            ? "bg-red-500/10 border-red-500/20 text-red-200 hover:bg-red-500/20" 
            : "bg-black/20 border-white/10 text-primary-100 hover:bg-black/30 hover:text-white"
          }
        `}
      >
        <div className="flex items-center gap-2">
          {isSyncing ? (
            <RefreshCw className="w-4 h-4 animate-spin text-white" />
          ) : !isOnline ? (
            <CloudOff className="w-4 h-4 text-red-300" />
          ) : (
            <Cloud className="w-4 h-4 text-primary-300" />
          )}
          
          <span>
            {isSyncing ? "Syncing Data..." : !isOnline ? "Offline Mode" : "Cloud Connected"}
          </span>
        </div>

        {isOnline && !isSyncing && (
          <div className="flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </div>
        )}
      </button>
      
      {/* Last Sync Label */}
      <p className="text-[10px] text-primary-300/60 text-center mt-2">
        {isOnline ? "Auto-sync active" : "Changes saved to device"}
      </p>
    </div>
  );
}

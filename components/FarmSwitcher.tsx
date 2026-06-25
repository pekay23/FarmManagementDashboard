"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { ChevronsUpDown, Check, Building2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

type Farm = {
  id: string;
  name: string;
};

export function FarmSwitcher() {
  const { data: session, update } = useSession();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(() => !!(session?.user as any)?.is_superadmin);

  const isSuperAdmin = (session?.user as any)?.is_superadmin;
  const currentFarmId = (session?.user as any)?.farm_id;

  useEffect(() => {
    // Only load multiple farms if superadmin or if the API supports fetching user's farms
    if (isSuperAdmin) {
      fetch("/api/dashboard?farm_id=all")
        .then((res) => res.json())
        .then((data) => {
          if (data.allFarms) {
            setFarms(data.allFarms);
          }
        })
        .catch(() => console.error("Failed to load farms"))
        .finally(() => setLoading(false));
    }
  }, [isSuperAdmin]);

  const handleSwitch = async (farmId: string) => {
    try {
      // In a real app, this might involve updating the next-auth session via `update()`
      // or setting a cookie that the backend uses to scope requests.
      toast.info("Switching farms...", { id: "switch-farm" });
      
      // Attempt session update if next-auth is configured for it
      await update({ farm_id: farmId });
      
      toast.success("Farm switched successfully", { id: "switch-farm" });
      setIsOpen(false);
      
      // Reload to apply new scope
      window.location.reload();
    } catch {
      toast.error("Failed to switch farm", { id: "switch-farm" });
    }
  };

  if (!isSuperAdmin) return null; // Or show single farm name

  const currentFarm = farms.find((f) => f.id === currentFarmId) || { name: "Platform Admin", id: "" };

  return (
    <div className="relative">
      <Button
        variant="outline"
        className="w-full justify-between"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
      >
        <span className="flex items-center truncate">
          <Building2 className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{loading ? "Loading..." : currentFarm.name}</span>
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none">
          <div className="max-h-60 overflow-y-auto p-1">
            {farms.length === 0 ? (
              <div className="p-2 text-center text-sm text-muted-foreground">No farms found</div>
            ) : (
              farms.map((farm) => (
                <button
                  key={farm.id}
                  onClick={() => handleSwitch(farm.id)}
                  className={`relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${
                    currentFarmId === farm.id ? "font-bold" : ""
                  }`}
                >
                  {currentFarmId === farm.id && (
                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                  <span className="truncate">{farm.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

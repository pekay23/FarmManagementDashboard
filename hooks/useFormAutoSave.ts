"use client";

import { useEffect } from "react";
import { toast } from "sonner"; // Using your new toaster

export function useFormAutoSave(key: string, values: any, setValues: (val: any) => void) {
  // 1. Load saved data on mount
  useEffect(() => {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setValues(parsed);
        toast.info("Restored your unsaved draft");
      } catch (e) {
        console.error("Failed to parse saved draft");
      }
    }
  }, [key, setValues]);

  // 2. Save data whenever it changes
  useEffect(() => {
    const handler = setTimeout(() => {
      localStorage.setItem(key, JSON.stringify(values));
    }, 1000); // Debounce: Wait 1 sec after typing stops to save

    return () => clearTimeout(handler);
  }, [key, values]);

  // 3. Helper to clear storage after successful submit
  const clearSavedData = () => {
    localStorage.removeItem(key);
  };

  return { clearSavedData };
}

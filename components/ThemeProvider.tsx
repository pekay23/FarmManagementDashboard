"use client";

import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes";

/**
 * Thin wrapper around `next-themes` so the rest of the app
 * only depends on this single component (and so we can swap the
 * underlying lib later without touching consumers).
 *
 * Defaults: `system` follows the OS, persists to `localStorage`
 * under the key `theme`.
 */
export default function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      themes={["light", "dark", "system"]}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}

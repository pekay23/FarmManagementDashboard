import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import Providers from "@/components/Providers";
import AppShell from "@/components/AppShell";
import { SyncProvider } from "@/context/SyncContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "FieldOps Portal",
  description: "Farm operations workspace",
};

export default function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${inter.className} bg-background text-foreground`}>
        <Providers>
          <SyncProvider>
            <AppShell>{children}</AppShell>
          </SyncProvider>
        </Providers>
      </body>
    </html>
  );
}
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import Providers from "@/components/Providers";
import AppShell from "@/components/AppShell";
import { SyncProvider } from "@/context/SyncContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "FieldOps",
  description: "Farm operations workspace",
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // `suppressHydrationWarning` is required by next-themes — the
    // script it injects to set the theme class runs before React
    // hydrates and would otherwise produce a warning.
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${inter.className} bg-background text-foreground`}>
        <Providers>
          <SyncProvider>
            <Toaster position="top-right" richColors />
            <AppShell>{children}</AppShell>
          </SyncProvider>
        </Providers>
      </body>
    </html>
  );
}

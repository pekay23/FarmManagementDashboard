import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import { Toaster } from "sonner";
import { SyncProvider } from "@/context/SyncContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "FarmOps — Farm Management Software",
  description: "Run your farm from one place. Track livestock, crops, sales, expenses, and inventory — online or off.",
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
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${inter.className} bg-background text-foreground`}>
        <Providers>
          <SyncProvider>
            <Toaster position="top-right" richColors />
            {children}
          </SyncProvider>
        </Providers>
      </body>
    </html>
  );
}
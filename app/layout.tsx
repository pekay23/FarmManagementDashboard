import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import OfflineSync from "@/components/OfflineSync";
import Providers from "@/components/Providers"; // <--- 1. Import this

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hughes Farms",
  description: "Farm Management Dashboard",
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
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        {/* 2. Wrap everything inside Providers */}
        <Providers>
            <Toaster position="top-right" richColors />
            <OfflineSync />
            <Sidebar />
            
            <main className="md:ml-64 pt-16 md:pt-0 min-h-screen transition-all duration-300">
              {children}
            </main>
        </Providers>
      </body>
    </html>
  );
}

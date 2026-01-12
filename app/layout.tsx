// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hughes Farms",
  description: "Farm Management Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        {/* Sidebar fixed on the left */}
        <Sidebar />
        
        {/* Main Content Area (pushed right by 16rem/64px to clear sidebar) */}
        <main className="ml-64 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}

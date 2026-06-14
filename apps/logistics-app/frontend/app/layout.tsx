import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Courier Logistics App",
  description: "Logistics Operations Hub — Internal Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-100">
          {/* Top navbar */}
          <nav className="bg-gray-900 text-white px-6 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-8">
                <span className="font-bold text-lg">Logistics Hub</span>
                <div className="flex items-center gap-6 text-sm">
                  <Link
                    href="/"
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/packages"
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    Packages
                  </Link>
                  <Link
                    href="/bags"
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    Bags
                  </Link>
                  <Link
                    href="/trucks"
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    Trucks
                  </Link>
                </div>
              </div>
              <span className="text-xs text-gray-400 bg-gray-800 px-3 py-1 rounded-full">
                Internal — Staff Only
              </span>
            </div>
          </nav>

          {/* Page content */}
          <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}

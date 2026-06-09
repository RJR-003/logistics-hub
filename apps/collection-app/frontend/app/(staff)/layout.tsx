import Link from "next/link";

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Shared staff navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              ← Home
            </Link>
            <Link
              href="/dashboard"
              className="text-gray-800 font-medium text-sm hover:text-blue-600 transition-colors"
            >
              Dashboard
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/track"
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Track a Package
            </Link>
            <Link
              href="/packages/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              + New Package
            </Link>
          </div>
        </div>
      </nav>

      {/* Page content */}
      {children}
    </div>
  );
}

import { getDashboard, Package } from "../../libs/api";
import StatusBadge from "../../components/StatusBadge";

// Package card used in all three sections
function PackageCard({ pkg }: { pkg: Package }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-mono text-gray-500">
          {pkg.trackingId.slice(0, 8)}...
        </span>
        <StatusBadge status={pkg.status} />
      </div>
      <div className="text-sm text-gray-700">
        <span className="font-medium">From:</span> {pkg.fromAddress}
      </div>
      <div className="text-sm text-gray-700">
        <span className="font-medium">To:</span> {pkg.toAddress}
      </div>
      <div className="text-sm text-gray-700">
        <span className="font-medium">Weight:</span> {pkg.weight} kg
      </div>
      {pkg.currentLocation && (
        <div className="text-sm text-gray-700">
          <span className="font-medium">Location:</span> {pkg.currentLocation}
        </div>
      )}
      {pkg.delayReason && (
        <div className="text-sm text-red-600">
          <span className="font-medium">Delay Reason:</span> {pkg.delayReason}
        </div>
      )}
    </div>
  );
}

// Section with a title, count and list of packages
function DashboardSection({
  title,
  count,
  packages,
  emptyMessage,
  headerColor,
}: {
  title: string;
  count: number;
  packages: Package[];
  emptyMessage: string;
  headerColor: string;
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${headerColor}`}
        >
          {count}
        </span>
      </div>
      {packages.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">{emptyMessage}</p>
      ) : (
        <div className="space-y-3">
          {packages.map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} />
          ))}
        </div>
      )}
    </div>
  );
}

// This is a Server Component — fetches data directly, no useEffect needed
export default async function DashboardPage() {
  const dashboard = await getDashboard();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Dashboard sections */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DashboardSection
            title="Pending Pickup"
            count={dashboard.pending.count}
            packages={dashboard.pending.packages}
            emptyMessage="No packages waiting for pickup"
            headerColor="bg-yellow-100 text-yellow-800"
          />
          <DashboardSection
            title="Actively Moving"
            count={dashboard.active.count}
            packages={dashboard.active.packages}
            emptyMessage="No packages in transit"
            headerColor="bg-blue-100 text-blue-800"
          />
          <DashboardSection
            title="Delayed"
            count={dashboard.delayed.count}
            packages={dashboard.delayed.packages}
            emptyMessage="No delayed packages"
            headerColor="bg-red-100 text-red-800"
          />
        </div>
      </div>
    </div>
  );
}

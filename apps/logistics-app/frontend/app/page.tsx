import { getDashboard, Package, Bag } from "./lib/api";
import StatusBadge from "./components/StatusBadge";
import EmptyState from "./components/EmptyState";

function PackageRow({ pkg }: { pkg: Package }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="space-y-1">
        <p title={pkg.trackingId} className="text-sm font-mono text-gray-600">
          {pkg.trackingId.slice(0, 12)}...
        </p>
        <p className="text-xs text-gray-400">
          {pkg.fromAddress} → {pkg.toAddress}
        </p>
        {pkg.region && (
          <p className="text-xs text-blue-500">
            Origin: {pkg.region.name} ({pkg.region.code})
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400">{pkg.weight}kg</span>
        <StatusBadge status={pkg.status} />
      </div>
    </div>
  );
}

function BagRow({ bag }: { bag: Bag }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-700">{bag.code}</p>
        <p className="text-xs text-gray-400">
          Direction: {bag.direction} · {bag.packages?.length || 0} packages ·{" "}
          Truck: {bag.truck?.code || "Not loaded"}
        </p>
      </div>
      <StatusBadge status={bag.status} />
    </div>
  );
}

function Section({
  title,
  count,
  color,
  children,
}: {
  title: string;
  count: number;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800">{title}</h2>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
          {count}
        </span>
      </div>
      <div className="px-5 py-2">{children}</div>
    </div>
  );
}

export default async function DashboardPage() {
  const dashboard = await getDashboard();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hub Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Regional logistics operations overview
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1 — New unbagged */}
        <Section
          title={`New Packages — ${dashboard.newUnbagged.period === "morning" ? "Morning shift" : "Afternoon shift"}`}
          count={dashboard.newUnbagged.count}
          color="bg-yellow-100 text-yellow-800"
        >
          {dashboard.newUnbagged.packages.length === 0 ? (
            <EmptyState message="No new packages this period" />
          ) : (
            dashboard.newUnbagged.packages.map((pkg) => (
              <PackageRow key={pkg.id} pkg={pkg} />
            ))
          )}
        </Section>

        {/* Section 2 — Arrived unbagged */}
        <Section
          title="Arrived — Pending Bagging"
          count={dashboard.arrivedUnbagged.count}
          color="bg-blue-100 text-blue-800"
        >
          {dashboard.arrivedUnbagged.packages.length === 0 ? (
            <EmptyState message="No arrived packages pending bagging" />
          ) : (
            dashboard.arrivedUnbagged.packages.map((pkg) => (
              <PackageRow key={pkg.id} pkg={pkg} />
            ))
          )}
        </Section>

        {/* Section 3 — Bagged and loaded */}
        <Section
          title="Bagged and Loaded"
          count={dashboard.baggedAndLoaded.count}
          color="bg-purple-100 text-purple-800"
        >
          {dashboard.baggedAndLoaded.bags.length === 0 ? (
            <EmptyState message="No bags loaded onto trucks" />
          ) : (
            dashboard.baggedAndLoaded.bags.map((bag) => (
              <BagRow key={bag.id} bag={bag} />
            ))
          )}
        </Section>

        {/* Section 4 — Delayed */}
        <Section
          title="Delayed Packages"
          count={dashboard.delayed.count}
          color="bg-red-100 text-red-800"
        >
          {dashboard.delayed.packages.length === 0 ? (
            <EmptyState message="No delayed packages" />
          ) : (
            dashboard.delayed.packages.map((pkg) => (
              <div key={pkg.id}>
                <PackageRow pkg={pkg} />
                {pkg.bag?.delay && (
                  <p className="text-xs text-red-500 pb-2">
                    Reason: {pkg.bag.delay.reason}
                  </p>
                )}
              </div>
            ))
          )}
        </Section>
      </div>
    </div>
  );
}

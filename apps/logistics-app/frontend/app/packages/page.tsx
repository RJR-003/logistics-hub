"use client";

import { useState, useEffect } from "react";
import {
  getAllPackages,
  getAllBags,
  assignToBag,
  Package,
  Bag,
} from "../lib/api";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [bags, setBags] = useState<Bag[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [selectedBagId, setSelectedBagId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [pkgs, bgs] = await Promise.all([getAllPackages(), getAllBags()]);
      setPackages(pkgs);
      setBags(bgs.filter((b) => b.status === "OPEN"));
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  async function handleAssign() {
    if (!selectedPackage || !selectedBagId) return;
    setAssigning(true);
    setError(null);
    try {
      await assignToBag({
        packageId: selectedPackage.id,
        bagId: selectedBagId,
      });
      setSuccess(`Package assigned to bag successfully`);
      setSelectedPackage(null);
      setSelectedBagId("");
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to assign");
    } finally {
      setAssigning(false);
    }
  }

  if (loading) return <div className="text-gray-400 text-sm">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Packages</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Assign to bag panel */}
      {selectedPackage && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-blue-800">
            Assigning: {selectedPackage.trackingId.slice(0, 12)}...
          </p>
          <div className="flex gap-3">
            <select
              value={selectedBagId}
              onChange={(e) => setSelectedBagId(e.target.value)}
              className="flex-1 border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a bag...</option>
              {bags.map((bag) => (
                <option key={bag.id} value={bag.id}>
                  {bag.code} — {bag.direction}
                </option>
              ))}
            </select>
            <button
              onClick={handleAssign}
              disabled={!selectedBagId || assigning}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {assigning ? "Assigning..." : "Assign"}
            </button>
            <button
              onClick={() => setSelectedPackage(null)}
              className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Packages table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {packages.length === 0 ? (
          <EmptyState message="No packages found" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">
                  Tracking ID
                </th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">
                  Route
                </th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">
                  Weight
                </th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">
                  Bag
                </th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {packages.map((pkg) => (
                <tr key={pkg.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {pkg.trackingId.slice(0, 12)}...
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <div>{pkg.fromAddress}</div>
                    <div className="text-gray-400">→ {pkg.toAddress}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{pkg.weight}kg</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={pkg.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {pkg.bag?.code || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {!pkg.bagId && pkg.status !== "DELAYED" && (
                      <button
                        onClick={() => {
                          setSelectedPackage(pkg);
                          setSuccess(null);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        Assign to bag
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
